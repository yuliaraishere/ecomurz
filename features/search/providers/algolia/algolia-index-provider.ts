import type { Product } from '@/features/catalog/domain/product';
import type { SearchIndexProvider, SearchProviderStatus } from '../search-provider';
import { buildSearchDocument } from '../../domain/search-document';
import { AlgoliaClient } from './algolia-client';
import { getSearchConfig } from '../../config/search-config';

export class AlgoliaIndexProvider implements SearchIndexProvider {
  readonly name = 'algolia' as const;
  private client: AlgoliaClient;
  private indexName: string;

  constructor(client?: AlgoliaClient) {
    const config = getSearchConfig();
    this.client = client ?? new AlgoliaClient(config);
    this.indexName = config.algoliaIndexName;
  }

  async indexProduct(product: Product): Promise<void> {
    const doc = buildSearchDocument(product);
    await this.client.saveObjects([doc]);
  }

  async indexProducts(products: Product[]): Promise<{ indexed: number; failed: number }> {
    try {
      const docs = products.map(buildSearchDocument);
      // Batch in chunks of 100 to avoid payload limits
      const chunkSize = 100;
      for (let i = 0; i < docs.length; i += chunkSize) {
        const chunk = docs.slice(i, i + chunkSize);
        await this.client.saveObjects(chunk);
      }
      return { indexed: docs.length, failed: 0 };
    } catch (err) {
      console.error('[AlgoliaIndexProvider] indexProducts failed:', err);
      return { indexed: 0, failed: products.length };
    }
  }

  async removeProduct(productId: string): Promise<void> {
    await this.client.deleteObject(productId);
  }

  async reindexAll(products: Product[]): Promise<{ indexed: number; failed: number }> {
    try {
      // 1. Configure settings first
      await this.client.configureSettings();
      // 2. Clear old index data
      await this.client.clearObjects();
      // 3. Batch save all products
      return await this.indexProducts(products);
    } catch (err) {
      console.error('[AlgoliaIndexProvider] reindexAll failed:', err);
      throw err;
    }
  }

  async getStatus(): Promise<SearchProviderStatus> {
    const config = getSearchConfig();
    const hasAdmin = Boolean(config.algoliaAdminApiKey);
    const hasAppId = Boolean(config.algoliaAppId);

    return {
      provider: 'algolia',
      indexName: this.indexName,
      healthy: hasAdmin && hasAppId,
      message:
        hasAdmin && hasAppId
          ? 'Algolia index provider configured and ready.'
          : 'Algolia credentials missing or incomplete.',
    };
  }
}
