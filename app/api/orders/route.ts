import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api/response';
import { createOrderService } from '@/features/orders/services/create-order-service';
import { prismaOrderRepository } from '@/features/orders/repositories/prisma-order-repository';
import { getCurrentUser } from '@/features/auth/services/current-user';
import { serverCartService } from '@/features/cart/services/server-cart-service';
import type { CreateOrderServerInput } from '@/features/orders/types';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return apiError('VALIDATION_ERROR', 'Malformed JSON payload in request body', 400);
    }

    const { items, address, shippingId, payment, couponCode, locale } = body ?? {};

    // 1. Validate items array
    if (!Array.isArray(items) || items.length === 0) {
      return apiError('VALIDATION_ERROR', 'Order items array cannot be empty', 400, [
        { field: 'items', issue: 'Must provide at least one item' },
      ]);
    }

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it || typeof it.productId !== 'string' || !it.productId.trim()) {
        return apiError('VALIDATION_ERROR', `Item at index ${i} has invalid productId`, 400, [
          { field: `items[${i}].productId`, issue: 'Must be a non-empty string' },
        ]);
      }
      if (typeof it.quantity !== 'number' || !Number.isInteger(it.quantity) || it.quantity <= 0) {
        return apiError('VALIDATION_ERROR', `Item at index ${i} has invalid quantity`, 400, [
          { field: `items[${i}].quantity`, issue: 'Must be a positive integer > 0' },
        ]);
      }
    }

    // 2. Validate address object
    if (!address || typeof address !== 'object') {
      return apiError('VALIDATION_ERROR', 'Missing address object', 400);
    }

    const requiredAddressFields = ['name', 'phone', 'address', 'city', 'postalCode'];
    for (const field of requiredAddressFields) {
      if (!address[field] || typeof address[field] !== 'string' || !address[field].trim()) {
        return apiError('VALIDATION_ERROR', `Shipping address field "${field}" is required`, 400, [
          { field: `address.${field}`, issue: 'Field cannot be empty' },
        ]);
      }
    }

    // 3. Validate shipping method & payment method
    if (!shippingId || typeof shippingId !== 'string' || !shippingId.trim()) {
      return apiError('VALIDATION_ERROR', 'Shipping method "shippingId" is required', 400);
    }

    if (!payment || typeof payment !== 'string' || !payment.trim()) {
      return apiError('VALIDATION_ERROR', 'Payment method "payment" is required', 400);
    }

    // 4. Resolve authenticated user if session exists
    let user: any = null;
    try {
      user = await getCurrentUser();
    } catch {
      // Guest or unauthenticated checkout allowed if enabled by service
    }

    const orderInput: CreateOrderServerInput = {
      items: items.map((i) => ({ productId: i.productId.trim(), quantity: i.quantity })),
      address: {
        name: address.name.trim(),
        phone: address.phone.trim(),
        address: address.address.trim(),
        city: address.city.trim(),
        postalCode: address.postalCode.trim(),
      },
      shippingId: shippingId.trim(),
      payment: payment.trim(),
      couponCode: couponCode ? String(couponCode).trim() : undefined,
      locale: locale ? String(locale).trim() : 'id',
    };

    // 5. Execute authoritative order creation service
    const result = await createOrderService(orderInput, user?.id ?? null);

    if (!result.success) {
      return apiError('BAD_REQUEST', result.error || 'Failed to create order', 400);
    }

    // 6. Clear session cart upon successful checkout
    try {
      await serverCartService.clearCart();
    } catch {
      // Non-blocking cookie clear error
    }

    return apiSuccess(result.order, 201);
  } catch (error: any) {
    console.error('[API Order POST Error]:', error);
    return apiError('INTERNAL_SERVER_ERROR', 'Failed to process order creation', 500);
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiError('UNAUTHORIZED', 'Authentication required to access order history', 401);
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '10', 10) || 10));

    const allOrders = await prismaOrderRepository.getOrdersByUserId(user.id);
    const total = allOrders.length;
    const offset = (page - 1) * limit;
    const paginated = allOrders.slice(offset, offset + limit);

    return apiSuccess(paginated, 200, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (error: any) {
    console.error('[API Orders GET Error]:', error);
    return apiError('INTERNAL_SERVER_ERROR', 'Failed to retrieve orders', 500);
  }
}
