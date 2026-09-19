import type { Product } from '@/features/catalog/domain/product';
import { getSearchIndexProvider } from '../providers/search-factory';

export async function indexProduct(product: Product): Promise<void> {
  const indexer = getSearchIndexProvider();
  await indexer.indexProduct(product);
}

export async function removeProductFromIndex(productId: string): Promise<void> {
  const indexer = getSearchIndexProvider();
  await indexer.removeProduct(productId);
}
