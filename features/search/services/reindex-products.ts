import { catalogRepository } from '@/features/catalog';
import { getSearchIndexProvider } from '../providers/search-factory';

export interface ReindexSummary {
  success: boolean;
  provider: 'algolia' | 'mock';
  totalProducts: number;
  indexedCount: number;
  failedCount: number;
  durationMs: number;
  error?: string;
}

/**
 * Re-indexes all active products into the search index.
 * Idempotent operation: can be triggered via CLI script or Admin dashboard.
 */
export async function reindexAllProducts(): Promise<ReindexSummary> {
  const startTime = Date.now();
  const indexer = getSearchIndexProvider();

  try {
    const products = await catalogRepository.getProducts();
    // Filter to active products only
    const activeProducts = products.filter(
      (p) => p.status !== 'ARCHIVED' && p.status !== 'DRAFT'
    );

    const result = await indexer.reindexAll(activeProducts);

    return {
      success: true,
      provider: indexer.name,
      totalProducts: activeProducts.length,
      indexedCount: result.indexed,
      failedCount: result.failed,
      durationMs: Date.now() - startTime,
    };
  } catch (err: any) {
    console.error('[SearchReindex] Error during reindexing:', err);
    return {
      success: false,
      provider: indexer.name,
      totalProducts: 0,
      indexedCount: 0,
      failedCount: 0,
      durationMs: Date.now() - startTime,
      error: err?.message || 'Unknown error during search reindex.',
    };
  }
}
