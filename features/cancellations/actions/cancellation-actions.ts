'use server';

import { getCurrentUser } from '@/features/auth/services/current-user';
import { requireAdmin } from '@/features/auth/services/require-admin';
import { cancellationService } from '../services/cancellation-service';
import { revalidatePath } from 'next/cache';

export async function customerCancelUnpaidOrderAction(input: {
  orderPublicId: string;
  reason?: string;
}) {
  const user = await getCurrentUser();

  const result = await cancellationService.cancelUnpaidOrder({
    orderId: input.orderPublicId,
    userId: user?.id ?? null,
    reason: input.reason || 'Cancelled by customer before payment',
    actorType: user ? 'CUSTOMER' : 'GUEST',
    actorId: user?.id ?? null,
  });

  revalidatePath('/transactions');
  revalidatePath(`/transactions/${input.orderPublicId}`);
  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${input.orderPublicId}`);

  return result;
}

export async function customerRequestCancellationAction(input: {
  orderPublicId: string;
  reason: string;
  customerNote?: string;
}) {
  const user = await getCurrentUser();

  const result = await cancellationService.requestCancellation({
    orderPublicId: input.orderPublicId,
    userId: user?.id ?? null,
    reason: input.reason,
    customerNote: input.customerNote,
  });

  revalidatePath('/transactions');
  revalidatePath(`/transactions/${input.orderPublicId}`);
  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${input.orderPublicId}`);

  return result;
}

export async function adminApproveCancellationAction(input: {
  cancellationId?: string;
  orderId?: string;
  adminNote?: string;
}) {
  const admin = await requireAdmin();

  const result = await cancellationService.approveCancellation({
    cancellationId: input.cancellationId,
    orderId: input.orderId,
    adminUserId: admin.id,
    adminNote: input.adminNote,
  });

  revalidatePath('/admin/orders');
  if (input.orderId) {
    revalidatePath(`/admin/orders/${input.orderId}`);
    revalidatePath(`/transactions/${input.orderId}`);
  }
  revalidatePath('/transactions');

  return result;
}

export async function adminRejectCancellationAction(input: {
  cancellationId: string;
  orderId?: string;
  adminNote?: string;
}) {
  const admin = await requireAdmin();

  const result = await cancellationService.rejectCancellation({
    cancellationId: input.cancellationId,
    adminUserId: admin.id,
    adminNote: input.adminNote,
  });

  revalidatePath('/admin/orders');
  if (input.orderId) {
    revalidatePath(`/admin/orders/${input.orderId}`);
    revalidatePath(`/transactions/${input.orderId}`);
  }
  revalidatePath('/transactions');

  return result;
}
