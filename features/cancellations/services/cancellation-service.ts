import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { releaseInventoryService } from '@/features/inventory/services/release-inventory-service';
import { restoreConsumedOrderInventoryService } from '@/features/inventory/services/restore-inventory-service';
import { refundService } from '@/features/refunds/services/refund-service';
import {
  canDirectlyCancel,
  canRequestCancellation,
  isCancellationProhibited,
} from '../domain/cancellation-policy';
import type {
  CancellationRecord,
  RequestCancellationInput,
} from '../types';

export class CancellationService {
  /**
   * Directly cancels an unpaid order (PENDING_PAYMENT).
   * Releases active inventory reservations and sets Order status to CANCELLED.
   */
  async cancelUnpaidOrder(options: {
    orderId: string;
    userId?: string | null;
    reason?: string;
    actorType?: 'CUSTOMER' | 'ADMIN' | 'SYSTEM' | 'GUEST';
    actorId?: string | null;
    tx?: Prisma.TransactionClient;
  }) {
    const {
      orderId,
      userId,
      reason = 'Order cancelled by customer before payment',
      actorType = 'CUSTOMER',
      actorId = null,
      tx,
    } = options;

    const runner = async (client: Prisma.TransactionClient) => {
      const order = await client.order.findFirst({
        where: {
          OR: [{ id: orderId }, { publicId: orderId }],
        },
      });

      if (!order) {
        return { success: false, error: 'Order not found' };
      }

      if (userId && order.userId && order.userId !== userId) {
        return { success: false, error: 'UNAUTHORIZED' };
      }

      // Idempotency: if already cancelled, return success
      if (order.status === 'CANCELLED') {
        const existingCancellation = await client.cancellation.findUnique({
          where: { orderId: order.id },
        });
        return {
          success: true,
          orderStatus: 'CANCELLED',
          cancellation: existingCancellation as CancellationRecord | null,
          message: 'Order was already cancelled',
        };
      }

      if (!canDirectlyCancel(order.status)) {
        return {
          success: false,
          error: `Order with status ${order.status} cannot be directly cancelled. Please request cancellation for review.`,
        };
      }

      // 1. Release active inventory reservations
      await releaseInventoryService({ orderId: order.id, tx: client });

      // 1b. Release promotion usage if order had a promotion
      const { promotionEngine } = await import('@/features/promotions');
      await promotionEngine.releasePromotionUsage(client, order.id);

      const now = new Date();

      // 2. Update Order status to CANCELLED
      const updatedOrder = await client.order.update({
        where: { id: order.id },
        data: {
          status: 'CANCELLED',
          cancelledAt: now,
        },
      });

      // 3. Upsert Cancellation record
      const cancellation = await client.cancellation.upsert({
        where: { orderId: order.id },
        create: {
          orderId: order.id,
          status: 'CANCELLED',
          reason,
          actorType,
          actorId: actorId || userId || null,
          cancelledAt: now,
        },
        update: {
          status: 'CANCELLED',
          reason,
          cancelledAt: now,
        },
      });

      // 4. Log in OrderStatusHistory
      await client.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: order.status,
          toStatus: 'CANCELLED',
          actorType,
          actorId: actorId || userId || null,
          note: reason,
        },
      });

      return {
        success: true,
        orderStatus: updatedOrder.status,
        cancellation: cancellation as CancellationRecord,
      };
    };

    return tx
      ? runner(tx)
      : prisma.$transaction(runner, { maxWait: 10_000, timeout: 60_000 });
  }

  /**
   * Submits a customer cancellation request for a paid pre-shipment order.
   */
  async requestCancellation(input: RequestCancellationInput) {
    const { orderPublicId, userId, reason, customerNote } = input;

    const order = await prisma.order.findFirst({
      where: {
        OR: [{ id: orderPublicId }, { publicId: orderPublicId }],
      },
      include: {
        cancellation: true,
      },
    });

    if (!order) {
      return { success: false, error: 'Order not found' };
    }

    if (userId && order.userId && order.userId !== userId) {
      return { success: false, error: 'UNAUTHORIZED' };
    }

    // Idempotency: if request already exists
    if (order.cancellation && order.cancellation.status === 'REQUESTED') {
      return {
        success: true,
        cancellation: order.cancellation as CancellationRecord,
        message: 'Cancellation request already submitted and pending review',
      };
    }

    if (isCancellationProhibited(order.status)) {
      return {
        success: false,
        error: `Order in status ${order.status} cannot be cancelled. If delivered, please initiate a Return.`,
      };
    }

    if (!canRequestCancellation(order.status)) {
      return {
        success: false,
        error: `Cancellation request is not supported for order status ${order.status}`,
      };
    }

    // Create Cancellation record
    const cancellation = await prisma.cancellation.create({
      data: {
        orderId: order.id,
        status: 'REQUESTED',
        reason,
        customerNote: customerNote || null,
        actorType: 'CUSTOMER',
        actorId: userId || null,
        requestedAt: new Date(),
      },
    });

    // Log in OrderStatusHistory
    await prisma.orderStatusHistory.create({
      data: {
        orderId: order.id,
        fromStatus: order.status,
        toStatus: order.status,
        actorType: 'CUSTOMER',
        actorId: userId || null,
        note: `Customer requested cancellation: ${reason}`,
      },
    });

    return {
      success: true,
      cancellation: cancellation as CancellationRecord,
    };
  }

  /**
   * Admin approves a cancellation request or directly cancels a paid order.
   * Processes full refund, restores consumed inventory, and sets order status to CANCELLED.
   */
  async approveCancellation(input: {
    cancellationId?: string;
    orderId?: string;
    adminUserId: string;
    adminNote?: string;
  }) {
    const { cancellationId, orderId, adminUserId, adminNote } = input;

    return prisma.$transaction(async (tx) => {
      // 1. Locate order & cancellation
      const cancellation = await tx.cancellation.findFirst({
        where: {
          OR: [
            ...(cancellationId ? [{ id: cancellationId }] : []),
            ...(orderId ? [{ orderId }] : []),
          ],
        },
        include: {
          order: {
            include: {
              payments: { where: { status: 'PAID' } },
            },
          },
        },
      });

      if (!cancellation) {
        return { success: false, error: 'Cancellation record not found' };
      }

      const order = cancellation.order;

      // Idempotency: if already approved/cancelled
      if (cancellation.status === 'APPROVED' && order.status === 'CANCELLED') {
        return {
          success: true,
          cancellation: cancellation as CancellationRecord,
          orderStatus: 'CANCELLED',
          message: 'Cancellation already approved and finalized',
        };
      }

      if (isCancellationProhibited(order.status)) {
        return {
          success: false,
          error: `Order in status ${order.status} cannot be cancelled.`,
        };
      }

      // 2. Compute refundable amount and execute refund
      const refundableInfo = await refundService.calculateRefundableAmount(order.id, tx);

      if (refundableInfo.refundableAmount > 0) {
        const refundResult = await refundService.processRefund({
          orderId: order.id,
          amount: refundableInfo.refundableAmount,
          reason: `Cancellation approved: ${cancellation.reason}`,
          actorType: 'ADMIN',
          actorId: adminUserId,
          tx,
        });

        if (!refundResult.success) {
          return {
            success: false,
            error: `Failed to process refund: ${refundResult.error}`,
          };
        }
      }

      // 3. Restore consumed inventory back to availableQty and Product.stock
      await restoreConsumedOrderInventoryService({ orderId: order.id, tx });

      const now = new Date();

      // 4. Update order to CANCELLED
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'CANCELLED',
          cancelledAt: now,
        },
      });

      // 5. Update cancellation to APPROVED
      const updatedCancellation = await tx.cancellation.update({
        where: { id: cancellation.id },
        data: {
          status: 'APPROVED',
          adminNote: adminNote || cancellation.adminNote,
          approvedAt: now,
          cancelledAt: now,
        },
      });

      // 6. Log in OrderStatusHistory
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: order.status,
          toStatus: 'CANCELLED',
          actorType: 'ADMIN',
          actorId: adminUserId,
          note: adminNote ? `Cancellation approved: ${adminNote}` : 'Cancellation approved by admin',
        },
      });

      return {
        success: true,
        cancellation: updatedCancellation as CancellationRecord,
        orderStatus: 'CANCELLED',
      };
    }, { maxWait: 10_000, timeout: 60_000 });
  }

  /**
   * Admin rejects a cancellation request.
   */
  async rejectCancellation(input: {
    cancellationId: string;
    adminUserId: string;
    adminNote?: string;
  }) {
    const { cancellationId, adminUserId, adminNote } = input;

    const cancellation = await prisma.cancellation.findUnique({
      where: { id: cancellationId },
      include: { order: true },
    });

    if (!cancellation) {
      return { success: false, error: 'Cancellation record not found' };
    }

    if (cancellation.status === 'REJECTED') {
      return {
        success: true,
        cancellation: cancellation as CancellationRecord,
        message: 'Cancellation was already rejected',
      };
    }

    const now = new Date();

    const updated = await prisma.cancellation.update({
      where: { id: cancellationId },
      data: {
        status: 'REJECTED',
        adminNote: adminNote || null,
        rejectedAt: now,
      },
    });

    await prisma.orderStatusHistory.create({
      data: {
        orderId: cancellation.orderId,
        fromStatus: cancellation.order.status,
        toStatus: cancellation.order.status,
        actorType: 'ADMIN',
        actorId: adminUserId,
        note: adminNote ? `Cancellation rejected: ${adminNote}` : 'Cancellation rejected by admin',
      },
    });

    return {
      success: true,
      cancellation: updated as CancellationRecord,
    };
  }
}

export const cancellationService = new CancellationService();
