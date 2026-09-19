'use server';

import { getCurrentUser } from '@/features/auth/services/current-user';
import { prismaOrderRepository } from '../repositories/prisma-order-repository';
import type { Transaction } from '../types';

export async function getMyOrdersAction(): Promise<Transaction[]> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return [];
    }

    // Authoritative scoped retrieval: query exclusively by authenticated user ID
    const orders = await prismaOrderRepository.getOrdersByUserId(user.id);
    return orders.map((order) => ({
      ...order,
      source: 'database' as const,
    }));
  } catch (error) {
    console.error('Failed to fetch user orders:', error);
    return [];
  }
}
