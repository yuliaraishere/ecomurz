export * from './domain/product';
export * from './domain/category';
export * from './domain/locale';
export * from './domain/localized-product';
export * from './repositories/catalog-repository';
export * from './repositories/mock-catalog-repository';
export * from './repositories/prisma-catalog-repository';
export * from './types';
export * from './services/product-localization';
export * from './services/product-search';
export * from './hooks/use-catalog-filters';

import { mockCatalogRepository } from './repositories/mock-catalog-repository';
import { prismaCatalogRepository } from './repositories/prisma-catalog-repository';
import type { CatalogRepository } from './repositories/catalog-repository';
import type { Product, ProductId, LocalizedProduct } from './domain/product';
import type { Category } from './domain/category';
import { DEFAULT_LOCALE } from './domain/locale';
import { getLocalizedProduct, getLocalizedProducts } from './services/product-localization';

export function getActiveCatalogRepository(): CatalogRepository {
  const mode = process.env.CATALOG_REPOSITORY_MODE;
  console.log('[Catalog] repository mode:', mode);

  if (mode === 'mock' || !process.env.DATABASE_URL) {
    console.log('[Catalog] using MOCK repository');
    return mockCatalogRepository;
  }

  console.log('[Catalog] using PRISMA repository');
  return prismaCatalogRepository;
}

// Active repository instance (Prisma by default, with Mock fallback)
export const catalogRepository: CatalogRepository = getActiveCatalogRepository();

// Asynchronous public catalog data access methods (canonical contract returning localized projections)
export async function getCatalogProducts(
  locale: string = DEFAULT_LOCALE
): Promise<LocalizedProduct[]> {
  const products = await catalogRepository.getProducts();
  return getLocalizedProducts(products, locale);
}

export async function getProductById(
  id: ProductId,
  locale: string = DEFAULT_LOCALE
): Promise<LocalizedProduct | undefined> {
  const product = await catalogRepository.getProductById(id);
  return product ? getLocalizedProduct(product, locale) : undefined;
}

export async function getProductsByCategory(
  category: string,
  locale: string = DEFAULT_LOCALE
): Promise<LocalizedProduct[]> {
  const products = await catalogRepository.getProductsByCategory(category);
  return getLocalizedProducts(products, locale);
}

export async function getCatalogCategoriesList(): Promise<Category[]> {
  return catalogRepository.getCategories();
}

// Synchronous compatibility helpers for client components (cart, checkout, transactions)
export function getProductByIdSync(
  id: ProductId,
  locale: string = DEFAULT_LOCALE
): LocalizedProduct | undefined {
  const product = mockCatalogRepository.getProductByIdSync(id);
  return product ? getLocalizedProduct(product, locale) : undefined;
}

export function getCatalogProductsSync(
  locale: string = DEFAULT_LOCALE
): LocalizedProduct[] {
  const products = mockCatalogRepository.getProductsSync();
  return getLocalizedProducts(products, locale);
}
