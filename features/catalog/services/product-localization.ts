import type {
  Product,
  LocalizedProduct,
  LocalizedProductContent,
} from '../domain/product';
import {
  DEFAULT_LOCALE,
  normalizeLocale,
  type SupportedLocale,
} from '../domain/locale';

export interface LocalizedResolutionResult {
  content: LocalizedProductContent;
  resolvedLocale: SupportedLocale;
}

/**
 * Resolves localized product content for a requested locale using a deterministic fallback strategy:
 * 1. Requested locale exists and has content: returns that content.
 * 2. Requested locale is missing or empty: falls back to DEFAULT_LOCALE ('id').
 * 3. Default locale is missing: falls back to the first available non-empty locale.
 * 4. No locale content exists: returns safe empty strings without throwing.
 */
export function resolveLocalizedContent(
  product: Product,
  locale?: string
): LocalizedResolutionResult {
  const targetLocale = normalizeLocale(locale);

  // 1. Check requested locale
  const requested = product.localizedContent[targetLocale];
  if (requested && requested.name.trim().length > 0) {
    return { content: requested, resolvedLocale: targetLocale };
  }

  // 2. Fall back to default locale ('id')
  const defaultContent = product.localizedContent[DEFAULT_LOCALE];
  if (defaultContent && defaultContent.name.trim().length > 0) {
    return { content: defaultContent, resolvedLocale: DEFAULT_LOCALE };
  }

  // 3. Fall back to any available non-empty locale
  const availableLocales = Object.keys(product.localizedContent) as SupportedLocale[];
  for (const loc of availableLocales) {
    const candidate = product.localizedContent[loc];
    if (candidate && candidate.name.trim().length > 0) {
      return { content: candidate, resolvedLocale: loc };
    }
  }

  // 4. Safe fallback for empty product content
  return {
    content: { name: '', description: '' },
    resolvedLocale: DEFAULT_LOCALE,
  };
}

/**
 * Projects a canonical multilingual Product entity into a LocalizedProduct for a requested locale.
 * Preserves all language-independent attributes (id, price, category, rating, etc.)
 * while binding localized `name`, `description`, and `locale`.
 */
export function getLocalizedProduct(
  product: Product,
  locale?: string
): LocalizedProduct {
  const { content, resolvedLocale } = resolveLocalizedContent(product, locale);
  return {
    ...product,
    name: content.name,
    description: content.description,
    locale: resolvedLocale,
  };
}

/**
 * Projects a list of canonical multilingual products into LocalizedProducts for a requested locale.
 */
export function getLocalizedProducts(
  products: Product[],
  locale?: string
): LocalizedProduct[] {
  return products.map((product) => getLocalizedProduct(product, locale));
}

/**
 * Extracts searchable text across all supported locales for a product entity.
 * Prepared for future cross-language indexing and search services.
 */
export function getSearchableProductTexts(
  product: Product
): Array<{ locale: SupportedLocale; name: string; description: string }> {
  const results: Array<{ locale: SupportedLocale; name: string; description: string }> = [];
  for (const [locale, content] of Object.entries(product.localizedContent) as [
    SupportedLocale,
    LocalizedProductContent | undefined,
  ][]) {
    if (content && content.name.trim().length > 0) {
      results.push({
        locale,
        name: content.name,
        description: content.description,
      });
    }
  }
  return results;
}
