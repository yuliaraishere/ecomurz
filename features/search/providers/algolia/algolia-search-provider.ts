import type { SearchProvider } from '../search-provider';
import type { SearchQueryInput, SearchProductsResult } from '../../domain/search-query';
import { AlgoliaClient } from './algolia-client';
import { getSearchConfig } from '../../config/search-config';

export class AlgoliaSearchProvider implements SearchProvider {
  readonly name = 'algolia' as const;
  private client: AlgoliaClient;

  constructor(client?: AlgoliaClient) {
    this.client = client ?? new AlgoliaClient(getSearchConfig());
  }

  async searchProducts(input: SearchQueryInput): Promise<SearchProductsResult> {
    const query = (input.query ?? '').trim();
    const filterClauses: string[] = [];

    const rawCategory = (input.category ?? '').trim().toLowerCase();
    if (rawCategory && rawCategory !== 'semua') {
      filterClauses.push(`categoryId:"${rawCategory}"`);
    }

    if (input.inStockOnly) {
      filterClauses.push('available:true');
    }

    const filters = filterClauses.length > 0 ? filterClauses.join(' AND ') : undefined;
    const page = Math.max(0, (input.page ?? 1) - 1);
    const hitsPerPage = Math.max(1, input.limit ?? 24);

    const response = await this.client.search({
      query,
      filters,
      hitsPerPage,
      page,
    });

    return {
      productIds: response.hits.map((hit) => hit.productId || hit.objectID),
      total: response.nbHits,
      page: response.page + 1,
      limit: response.hitsPerPage,
      provider: 'algolia',
      processingTimeMs: response.processingTimeMS,
    };
  }
}
