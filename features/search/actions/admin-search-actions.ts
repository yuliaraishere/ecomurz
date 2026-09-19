'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/features/auth/services/require-admin';
import { getSearchIndexProvider } from '../providers/search-factory';
import { reindexAllProducts, type ReindexSummary } from '../services/reindex-products';
import type { SearchProviderStatus } from '../providers/search-provider';

/**
 * Server action to get search index status for the admin dashboard.
 */
export async function getSearchStatusAction(): Promise<SearchProviderStatus> {
  await requireAdmin();
  const indexer = getSearchIndexProvider();
  return await indexer.getStatus();
}

/**
 * Server action to trigger full search reindex.
 * Protected by requireAdmin().
 */
export async function reindexCatalogAction(): Promise<ReindexSummary> {
  await requireAdmin();

  const summary = await reindexAllProducts();

  // Revalidate catalog routes
  revalidatePath('/');
  revalidatePath('/[locale]', 'layout');

  return summary;
}
