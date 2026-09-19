import { reindexAllProducts } from '../features/search/services/reindex-products';
import { getSearchConfig } from '../features/search/config/search-config';

async function main() {
  console.log('='.repeat(60));
  console.log('RUPA Marketplace — Search Index Synchronization Tool');
  console.log('='.repeat(60));

  const config = getSearchConfig();
  console.log(`Configured Provider: ${config.provider}`);
  console.log(`Target Index Name:   ${config.algoliaIndexName}`);
  console.log('-'.repeat(60));
  console.log('Starting catalog search reindex...');

  const summary = await reindexAllProducts();

  if (summary.success) {
    console.log('✔ Search reindex completed successfully!');
    console.log(`  - Provider:         ${summary.provider}`);
    console.log(`  - Total Products:   ${summary.totalProducts}`);
    console.log(`  - Indexed Products: ${summary.indexedCount}`);
    console.log(`  - Failed:           ${summary.failedCount}`);
    console.log(`  - Duration:         ${summary.durationMs}ms`);
    console.log('='.repeat(60));
    process.exit(0);
  } else {
    console.error('✖ Search reindex failed!');
    console.error(`  - Provider: ${summary.provider}`);
    console.error(`  - Error:    ${summary.error}`);
    console.log('='.repeat(60));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error running search index script:', err);
  process.exit(1);
});
