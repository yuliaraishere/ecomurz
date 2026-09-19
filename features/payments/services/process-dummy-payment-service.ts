import { prisma } from '@/lib/prisma';
import type { PaymentStatus } from '../types';

export interface ProcessDummyPaymentInput {
  orderPublicId: string;
  outcome: 'SUCCESS' | 'FAILURE';
  userId: string;
}

export interface ProcessDummyPaymentResult {
  success: boolean;
  orderPublicId: string;
  orderStatus: string;
  paymentStatus: PaymentStatus;
  error?: string;
}

export async function processDummyPaymentService(
  input: ProcessDummyPaymentInput
): Promise<ProcessDummyPaymentResult> {
  const { orderPublicId, outcome, userId } = input;

  // 1. Authoritative lookup of Order ensuring user ownership
  const order = await prisma.order.findFirst({
    where: {
      publicId: orderPublicId,
      userId: userId,
    },
    include: {
      items: true,
      payments: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
      reservations: true,
    },
  });

  if (!order) {
    return {
      success: false,
      orderPublicId,
      orderStatus: 'NOT_FOUND',
      paymentStatus: 'FAILED',
      error: 'Order not found or unauthorized',
    };
  }

  // 2. Resolve active payment
  let payment = order.payments[0];

  // If no payment exists yet, or previous was FAILED and user retries, create a new Payment attempt
  if (!payment || payment.status === 'FAILED') {
    const timestamp = Date.now().toString(36).toUpperCase();
    const providerPaymentId = `DUMMY-${timestamp}-${Math.floor(1000 + Math.random() * 9000)}`;
    payment = await prisma.payment.create({
      data: {
        orderId: order.id,
        provider: 'dummy',
        providerPaymentId,
        status: 'PENDING',
        amount: order.total,
        currency: 'JPY',
      },
    });
  }

  // 3. Idempotency check: if already PAID, return current state without re-mutating
  if (payment.status === 'PAID' && order.status === 'PAID') {
    return {
      success: true,
      orderPublicId,
      orderStatus: order.status,
      paymentStatus: 'PAID',
    };
  }

  // 4. Authoritative server state transition & Inventory integration
  const {
    reserveInventoryService,
    consumeInventoryService,
    releaseInventoryService,
    InsufficientStockError,
  } = await import('@/features/inventory');

  const hasActiveReservations = order.reservations.some((r) => r.status === 'ACTIVE');
  const newPaymentStatus: PaymentStatus = outcome === 'SUCCESS' ? 'PAID' : 'FAILED';
  const newOrderStatus = outcome === 'SUCCESS' ? 'PAID' : 'PENDING_PAYMENT';

  try {
    await prisma.$transaction(async (tx) => {
      if (outcome === 'SUCCESS') {
        if (!hasActiveReservations) {
          // Re-reserve inventory if previously released or expired before consuming
          await reserveInventoryService({
            orderId: order.id,
            items: order.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
            tx,
          });
        }
        await consumeInventoryService({ orderId: order.id, tx });
      } else {
        // outcome === 'FAILURE'
        if (hasActiveReservations) {
          await releaseInventoryService({ orderId: order.id, tx });
        }
      }

      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: newPaymentStatus,
          paidAt: outcome === 'SUCCESS' ? new Date() : undefined,
          failedAt: outcome === 'FAILURE' ? new Date() : undefined,
        },
      });

      await tx.order.update({
        where: { id: order.id },
        data: { status: newOrderStatus },
      });

      if (outcome === 'SUCCESS' && order.status !== 'PAID') {
        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            fromStatus: order.status,
            toStatus: 'PAID',
            actorType: 'PAYMENT',
            actorId: payment.providerPaymentId || null,
            note: 'Payment verified successfully via dummy payment gateway',
          },
        });
      }
    });

    return {
      success: outcome === 'SUCCESS',
      orderPublicId,
      orderStatus: newOrderStatus,
      paymentStatus: newPaymentStatus,
    };
  } catch (err) {
    if (err instanceof InsufficientStockError) {
      return {
        success: false,
        orderPublicId,
        orderStatus: order.status,
        paymentStatus: 'FAILED',
        error: `Stok produk tidak mencukupi untuk ${err.productId}. Tersedia: ${err.available}, diminta: ${err.requested}.`,
      };
    }
    throw err;
  }
}
