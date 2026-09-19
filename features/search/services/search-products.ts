import type { LocalizedProduct, Product } from '@/features/catalog/domain/product';
import { DEFAULT_LOCALE, normalizeLocale } from '@/features/catalog/domain/locale';
import { getLocalizedProducts } from '@/features/catalog/services/product-localization';
import { catalogRepository } from '@/features/catalog';
import { getSearchProvider } from '../providers/search-factory';
import type { SearchQueryInput } from '../domain/search-query';

export interface SearchCatalogResult {
  products: LocalizedProduct[];
  total: number;
  page: number;
  limit: number;
  provider: 'algolia' | 'mock';
  processingTimeMs?: number;
}

/**
 * Executes a cross-language search query:
 * 1. Searches across all multilingual translations using the active SearchProvider (Algolia or Mock).
 * 2. Resolves matching canonical Product entities from the database / repository.
 * 3. Projects canonical products into LocalizedProduct entities using the user's active UI locale.
 */
export async function searchCatalogProducts(
  input: SearchQueryInput
): Promise<SearchCatalogResult> {
  const targetLocale = normalizeLocale(input.locale ?? DEFAULT_LOCALE);
  const provider = getSearchProvider();

  // 1. Perform search through the provider
  const searchResult = await provider.searchProducts({
    ...input,
    locale: targetLocale,
  });

  // 2. Hydrate canonical products from authoritative repository
  const allProducts = await catalogRepository.getProducts();
  const productMap = new Map<string, Product>();
  for (const p of allProducts) {
    productMap.set(p.id, p);
  }

  // Preserve the search provider's relevance ranking order
  const orderedProducts: Product[] = [];
  for (const id of searchResult.productIds) {
    const product = productMap.get(id);
    if (product) {
      orderedProducts.push(product);
    }
  }

  // 3. Project canonical entities into the user's active UI locale
  const localizedProducts = getLocalizedProducts(orderedProducts, targetLocale);

  return {
    products: localizedProducts,
    total: searchResult.total,
    page: searchResult.page,
    limit: searchResult.limit,
    provider: searchResult.provider,
    processingTimeMs: searchResult.processingTimeMs,
  };
}
