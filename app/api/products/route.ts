import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api/response';
import { catalogRepository, getLocalizedProducts } from '@/features/catalog';
import { DEFAULT_LOCALE, normalizeLocale } from '@/features/catalog/domain/locale';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const locale = normalizeLocale(searchParams.get('locale') ?? DEFAULT_LOCALE);
    const category = searchParams.get('category')?.trim() || null;
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10) || 20));

    // 1. Fetch products from authoritative repository
    let products = category
      ? await catalogRepository.getProductsByCategory(category)
      : await catalogRepository.getProducts();

    // Only active products are returned on public endpoints
    products = products.filter((p) => p.status === 'ACTIVE' || !p.status);

    const total = products.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const offset = (page - 1) * limit;
    const paginated = products.slice(offset, offset + limit);

    // 2. Project into requested UI locale
    const localized = getLocalizedProducts(paginated, locale);

    return apiSuccess(localized, 200, {
      locale,
      category: category ?? 'all',
      page,
      limit,
      total,
      totalPages,
    });
  } catch (error: any) {
    console.error('[API Products Error]:', error);
    return apiError('INTERNAL_SERVER_ERROR', 'Failed to retrieve products', 500);
  }
}
