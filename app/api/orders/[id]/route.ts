import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api/response';
import { prismaOrderRepository } from '@/features/orders/repositories/prisma-order-repository';
import { getCurrentUser } from '@/features/auth/services/current-user';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id || !id.trim()) {
      return apiError('VALIDATION_ERROR', 'Order ID is required', 400);
    }

    const user = await getCurrentUser();
    if (!user) {
      return apiError('UNAUTHORIZED', 'Authentication required to inspect order details', 401);
    }

    const order = await prismaOrderRepository.getOrderByPublicId(id.trim());
    if (!order) {
      return apiError('NOT_FOUND', `Order "${id}" not found`, 404);
    }

    // Strict ownership verification: Customers can only inspect their own orders
    if (order.userId !== user.id && user.role !== 'ADMIN') {
      // 404 response used to prevent leaking order existence to unauthorized users
      return apiError('NOT_FOUND', `Order "${id}" not found`, 404);
    }

    return apiSuccess(order, 200);
  } catch (error: any) {
    console.error('[API Order Detail Error]:', error);
    return apiError('INTERNAL_SERVER_ERROR', 'Failed to retrieve order detail', 500);
  }
}
