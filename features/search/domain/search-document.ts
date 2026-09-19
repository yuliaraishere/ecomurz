import type { Product } from '@/features/catalog/domain/product';
import type { SupportedLocale } from '@/features/catalog/domain/locale';
import { SUPPORTED_LOCALES } from '@/features/catalog/domain/locale';

/**
 * Multilingual search document schema for Algolia and local search engines.
 * Contains aggregated searchable names and descriptions across all 8 supported locales
 * mapped to one canonical Product ID.
 */
export interface ProductSearchDocument {
  objectID: string; // Algolia unique ID, mapped strictly to canonical Product.id
  productId: string;
  sku: string;
  slug: string;
  categoryId: string;
  categoryName: string;
  price: number; // Integer JPY
  rating: number;
  reviews: number;
  stock: number;
  available: boolean;
  image: string;
  accent?: string;
  names: Partial<Record<SupportedLocale, string>>;
  descriptions: Partial<Record<SupportedLocale, string>>;
  searchableNames: string[]; // Aggregated array of all localized names across all locales
  searchableKeywords: string[]; // Tokenized keywords across all names
}

/**
 * Builds a search document from a canonical Product entity.
 */
export function buildSearchDocument(product: Product): ProductSearchDocument {
  const names: Partial<Record<SupportedLocale, string>> = {};
  const descriptions: Partial<Record<SupportedLocale, string>> = {};
  const searchableNamesSet = new Set<string>();
  const keywordsSet = new Set<string>();

  for (const locale of SUPPORTED_LOCALES) {
    const content = product.localizedContent?.[locale];
    if (content) {
      if (content.name && content.name.trim().length > 0) {
        const trimmedName = content.name.trim();
        names[locale] = trimmedName;
        searchableNamesSet.add(trimmedName);

        // Extract individual words/tokens for keyword indexing
        const words = trimmedName
          .toLowerCase()
          .split(/[\s,，、/／()（）-]+/)
          .filter((w) => w.length > 0);
        for (const word of words) {
          keywordsSet.add(word);
        }
      }
      if (content.description && content.description.trim().length > 0) {
        descriptions[locale] = content.description.trim();
      }
    }
  }

  // Also include root product.name if present and not already added
  if (product.name && product.name.trim().length > 0) {
    searchableNamesSet.add(product.name.trim());
  }

  const categoryId = (product.categoryId || product.category || '').toLowerCase();
  const categoryName = product.category || '';

  return {
    objectID: product.id,
    productId: product.id,
    sku: product.sku || '',
    slug: product.slug || product.id,
    categoryId,
    categoryName,
    price: product.price,
    rating: product.rating || 0,
    reviews: product.reviews || 0,
    stock: product.stock || 0,
    available: (product.stock || 0) > 0 && product.status !== 'ARCHIVED' && product.status !== 'DRAFT',
    image: product.image || '',
    accent: product.accent,
    names,
    descriptions,
    searchableNames: Array.from(searchableNamesSet),
    searchableKeywords: Array.from(keywordsSet),
  };
}
