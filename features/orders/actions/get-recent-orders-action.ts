'use server';

import { getCurrentUser } from '@/features/auth/services/current-user';
import { prismaOrderRepository } from '../repositories/prisma-order-repository';
import type { Transaction } from '../types';

export async function getRecentOrdersAction(
  _limit: number = 20
): Promise<Transaction[]> {
  try {
    const user = await getCurrentUser();
    if (user) {
      // Authenticated users retrieve only their own orders
      const orders = await prismaOrderRepository.getOrdersByUserId(user.id);
      return orders.map((order) => ({
        ...order,
        source: 'database' as const,
      }));
    }

    // Guests only see their local session transactions
    return [];
  } catch (error) {
    console.error('Failed to fetch user orders from database:', error);
    return [];
  }
}
