'use server';

import { getCurrentUser } from '@/features/auth/services/current-user';
import { requireAdmin } from '@/features/auth/services/require-admin';
import { returnService } from '../services/return-service';
import type { RequestReturnItemInput } from '../types';
import { revalidatePath } from 'next/cache';

export async function customerRequestReturnAction(input: {
  orderPublicId: string;
  reason: string;
  customerNote?: string;
  items: RequestReturnItemInput[];
}) {
  const user = await getCurrentUser();

  const result = await returnService.requestReturn({
    orderPublicId: input.orderPublicId,
    userId: user?.id ?? null,
    reason: input.reason,
    customerNote: input.customerNote,
    items: input.items,
  });

  revalidatePath('/transactions');
  revalidatePath('/returns');
  revalidatePath(`/transactions/${input.orderPublicId}`);
  revalidatePath('/admin/orders');
  revalidatePath('/admin/returns');
  revalidatePath(`/admin/orders/${input.orderPublicId}`);

  return result;
}

export async function customerMarkReturnInTransitAction(input: {
  returnId: string;
  orderPublicId: string;
}) {
  const user = await getCurrentUser();

  const result = await returnService.markReturnInTransit({
    returnId: input.returnId,
    actorType: 'CUSTOMER',
    actorId: user?.id ?? null,
  });

  revalidatePath('/transactions');
  revalidatePath('/returns');
  revalidatePath(`/transactions/${input.orderPublicId}`);
  revalidatePath('/admin/orders');
  revalidatePath('/admin/returns');
  revalidatePath(`/admin/orders/${input.orderPublicId}`);

  return result;
}

export async function customerCancelReturnAction(input: {
  returnId: string;
  orderPublicId: string;
}) {
  const user = await getCurrentUser();

  const result = await returnService.cancelReturn({
    returnId: input.returnId,
    actorType: 'CUSTOMER',
    actorId: user?.id ?? null,
  });

  revalidatePath('/transactions');
  revalidatePath('/returns');
  revalidatePath(`/transactions/${input.orderPublicId}`);
  revalidatePath('/admin/orders');
  revalidatePath('/admin/returns');
  revalidatePath(`/admin/orders/${input.orderPublicId}`);

  return result;
}

export async function adminApproveReturnAction(input: {
  returnId: string;
  orderPublicId?: string;
  adminNote?: string;
}) {
  const admin = await requireAdmin();

  const result = await returnService.approveReturn({
    returnId: input.returnId,
    adminUserId: admin.id,
    adminNote: input.adminNote,
  });

  revalidatePath('/admin/orders');
  revalidatePath('/admin/returns');
  if (input.orderPublicId) {
    revalidatePath(`/admin/orders/${input.orderPublicId}`);
    revalidatePath(`/transactions/${input.orderPublicId}`);
  }
  revalidatePath('/transactions');
  revalidatePath('/returns');

  return result;
}

export async function adminReceiveReturnAction(input: {
  returnId: string;
  orderPublicId?: string;
  adminNote?: string;
  autoRefund?: boolean;
  refundAmount?: number;
}) {
  const admin = await requireAdmin();

  const result = await returnService.receiveReturn({
    returnId: input.returnId,
    adminUserId: admin.id,
    adminNote: input.adminNote,
    autoRefund: input.autoRefund,
    refundAmount: input.refundAmount,
  });

  revalidatePath('/admin/orders');
  revalidatePath('/admin/returns');
  if (input.orderPublicId) {
    revalidatePath(`/admin/orders/${input.orderPublicId}`);
    revalidatePath(`/transactions/${input.orderPublicId}`);
  }
  revalidatePath('/transactions');
  revalidatePath('/returns');

  return result;
}

export async function adminRejectReturnAction(input: {
  returnId: string;
  orderPublicId?: string;
  adminNote?: string;
}) {
  const admin = await requireAdmin();

  const result = await returnService.rejectReturn({
    returnId: input.returnId,
    adminUserId: admin.id,
    adminNote: input.adminNote,
  });

  revalidatePath('/admin/orders');
  revalidatePath('/admin/returns');
  if (input.orderPublicId) {
    revalidatePath(`/admin/orders/${input.orderPublicId}`);
    revalidatePath(`/transactions/${input.orderPublicId}`);
  }
  revalidatePath('/transactions');
  revalidatePath('/returns');

  return result;
}
