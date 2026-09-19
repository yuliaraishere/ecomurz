import type { SearchConfig } from '../../config/search-config';
import type { ProductSearchDocument } from '../../domain/search-document';

export interface AlgoliaHit {
  objectID: string;
  productId: string;
  [key: string]: any;
}

export interface AlgoliaSearchResponse {
  hits: AlgoliaHit[];
  nbHits: number;
  page: number;
  nbPages: number;
  hitsPerPage: number;
  processingTimeMS: number;
  query: string;
}

/**
 * Server-authoritative Algolia REST client.
 * Uses native fetch with strict credential separation.
 */
export class AlgoliaClient {
  private appId: string;
  private searchApiKey?: string;
  private adminApiKey?: string;
  private indexName: string;

  constructor(config: SearchConfig) {
    this.appId = config.algoliaAppId || '';
    this.searchApiKey = config.algoliaSearchApiKey;
    this.adminApiKey = config.algoliaAdminApiKey;
    this.indexName = config.algoliaIndexName;
  }

  private getReadUrl(endpoint: string): string {
    return `https://${this.appId}-dsn.algolia.net/1${endpoint}`;
  }

  private getWriteUrl(endpoint: string): string {
    return `https://${this.appId}.algolia.net/1${endpoint}`;
  }

  /**
   * Performs a search query against Algolia index.
   */
  async search(params: {
    query: string;
    filters?: string;
    hitsPerPage?: number;
    page?: number;
  }): Promise<AlgoliaSearchResponse> {
    const apiKey = this.searchApiKey || this.adminApiKey;
    if (!this.appId || !apiKey) {
      throw new Error('[AlgoliaClient] Missing credentials for search operation.');
    }

    const url = this.getReadUrl(`/indexes/${encodeURIComponent(this.indexName)}/query`);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Algolia-Application-Id': this.appId,
        'X-Algolia-API-Key': apiKey,
      },
      body: JSON.stringify({
        query: params.query,
        filters: params.filters,
        hitsPerPage: params.hitsPerPage ?? 24,
        page: params.page ?? 0,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`[AlgoliaClient] Search failed (${response.status}): ${errorText}`);
    }

    return (await response.json()) as AlgoliaSearchResponse;
  }

  /**
   * Configures index settings (searchable attributes and faceting).
   */
  async configureSettings(): Promise<void> {
    if (!this.appId || !this.adminApiKey) {
      throw new Error('[AlgoliaClient] Missing Algolia Admin API key for configureSettings.');
    }

    const url = this.getWriteUrl(`/indexes/${encodeURIComponent(this.indexName)}/settings`);
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Algolia-Application-Id': this.appId,
        'X-Algolia-API-Key': this.adminApiKey,
      },
      body: JSON.stringify({
        searchableAttributes: [
          'unordered(searchableNames)',
          'unordered(searchableKeywords)',
          'unordered(names)',
          'unordered(descriptions)',
        ],
        attributesForFaceting: ['filterOnly(categoryId)', 'filterOnly(available)'],
        customRanking: ['desc(rating)', 'desc(reviews)'],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`[AlgoliaClient] configureSettings failed (${response.status}): ${errorText}`);
    }
  }

  /**
   * Batch upserts search documents.
   */
  async saveObjects(objects: ProductSearchDocument[]): Promise<void> {
    if (!this.appId || !this.adminApiKey) {
      throw new Error('[AlgoliaClient] Missing Algolia Admin API key for saveObjects.');
    }

    if (objects.length === 0) return;

    const url = this.getWriteUrl(`/indexes/${encodeURIComponent(this.indexName)}/batch`);
    const requests = objects.map((body) => ({
      action: 'updateObject',
      body,
    }));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Algolia-Application-Id': this.appId,
        'X-Algolia-API-Key': this.adminApiKey,
      },
      body: JSON.stringify({ requests }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`[AlgoliaClient] saveObjects failed (${response.status}): ${errorText}`);
    }
  }

  /**
   * Deletes a single object by ID.
   */
  async deleteObject(objectID: string): Promise<void> {
    if (!this.appId || !this.adminApiKey) {
      throw new Error('[AlgoliaClient] Missing Algolia Admin API key for deleteObject.');
    }

    const url = this.getWriteUrl(
      `/indexes/${encodeURIComponent(this.indexName)}/${encodeURIComponent(objectID)}`
    );
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'X-Algolia-Application-Id': this.appId,
        'X-Algolia-API-Key': this.adminApiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`[AlgoliaClient] deleteObject failed (${response.status}): ${errorText}`);
    }
  }

  /**
   * Clears the index.
   */
  async clearObjects(): Promise<void> {
    if (!this.appId || !this.adminApiKey) {
      throw new Error('[AlgoliaClient] Missing Algolia Admin API key for clearObjects.');
    }

    const url = this.getWriteUrl(`/indexes/${encodeURIComponent(this.indexName)}/clear`);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-Algolia-Application-Id': this.appId,
        'X-Algolia-API-Key': this.adminApiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`[AlgoliaClient] clearObjects failed (${response.status}): ${errorText}`);
    }
  }
}
