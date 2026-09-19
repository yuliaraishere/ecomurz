import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api/response';
import { serverCartService } from '@/features/cart/services/server-cart-service';
import { DEFAULT_LOCALE, normalizeLocale } from '@/features/catalog/domain/locale';
import { ApiError } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const locale = normalizeLocale(searchParams.get('locale') ?? DEFAULT_LOCALE);

    const cart = await serverCartService.getCart(locale);
    return apiSuccess(cart, 200, { locale });
  } catch (error: any) {
    console.error('[API Cart GET Error]:', error);
    return apiError('INTERNAL_SERVER_ERROR', 'Failed to retrieve cart', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return apiError('VALIDATION_ERROR', 'Malformed JSON payload in request body', 400);
    }

    const { productId, quantity = 1 } = body ?? {};

    if (!productId || typeof productId !== 'string' || !productId.trim()) {
      return apiError('VALIDATION_ERROR', 'Missing or invalid "productId"', 400, [
        { field: 'productId', issue: 'Must be a non-empty string' },
      ]);
    }

    if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity <= 0) {
      return apiError('VALIDATION_ERROR', 'Invalid "quantity"', 400, [
        { field: 'quantity', issue: 'Must be a positive integer greater than 0' },
      ]);
    }

    const { searchParams } = new URL(request.url);
    const locale = normalizeLocale(searchParams.get('locale') ?? DEFAULT_LOCALE);

    const updatedCart = await serverCartService.addItem(productId.trim(), quantity, locale);
    return apiSuccess(updatedCart, 201, { locale });
  } catch (error: any) {
    if (error instanceof ApiError) {
      return apiError(error.code, error.message, error.status, error.details);
    }
    console.error('[API Cart POST Error]:', error);
    return apiError('INTERNAL_SERVER_ERROR', 'Failed to add item to cart', 500);
  }
}
