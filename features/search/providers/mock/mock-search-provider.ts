import type { Product } from '@/features/catalog/domain/product';
import type { SearchProvider, SearchIndexProvider, SearchProviderStatus } from '../search-provider';
import type { SearchQueryInput, SearchProductsResult } from '../../domain/search-query';
import { buildSearchDocument, type ProductSearchDocument } from '../../domain/search-document';
import { mockProducts } from '@/features/catalog/data/mock-products';

export class MockSearchProvider implements SearchProvider, SearchIndexProvider {
  readonly name = 'mock' as const;
  private documents: Map<string, ProductSearchDocument> = new Map();
  private initialized = false;

  constructor() {
    this.ensureInitialized();
  }

  private ensureInitialized() {
    if (!this.initialized) {
      for (const p of mockProducts) {
        const doc = buildSearchDocument(p);
        this.documents.set(doc.objectID, doc);
      }
      this.initialized = true;
    }
  }

  /**
   * Search across all multilingual names, descriptions, and keywords.
   */
  async searchProducts(input: SearchQueryInput): Promise<SearchProductsResult> {
    const startTime = Date.now();
    this.ensureInitialized();

    const rawQuery = (input.query ?? '').trim().toLowerCase();
    const rawCategory = (input.category ?? '').trim().toLowerCase();
    const isAllCategory = !rawCategory || rawCategory === 'semua';
    const inStockOnly = Boolean(input.inStockOnly);

    const docs = Array.from(this.documents.values());

    const matchedScored: Array<{ doc: ProductSearchDocument; score: number }> = [];

    for (const doc of docs) {
      // 1. Category Filter Check
      if (!isAllCategory) {
        const catIdMatch = doc.categoryId.toLowerCase() === rawCategory;
        const catNameMatch = doc.categoryName.toLowerCase() === rawCategory;
        const catSlugMatch = doc.categoryId.replace(/[^a-z0-9]+/g, '-') === rawCategory.replace(/[^a-z0-9]+/g, '-');

        if (!catIdMatch && !catNameMatch && !catSlugMatch) {
          continue;
        }
      }

      // 2. Stock Filter Check
      if (inStockOnly && !doc.available) {
        continue;
      }

      // 3. Query Check
      if (!rawQuery) {
        matchedScored.push({ doc, score: 1 });
        continue;
      }

      // Multilingual matching across all localized names
      let score = 0;

      for (const name of doc.searchableNames) {
        const lowerName = name.toLowerCase();
        if (lowerName === rawQuery) {
          score = Math.max(score, 100); // Exact match
        } else if (lowerName.startsWith(rawQuery)) {
          score = Math.max(score, 80); // Prefix match
        } else if (lowerName.includes(rawQuery)) {
          score = Math.max(score, 50); // Substring match
        }
      }

      // Check keywords
      if (score === 0) {
        for (const kw of doc.searchableKeywords) {
          if (kw === rawQuery) {
            score = Math.max(score, 70);
          } else if (kw.includes(rawQuery)) {
            score = Math.max(score, 40);
          }
        }
      }

      // Check descriptions (lowest score)
      if (score === 0) {
        for (const desc of Object.values(doc.descriptions)) {
          if (desc && desc.toLowerCase().includes(rawQuery)) {
            score = Math.max(score, 20);
            break;
          }
        }
      }

      if (score > 0) {
        matchedScored.push({ doc, score });
      }
    }

    // Sort by relevance score descending, then rating descending
    matchedScored.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return (b.doc.rating || 0) - (a.doc.rating || 0);
    });

    const total = matchedScored.length;
    const page = Math.max(1, input.page ?? 1);
    const limit = Math.max(1, input.limit ?? 24);
    const startIndex = (page - 1) * limit;
    const paginated = matchedScored.slice(startIndex, startIndex + limit);

    return {
      productIds: paginated.map((item) => item.doc.productId),
      total,
      page,
      limit,
      provider: 'mock',
      processingTimeMs: Date.now() - startTime,
    };
  }

  async indexProduct(product: Product): Promise<void> {
    const doc = buildSearchDocument(product);
    this.documents.set(doc.objectID, doc);
  }

  async indexProducts(products: Product[]): Promise<{ indexed: number; failed: number }> {
    let indexed = 0;
    for (const p of products) {
      const doc = buildSearchDocument(p);
      this.documents.set(doc.objectID, doc);
      indexed++;
    }
    return { indexed, failed: 0 };
  }

  async removeProduct(productId: string): Promise<void> {
    this.documents.delete(productId);
  }

  async reindexAll(products: Product[]): Promise<{ indexed: number; failed: number }> {
    this.documents.clear();
    return this.indexProducts(products);
  }

  async getStatus(): Promise<SearchProviderStatus> {
    this.ensureInitialized();
    return {
      provider: 'mock',
      indexName: 'mock_in_memory_index',
      healthy: true,
      totalDocuments: this.documents.size,
      message: 'Mock in-memory search provider running normally.',
    };
  }

  // Helper for test assertions
  getDocumentCount(): number {
    return this.documents.size;
  }
}

export const mockSearchProvider = new MockSearchProvider();
