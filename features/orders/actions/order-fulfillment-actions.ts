'use server';

import { getCurrentUser } from '@/features/auth/services/current-user';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { isCustomerCancellable, type OrderStatus } from '../domain';
import { cancelOrderService, completeOrderService } from '../services/fulfillment-services';
import { transitionOrderService } from '../services/transition-order-service';

export async function customerCancelOrderAction(orderPublicId: string, reason?: string) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: 'UNAUTHORIZED' };
  }

  const order = await prisma.order.findFirst({
    where: { publicId: orderPublicId, userId: user.id },
  });

  if (!order) {
    return { success: false, error: 'ORDER_NOT_FOUND' };
  }

  if (!isCustomerCancellable(order.status)) {
    return {
      success: false,
      error: 'NOT_CANCELLABLE',
      message: 'Pesanan tidak dapat dibatalkan pada tahap ini.',
    };
  }

  const result = await cancelOrderService(
    order.id,
    reason || 'Dibatalkan oleh pelanggan',
    user.id,
    'CUSTOMER',
    user.id
  );

  revalidatePath('/transactions');
  revalidatePath(`/transactions/${orderPublicId}`);

  return result;
}

export async function customerConfirmDeliveryAction(orderPublicId: string) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: 'UNAUTHORIZED' };
  }

  const result = await completeOrderService(
    orderPublicId,
    user.id,
    'CUSTOMER',
    user.id
  );

  revalidatePath('/transactions');
  revalidatePath(`/transactions/${orderPublicId}`);

  return result;
}

