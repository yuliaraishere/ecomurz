import type { SupportedLocale } from './locale';
import type { Product } from './product';

/**
 * Translatable fields for a product.
 * Separated cleanly from language-independent attributes (price, stock, image, etc.).
 */
export interface LocalizedProductContent {
  name: string;
  description: string;
}

/**
 * Map of supported locale codes to their localized product content.
 */
export type LocalizedContentMap = Partial<Record<SupportedLocale, LocalizedProductContent>>;

/**
 * A localized projection of a Product entity for a specific locale.
 * Provides concrete `name`, `description`, and `locale` alongside all language-independent fields.
 */
export interface LocalizedProduct extends Product {
  name: string;
  description: string;
  locale: SupportedLocale;
}
