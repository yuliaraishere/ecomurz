'use server';

import { getCurrentUser } from '@/features/auth/services/current-user';
import { prismaOrderRepository } from '../repositories/prisma-order-repository';
import type { Transaction } from '../types';

export async function getOrderAction(
  publicId: string
): Promise<Transaction | undefined> {
  if (!publicId) return undefined;

  const user = await getCurrentUser();
  if (!user) {
    return undefined;
  }

  const order = await prismaOrderRepository.getOrderByPublicId(publicId);
  if (!order) return undefined;

  // Strict ownership check: User A cannot see User B's order.
  // Behave as if it does not exist (404 behavior) to prevent existence leakage.
  if (order.userId !== user.id) {
    return undefined;
  }

  return order;
}
