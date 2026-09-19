import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api/response';
import { serverCartService } from '@/features/cart/services/server-cart-service';
import { DEFAULT_LOCALE, normalizeLocale } from '@/features/catalog/domain/locale';
import { ApiError } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const { itemId } = await params;
    if (!itemId || !itemId.trim()) {
      return apiError('VALIDATION_ERROR', 'Item ID parameter is required', 400);
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return apiError('VALIDATION_ERROR', 'Malformed JSON payload in request body', 400);
    }

    const { quantity } = body ?? {};
    if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 0) {
      return apiError('VALIDATION_ERROR', 'Invalid "quantity"', 400, [
        { field: 'quantity', issue: 'Must be an integer greater than or equal to 0' },
      ]);
    }

    const { searchParams } = new URL(request.url);
    const locale = normalizeLocale(searchParams.get('locale') ?? DEFAULT_LOCALE);

    const updatedCart = await serverCartService.updateItem(itemId.trim(), quantity, locale);
    return apiSuccess(updatedCart, 200, { locale });
  } catch (error: any) {
    if (error instanceof ApiError) {
      return apiError(error.code, error.message, error.status, error.details);
    }
    console.error('[API Cart PATCH Error]:', error);
    return apiError('INTERNAL_SERVER_ERROR', 'Failed to update cart item', 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const { itemId } = await params;
    if (!itemId || !itemId.trim()) {
      return apiError('VALIDATION_ERROR', 'Item ID parameter is required', 400);
    }

    const { searchParams } = new URL(request.url);
    const locale = normalizeLocale(searchParams.get('locale') ?? DEFAULT_LOCALE);

    const updatedCart = await serverCartService.removeItem(itemId.trim(), locale);
    return apiSuccess(updatedCart, 200, { locale });
  } catch (error: any) {
    if (error instanceof ApiError) {
      return apiError(error.code, error.message, error.status, error.details);
    }
    console.error('[API Cart DELETE Error]:', error);
    return apiError('INTERNAL_SERVER_ERROR', 'Failed to remove cart item', 500);
  }
}
