import type { Product, ProductId } from '../domain/product';
import type { Category } from '../domain/category';

export interface CatalogRepository {
  getProducts(): Promise<Product[]>;
  getProductById(id: ProductId): Promise<Product | undefined>;
  getProductsByCategory(category: string): Promise<Product[]>;
  getCategories(): Promise<Category[]>;
}
