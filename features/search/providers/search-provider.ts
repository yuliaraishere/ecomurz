import type { Product } from '@/features/catalog/domain/product';
import type { SearchQueryInput, SearchProductsResult } from '../domain/search-query';

export interface SearchProviderStatus {
  provider: 'algolia' | 'mock';
  indexName: string;
  healthy: boolean;
  message?: string;
  totalDocuments?: number;
}

/**
 * Search read operations interface.
 */
export interface SearchProvider {
  readonly name: 'algolia' | 'mock';
  searchProducts(input: SearchQueryInput): Promise<SearchProductsResult>;
}

/**
 * Search indexing operations interface.
 */
export interface SearchIndexProvider {
  readonly name: 'algolia' | 'mock';
  indexProduct(product: Product): Promise<void>;
  indexProducts(products: Product[]): Promise<{ indexed: number; failed: number }>;
  removeProduct(productId: string): Promise<void>;
  reindexAll(products: Product[]): Promise<{ indexed: number; failed: number }>;
  getStatus(): Promise<SearchProviderStatus>;
}
