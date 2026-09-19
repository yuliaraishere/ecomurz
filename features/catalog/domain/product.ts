import type { LocalizedContentMap, LocalizedProduct, LocalizedProductContent } from './localized-product';
import type { ProductStatus } from './catalog-state-machine';

export type ProductId = string;

/**
 * Canonical multilingual Product domain entity.
 * Language-independent attributes are stored at the root, while translatable
 * content is held in `localizedContent`.
 */
export interface Product {
  id: ProductId;
  sku?: string;
  slug?: string;
  status?: ProductStatus;
  currency?: string;
  category: string;
  categoryId?: string;
  price: number;
  rating: number;
  reviews: number;
  stock: number;
  image: string;
  accent?: string;
  archivedAt?: Date | null;
  localizedContent: LocalizedContentMap;
  // Optional projection fields for backward-compatibility with single-language consumers:
  name?: string;
  description?: string;
}

export type { LocalizedProduct, LocalizedProductContent, LocalizedContentMap };

