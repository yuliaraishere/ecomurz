import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api/response';
import { searchCatalogProducts } from '@/features/search/services/search-products';
import { DEFAULT_LOCALE, normalizeLocale } from '@/features/catalog/domain/locale';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = (searchParams.get('q') ?? searchParams.get('query'))?.trim();

    if (!query) {
      return apiError('VALIDATION_ERROR', 'Search query parameter "q" is required', 400, [
        { field: 'q', issue: 'Query string must not be empty' },
      ]);
    }

    const locale = normalizeLocale(searchParams.get('locale') ?? DEFAULT_LOCALE);
    const category = searchParams.get('category')?.trim() || undefined;
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10) || 20));

    const result = await searchCatalogProducts({
      query,
      locale,
      category,
      page,
      limit,
    });

    return apiSuccess(result.products, 200, {
      locale,
      query,
      category: category ?? 'all',
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: Math.ceil(result.total / result.limit) || 1,
      provider: result.provider,
      processingTimeMs: result.processingTimeMs,
    });
  } catch (error: any) {
    console.error('[API Search Error]:', error);
    return apiError('INTERNAL_SERVER_ERROR', 'Failed to execute search', 500);
  }
}
