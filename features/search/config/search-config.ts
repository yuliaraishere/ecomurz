/**
 * Server-authoritative search configuration.
 * Algolia Admin API key and secrets MUST NEVER be exported to client bundles.
 */

export interface SearchConfig {
  provider: 'algolia' | 'mock';
  algoliaAppId?: string;
  algoliaSearchApiKey?: string;
  algoliaAdminApiKey?: string;
  algoliaIndexName: string;
}

export function getSearchConfig(): SearchConfig {
  const configuredProvider = process.env.SEARCH_PROVIDER?.toLowerCase();
  const algoliaAppId = process.env.ALGOLIA_APP_ID?.trim();
  const algoliaSearchApiKey = process.env.ALGOLIA_SEARCH_API_KEY?.trim();
  const algoliaAdminApiKey = process.env.ALGOLIA_ADMIN_API_KEY?.trim();
  const algoliaIndexName = process.env.ALGOLIA_INDEX_NAME?.trim() || 'rupa_products_dev';

  // Determine provider: use algolia if explicitly configured or if appId & keys are available
  let provider: 'algolia' | 'mock' = 'mock';

  if (configuredProvider === 'algolia') {
    if (algoliaAppId && (algoliaSearchApiKey || algoliaAdminApiKey)) {
      provider = 'algolia';
    } else {
      console.warn(
        '[SearchConfig] SEARCH_PROVIDER=algolia was set, but required Algolia credentials are missing. Falling back to mock provider.'
      );
      provider = 'mock';
    }
  } else if (!configuredProvider && algoliaAppId && algoliaSearchApiKey) {
    provider = 'algolia';
  }

  return {
    provider,
    algoliaAppId,
    algoliaSearchApiKey,
    algoliaAdminApiKey,
    algoliaIndexName,
  };
}

export function isAlgoliaSearchConfigured(): boolean {
  const config = getSearchConfig();
  return Boolean(config.algoliaAppId && config.algoliaSearchApiKey);
}

export function isAlgoliaIndexingConfigured(): boolean {
  const config = getSearchConfig();
  return Boolean(config.algoliaAppId && config.algoliaAdminApiKey);
}
