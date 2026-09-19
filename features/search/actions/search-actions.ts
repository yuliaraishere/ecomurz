'use server';

import { searchCatalogProducts, type SearchCatalogResult } from '../services/search-products';
import type { SearchQueryInput } from '../domain/search-query';
import { getSearchConfig, isAlgoliaSearchConfigured } from '../config/search-config';

/**
 * Server action to execute cross-language catalog search using the active SearchProvider (Algolia or Mock).
 */
export async function searchProductsAction(
  input: SearchQueryInput
): Promise<SearchCatalogResult> {
  return await searchCatalogProducts(input);
}

/**
 * Server action to get the active search provider info.
 */
export async function getActiveSearchProviderAction(): Promise<{
  provider: 'algolia' | 'mock';
  isAlgoliaConfigured: boolean;
}> {
  const config = getSearchConfig();
  return {
    provider: config.provider,
    isAlgoliaConfigured: isAlgoliaSearchConfigured(),
  };
}
