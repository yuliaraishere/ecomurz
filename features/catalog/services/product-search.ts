import type { Product, LocalizedProduct } from '../domain/product';
import type { FilterProductsOptions } from '../types';

/**
 * Normalizes a search query string by trimming and converting to lowercase.
 */
export function normalizeQuery(query?: string): string {
  return (query ?? '').trim().toLowerCase();
}

/**
 * Normalizes a category filter string.
 */
export function normalizeCategory(category?: string): string {
  return (category ?? '').trim();
}

/**
 * Extracts unique categories from the product list and prepends 'Semua'.
 */
export function getCatalogCategories(products: Product[]): string[] {
  const uniqueCategories = Array.from(new Set(products.map((product) => product.category)));
  return ['Semua', ...uniqueCategories];
}

/**
 * Filters a product catalog using search query and category parameters.
 *
 * Rules:
 * 1. Search is case-insensitive and trims whitespace.
 * 2. Empty or whitespace-only queries apply no search filter.
 * 3. Searches `product.name` and `product.description`.
 * 4. Category matching is case-insensitive against `product.category`.
 * 5. 'Semua' or empty category applies no category filter.
 * 6. Combined filter uses strict AND logic (product must match both category and query).
 */
export function filterProducts<T extends Product = LocalizedProduct>({
  products,
  params,
}: FilterProductsOptions<T>): T[] {
  const query = normalizeQuery(params.query);
  const rawCategory = normalizeCategory(params.category);
  const isAllCategory = !rawCategory || rawCategory.toLowerCase() === 'semua';
  const categoryLower = rawCategory.toLowerCase();

  return products.filter((product) => {
    // 1. Category Filter Check
    const matchesCategory =
      isAllCategory ||
      product.category.toLowerCase() === categoryLower ||
      (product.categoryId && product.categoryId.toLowerCase() === categoryLower) ||
      (product.category.toLowerCase().replace(/[^a-z0-9]+/g, '-') ===
        categoryLower.replace(/[^a-z0-9]+/g, '-'));

    if (!matchesCategory) {
      return false;
    }

    // 2. Query Filter Check
    if (!query) {
      return true;
    }

    // Check localized/current name & description
    const currentName = (product.name ?? '').toLowerCase();
    const currentDesc = (product.description ?? '').toLowerCase();

    if (currentName.includes(query) || currentDesc.includes(query)) {
      return true;
    }

    // Check all multilingual translations if available
    if (product.localizedContent) {
      for (const content of Object.values(product.localizedContent)) {
        if (content) {
          if (
            content.name.toLowerCase().includes(query) ||
            content.description.toLowerCase().includes(query)
          ) {
            return true;
          }
        }
      }
    }

    return false;
  });
}

export { getSearchableProductTexts } from './product-localization';
