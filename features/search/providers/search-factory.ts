import { getSearchConfig, isAlgoliaSearchConfigured, isAlgoliaIndexingConfigured } from '../config/search-config';
import type { SearchProvider, SearchIndexProvider } from './search-provider';
import { mockSearchProvider } from './mock/mock-search-provider';
import { AlgoliaSearchProvider } from './algolia/algolia-search-provider';
import { AlgoliaIndexProvider } from './algolia/algolia-index-provider';

let searchProviderInstance: SearchProvider | null = null;
let searchIndexProviderInstance: SearchIndexProvider | null = null;

export function getSearchProvider(): SearchProvider {
  if (searchProviderInstance) {
    return searchProviderInstance;
  }

  const config = getSearchConfig();
  if (config.provider === 'algolia' && isAlgoliaSearchConfigured()) {
    console.log('[SearchFactory] Using AlgoliaSearchProvider with index:', config.algoliaIndexName);
    searchProviderInstance = new AlgoliaSearchProvider();
  } else {
    console.log('[SearchFactory] Using MockSearchProvider');
    searchProviderInstance = mockSearchProvider;
  }

  return searchProviderInstance;
}

export function getSearchIndexProvider(): SearchIndexProvider {
  if (searchIndexProviderInstance) {
    return searchIndexProviderInstance;
  }

  const config = getSearchConfig();
  if (config.provider === 'algolia' && isAlgoliaIndexingConfigured()) {
    console.log('[SearchFactory] Using AlgoliaIndexProvider with index:', config.algoliaIndexName);
    searchIndexProviderInstance = new AlgoliaIndexProvider();
  } else {
    console.log('[SearchFactory] Using MockSearchProvider (indexer)');
    searchIndexProviderInstance = mockSearchProvider;
  }

  return searchIndexProviderInstance;
}

/**
 * Resets cached provider instances (useful for testing provider switching).
 */
export function resetSearchProviders(): void {
  searchProviderInstance = null;
  searchIndexProviderInstance = null;
}
