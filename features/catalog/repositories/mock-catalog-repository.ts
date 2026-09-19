import type { CatalogRepository } from './catalog-repository';
import type { Product, ProductId } from '../domain/product';
import type { Category } from '../domain/category';
import { mockProducts } from '../data/mock-products';

import { DEFAULT_CATEGORY } from '../domain/category';

export class MockCatalogRepository implements CatalogRepository {
  private products: Product[];

  constructor(products: Product[] = mockProducts) {
    this.products = products;
  }

  async getProducts(): Promise<Product[]> {
    return this.products;
  }

  async getProductById(id: ProductId): Promise<Product | undefined> {
    return this.products.find((product) => product.id === id);
  }

  async getProductsByCategory(category: string): Promise<Product[]> {
    const normalized = category.trim().toLowerCase();
    if (!normalized || normalized === 'semua') {
      return this.products;
    }
    return this.products.filter(
      (product) => product.category.toLowerCase() === normalized
    );
  }

  async getCategories(): Promise<Category[]> {
    const uniqueNames = Array.from(new Set(this.products.map((p) => p.category)));
    return [
      { id: 'semua', name: DEFAULT_CATEGORY },
      ...uniqueNames.map((name) => ({
        id: name.toLowerCase(),
        name,
      })),
    ];
  }

  // Synchronous helpers for client components / compatibility
  getProductsSync(): Product[] {
    return this.products;
  }

  getProductByIdSync(id: ProductId): Product | undefined {
    return this.products.find((product) => product.id === id);
  }
}

export const mockCatalogRepository = new MockCatalogRepository();
