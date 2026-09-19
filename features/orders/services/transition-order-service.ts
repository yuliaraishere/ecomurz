import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import {
  type OrderStatus,
  type OrderActorType,
  assertValidOrderTransition,
  getTimestampFieldForTransition,
  normalizeLegacyOrderStatus,
  InvalidOrderTransitionError,
} from '../domain';
import { mapPrismaOrderToTransaction } from '../repositories/prisma-order-repository';
import type { Transaction } from '../types';

export interface TransitionOrderInput {
  orderId: string; // can be internal CUID or publicId (RUPA-...)
  toStatus: OrderStatus;
  actorType: OrderActorType;
  actorId?: string | null;
  note?: string | null;
  trackingNumber?: string | null;
  tx?: Prisma.TransactionClient;
  requireUserId?: string | null;
}

export interface TransitionOrderResult {
  success: boolean;
  order?: Transaction;
  error?: string;
}

export async function transitionOrderService(
  input: TransitionOrderInput
): Promise<TransitionOrderResult> {
  const {
    orderId,
    toStatus,
    actorType,
    actorId = null,
    note = null,
    trackingNumber,
    tx,
    requireUserId,
  } = input;

  const runner = async (client: Prisma.TransactionClient): Promise<TransitionOrderResult> => {
    // 1. Resolve order by internal CUID or publicId
    const order = await client.order.findFirst({
      where: {
        OR: [{ id: orderId }, { publicId: orderId }],
      },
      include: {
        items: true,
        payments: { orderBy: { createdAt: 'desc' }, take: 1 },
        statusHistory: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!order) {
      return { success: false, error: 'ORDER_NOT_FOUND' };
    }

    // 2. Authorization check
    if (requireUserId && order.userId !== requireUserId) {
      return { success: false, error: 'UNAUTHORIZED' };
    }

    const currentStatus = normalizeLegacyOrderStatus(order.status);

    // 3. Idempotency check: if already in the target status, return current state without re-mutating
    if (currentStatus === toStatus) {
      return {
        success: true,
        order: mapPrismaOrderToTransaction(order),
      };
    }

    // 4. Validate transition through state machine
    try {
      assertValidOrderTransition(currentStatus, toStatus);
    } catch (err) {
      if (err instanceof InvalidOrderTransitionError) {
        return {
          success: false,
          error: `INVALID_TRANSITION: Cannot transition order from ${err.fromStatus} to ${err.toStatus}`,
        };
      }
      throw err;
    }

    // 5. Inventory integration: if cancelling from PENDING_PAYMENT, release active reservations
    if (toStatus === 'CANCELLED' && currentStatus === 'PENDING_PAYMENT') {
      const { releaseInventoryService } = await import('@/features/inventory');
      await releaseInventoryService({ orderId: order.id, tx: client });
    }

    // 6. Build timestamp and fulfillment fields
    const now = new Date();
    const updateData: Prisma.OrderUpdateInput = {
      status: toStatus,
    };

    const timestampField = getTimestampFieldForTransition(toStatus);
    if (timestampField) {
      updateData[timestampField] = now;
    }

    if (trackingNumber !== undefined) {
      updateData.trackingNumber = trackingNumber;
    }

    // 7. Atomic transaction: update order and append immutable history entry
    await client.order.update({
      where: { id: order.id },
      data: updateData,
    });

    await client.orderStatusHistory.create({
      data: {
        orderId: order.id,
        fromStatus: currentStatus,
        toStatus,
        actorType,
        actorId,
        note: note || `Transitioned from ${currentStatus} to ${toStatus}`,
        createdAt: now,
      },
    });

    const refreshed = await client.order.findUnique({
      where: { id: order.id },
      include: {
        items: true,
        payments: { orderBy: { createdAt: 'desc' }, take: 1 },
        statusHistory: { orderBy: { createdAt: 'asc' } },
      },
    });

    return {
      success: true,
      order: refreshed ? mapPrismaOrderToTransaction(refreshed) : undefined,
    };
  };

  if (tx) {
    return runner(tx);
  }

  return prisma.$transaction(async (internalTx) => {
    return runner(internalTx);
  });
}
