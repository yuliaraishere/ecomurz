'use server';

import { getCurrentUser } from '@/features/auth/services/current-user';
import { processDummyPaymentService } from '../services/process-dummy-payment-service';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function simulateDummyPaymentAction(
  orderPublicId: string,
  outcome: 'SUCCESS' | 'FAILURE'
) {
  const user = await getCurrentUser();
  if (!user) {
    return {
      success: false,
      error: 'UNAUTHORIZED',
    };
  }

  const result = await processDummyPaymentService({
    orderPublicId,
    outcome,
    userId: user.id,
  });

  revalidatePath('/transactions');
  revalidatePath(`/transactions/${orderPublicId}`);

  return result;
}

export async function getPaymentOrderDetailsAction(orderPublicId: string) {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  // Opportunistically clean up expired reservations
  const { expireInventoryReservationsService } = await import('@/features/inventory');
  await expireInventoryReservationsService().catch((err) =>
    console.error('Opportunistic expiration in getPaymentOrderDetailsAction error:', err)
  );

  const order = await prisma.order.findFirst({
    where: {
      publicId: orderPublicId,
      userId: user.id,
    },
    include: {
      payments: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
      items: true,
    },
  });

  if (!order) {
    return null;
  }

  const payment = order.payments[0] || null;

  return {
    order: {
      id: order.publicId,
      status: order.status,
      total: order.total,
      subtotal: order.subtotal,
      shippingPrice: order.shippingPrice,
      recipientName: order.recipientName,
      recipientCity: order.recipientCity,
      createdAt: order.createdAt.toISOString(),
      itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
    },
    payment: payment
      ? {
          id: payment.id,
          provider: payment.provider,
          providerPaymentId: payment.providerPaymentId,
          status: payment.status,
          amount: payment.amount,
          currency: payment.currency,
          paidAt: payment.paidAt?.toISOString() || null,
          failedAt: payment.failedAt?.toISOString() || null,
          expiredAt: payment.expiredAt?.toISOString() || null,
        }
      : null,
  };
}

export async function retryOrderPaymentAction(orderPublicId: string, locale: string = 'id') {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: 'UNAUTHORIZED' };
  }

  const { paymentService } = await import('../services/payment-service');
  const result = await paymentService.createOrRetryPayment({
    orderPublicId,
    userId: user.id,
    locale,
  });

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      message: (result as any).message,
    };
  }

  revalidatePath('/transactions');
  revalidatePath(`/transactions/${orderPublicId}`);

  return {
    success: true,
    paymentUrl: result.redirectUrl,
  };
}

export async function reconcilePaymentAction(orderPublicId: string, providerPaymentId?: string) {
  const { paymentService } = await import('../services/payment-service');
  const result = await paymentService.reconcilePayment({
    orderPublicId,
    providerPaymentId,
  });

  revalidatePath('/transactions');
  revalidatePath(`/transactions/${orderPublicId}`);
  return result;
}

export async function refundOrderAction(input: {
  orderId: string;
  amount: number;
  reason: string;
  returnId?: string;
}) {
  const { requireAdmin } = await import('@/features/auth/services/require-admin');
  const admin = await requireAdmin();

  const { refundService } = await import('@/features/refunds/services/refund-service');
  const result = await refundService.processRefund({
    orderId: input.orderId,
    returnId: input.returnId,
    amount: input.amount,
    reason: input.reason,
    actorType: 'ADMIN',
    actorId: admin.id,
  });

  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${input.orderId}`);
  revalidatePath('/transactions');
  revalidatePath(`/transactions/${input.orderId}`);

  return result;
}


