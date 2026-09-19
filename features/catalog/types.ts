import type { Product, LocalizedProduct } from './domain/product';

export type CatalogFilterParams = {
  query?: string;
  category?: string;
};

export type FilterProductsOptions<T extends Product = LocalizedProduct> = {
  products: T[];
  params: CatalogFilterParams;
};
