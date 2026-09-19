/**
 * Input options for executing a product search.
 */
export interface SearchQueryInput {
  query?: string;
  category?: string;
  locale?: string;
  inStockOnly?: boolean;
  page?: number;
  limit?: number;
}

/**
 * Filter options for search indexing or querying.
 */
export interface SearchFilterOptions {
  category?: string;
  inStockOnly?: boolean;
}

/**
 * Result returned by a search provider.
 */
export interface SearchProductsResult {
  productIds: string[];
  total: number;
  page: number;
  limit: number;
  provider: 'algolia' | 'mock';
  processingTimeMs?: number;
}
