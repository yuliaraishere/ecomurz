'use server';

import { getCurrentUser } from '@/features/auth/services/current-user';
import { createOrderService } from '../services/create-order-service';
import type { CreateOrderServerInput, CreateOrderResult } from '../types';

export async function createOrderAction(
  input: CreateOrderServerInput
): Promise<CreateOrderResult> {
  // Authoritative server-side resolution of user identity
  const user = await getCurrentUser();
  if (!user) {
    return {
      success: false,
      error: 'AUTH_REQUIRED',
    };
  }

  return createOrderService(input, user.id);
}
