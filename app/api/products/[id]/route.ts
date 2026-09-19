import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api/response';
import { getProductById } from '@/features/catalog';
import { DEFAULT_LOCALE, normalizeLocale } from '@/features/catalog/domain/locale';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id || !id.trim()) {
      return apiError('VALIDATION_ERROR', 'Product ID is required', 400);
    }

    const { searchParams } = new URL(request.url);
    const locale = normalizeLocale(searchParams.get('locale') ?? DEFAULT_LOCALE);

    const product = await getProductById(id.trim(), locale);

    if (!product || (product.status && product.status !== 'ACTIVE')) {
      return apiError('NOT_FOUND', `Product "${id}" not found or is inactive`, 404);
    }

    return apiSuccess(product, 200, { locale });
  } catch (error: any) {
    console.error('[API Product Detail Error]:', error);
    return apiError('INTERNAL_SERVER_ERROR', 'Failed to retrieve product', 500);
  }
}
