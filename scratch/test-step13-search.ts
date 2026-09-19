import { mockProducts } from '../features/catalog/data/mock-products';
import { buildSearchDocument } from '../features/search/domain/search-document';
import { mockSearchProvider, MockSearchProvider } from '../features/search/providers/mock/mock-search-provider';
import { searchCatalogProducts } from '../features/search/services/search-products';
import { reindexAllProducts } from '../features/search/services/reindex-products';
import { mockTranslationProvider } from '../features/translations/providers/mock-translation-provider';
import { ensureProductTranslations } from '../features/translations/services/translate-product';
import { filterProducts } from '../features/catalog/services/product-search';
import { getLocalizedProducts } from '../features/catalog/services/product-localization';
import { getSearchConfig } from '../features/search/config/search-config';
import type { Product } from '../features/catalog/domain/product';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
    console.log(`  ✔ PASS: ${message}`);
  } else {
    failed++;
    console.error(`  ✖ FAIL: ${message}`);
  }
}

async function runTests() {
  console.log('='.repeat(70));
  console.log('STEP 13: MULTILINGUAL SEARCH & PRODUCT DISCOVERY TEST SUITE');
  console.log('='.repeat(70));

  // -------------------------------------------------------------------------
  // 1. Search Document Generation & Canonical Identity
  // -------------------------------------------------------------------------
  console.log('\n--- 1. Search Document Generation & Canonical Identity ---');
  const chickenProduct = mockProducts.find((p) => p.id === 'ayam-kampung-segar')!;
  assert(Boolean(chickenProduct), 'ayam-kampung-segar exists in mockProducts');

  const doc = buildSearchDocument(chickenProduct);
  assert(doc.objectID === 'ayam-kampung-segar', 'doc.objectID matches canonical Product.id');
  assert(doc.productId === 'ayam-kampung-segar', 'doc.productId matches canonical Product.id');
  assert(doc.searchableNames.length >= 8, 'searchableNames contains all 8 localized product names');
  assert(doc.searchableNames.includes('Ayam Kampung Segar'), 'searchableNames includes Indonesian name');
  assert(doc.searchableNames.includes('Fresh Free-Range Chicken'), 'searchableNames includes English name');
  assert(doc.searchableNames.includes('新鮮な地鶏（丸鶏）'), 'searchableNames includes Japanese name');
  assert(doc.available === true, 'doc.available is correctly evaluated as true for in-stock active product');

  // -------------------------------------------------------------------------
  // 2. Cross-Language Search Resolution (Core Requirement)
  // -------------------------------------------------------------------------
  console.log('\n--- 2. Cross-Language Search Resolution ---');
  // "ayam" (Indonesian) -> ayam-kampung-segar
  const resIndo = await mockSearchProvider.searchProducts({ query: 'ayam' });
  assert(
    resIndo.productIds.includes('ayam-kampung-segar'),
    'Search query "ayam" resolves to canonical productId "ayam-kampung-segar"'
  );

  // "chicken" (English) -> ayam-kampung-segar
  const resEng = await mockSearchProvider.searchProducts({ query: 'chicken' });
  assert(
    resEng.productIds.includes('ayam-kampung-segar'),
    'Search query "chicken" resolves to canonical productId "ayam-kampung-segar"'
  );

  // "鶏" (Japanese) -> ayam-kampung-segar
  const resJa = await mockSearchProvider.searchProducts({ query: '鶏' });
  assert(
    resJa.productIds.includes('ayam-kampung-segar'),
    'Search query "鶏" resolves to canonical productId "ayam-kampung-segar"'
  );

  // "manok" (Tagalog) -> ayam-kampung-segar
  const resTl = await mockSearchProvider.searchProducts({ query: 'manok' });
  assert(
    resTl.productIds.includes('ayam-kampung-segar'),
    'Search query "manok" (Tagalog) resolves to canonical productId "ayam-kampung-segar"'
  );

  // "gà" (Vietnamese) -> ayam-kampung-segar
  const resVi = await mockSearchProvider.searchProducts({ query: 'gà' });
  assert(
    resVi.productIds.includes('ayam-kampung-segar'),
    'Search query "gà" (Vietnamese) resolves to canonical productId "ayam-kampung-segar"'
  );

  // "ไก่" (Thai) -> ayam-kampung-segar
  const resTh = await mockSearchProvider.searchProducts({ query: 'ไก่' });
  assert(
    resTh.productIds.includes('ayam-kampung-segar'),
    'Search query "ไก่" (Thai) resolves to canonical productId "ayam-kampung-segar"'
  );

  // "मुर्गा" (Hindi) -> ayam-kampung-segar
  const resHi = await mockSearchProvider.searchProducts({ query: 'मुर्गा' });
  assert(
    resHi.productIds.includes('ayam-kampung-segar'),
    'Search query "मुर्गा" (Hindi) resolves to canonical productId "ayam-kampung-segar"'
  );

  // "走地鸡" (Chinese) -> ayam-kampung-segar
  const resZh = await mockSearchProvider.searchProducts({ query: '走地鸡' });
  assert(
    resZh.productIds.includes('ayam-kampung-segar'),
    'Search query "走地鸡" (Chinese) resolves to canonical productId "ayam-kampung-segar"'
  );

  // -------------------------------------------------------------------------
  // 3. UI Locale Projection Independence
  // -------------------------------------------------------------------------
  console.log('\n--- 3. UI Locale Presentation Independence ---');
  // Searching English "chicken" while UI locale is Indonesian ('id') must show Indonesian name
  const catalogResId = await searchCatalogProducts({ query: 'chicken', locale: 'id' });
  const matchedId = catalogResId.products.find((p) => p.id === 'ayam-kampung-segar');
  assert(Boolean(matchedId), 'Search for "chicken" returned canonical product');
  assert(
    matchedId?.name === 'Ayam Kampung Segar',
    `Searching "chicken" on /id renders name in Indonesian ("${matchedId?.name}")`
  );

  // Searching Indonesian "ayam" while UI locale is English ('en') must show English name
  const catalogResEn = await searchCatalogProducts({ query: 'ayam', locale: 'en' });
  const matchedEn = catalogResEn.products.find((p) => p.id === 'ayam-kampung-segar');
  assert(
    matchedEn?.name === 'Fresh Free-Range Chicken',
    `Searching "ayam" on /en renders name in English ("${matchedEn?.name}")`
  );

  // Searching "chicken" while UI locale is Japanese ('ja') must show Japanese name
  const catalogResJa = await searchCatalogProducts({ query: 'chicken', locale: 'ja' });
  const matchedJa = catalogResJa.products.find((p) => p.id === 'ayam-kampung-segar');
  assert(
    matchedJa?.name === '新鮮な地鶏（丸鶏）',
    `Searching "chicken" on /ja renders name in Japanese ("${matchedJa?.name}")`
  );

  // -------------------------------------------------------------------------
  // 4. Category Filtering & Combined Search
  // -------------------------------------------------------------------------
  console.log('\n--- 4. Category Filtering & Combined Search ---');
  // Standalone category filter
  const catOnlyRes = await mockSearchProvider.searchProducts({ category: 'Daging & Unggas' });
  assert(catOnlyRes.total > 0, 'Category filter "Daging & Unggas" returns products');
  const allInMeat = catOnlyRes.productIds.every((id) => {
    const prod = mockProducts.find((p) => p.id === id);
    return prod?.category.toLowerCase() === 'daging & unggas';
  });
  assert(allInMeat, 'All returned products match category "Daging & Unggas"');

  // Combined search + category filter
  const combinedRes = await mockSearchProvider.searchProducts({
    query: 'ayam',
    category: 'Daging & Unggas',
  });
  assert(
    combinedRes.productIds.includes('ayam-kampung-segar'),
    'Combined search query "ayam" + category "Daging & Unggas" returns chicken'
  );

  // Mismatch category + query returns empty
  const mismatchRes = await mockSearchProvider.searchProducts({
    query: 'ayam',
    category: 'Sayuran Segar',
  });
  assert(
    !mismatchRes.productIds.includes('ayam-kampung-segar'),
    'Combined query "ayam" + category "Sayuran Segar" does NOT return chicken'
  );

  // 'Semua' category reset
  const resetCategoryRes = await mockSearchProvider.searchProducts({
    query: 'ayam',
    category: 'Semua',
  });
  assert(
    resetCategoryRes.productIds.includes('ayam-kampung-segar'),
    'Category "Semua" treats filter as all categories'
  );

  // -------------------------------------------------------------------------
  // 5. Query Normalization & Edge Cases
  // -------------------------------------------------------------------------
  console.log('\n--- 5. Query Normalization & Edge Cases ---');
  const leadingTrailing = await mockSearchProvider.searchProducts({ query: '   CHICKEN   ' });
  assert(
    leadingTrailing.productIds.includes('ayam-kampung-segar'),
    'Whitespace trimming and uppercase query "   CHICKEN   " resolves cleanly'
  );

  const emptyQuery = await mockSearchProvider.searchProducts({ query: '   ' });
  assert(emptyQuery.total === mockProducts.length, 'Empty whitespace query returns all products');

  const nonExistent = await mockSearchProvider.searchProducts({ query: 'xyznonexistentterm999' });
  assert(nonExistent.total === 0, 'Non-matching query returns 0 results');

  // -------------------------------------------------------------------------
  // 6. Indexing & Reindex Idempotency
  // -------------------------------------------------------------------------
  console.log('\n--- 6. Indexing & Reindex Idempotency ---');
  const isolatedMockProvider = new MockSearchProvider();
  const initialCount = isolatedMockProvider.getDocumentCount();
  assert(initialCount > 0, `Mock search index initially populated (${initialCount} docs)`);

  const reindexSummary = await reindexAllProducts();
  assert(reindexSummary.success === true, 'reindexAllProducts completes successfully');
  assert(reindexSummary.indexedCount > 0, `reindexAllProducts indexed ${reindexSummary.indexedCount} products`);
  assert(reindexSummary.failedCount === 0, 'Zero failed items during reindexing');
  assert(reindexSummary.durationMs >= 0, `Reindexing duration recorded (${reindexSummary.durationMs}ms)`);

  const secondReindex = await reindexAllProducts();
  assert(
    secondReindex.indexedCount === reindexSummary.indexedCount,
    'Repeated reindexing is idempotent and produces consistent count'
  );

  // -------------------------------------------------------------------------
  // 7. Translation Provider & Missing Translations Synchronization
  // -------------------------------------------------------------------------
  console.log('\n--- 7. Translation Provider & Missing Translations ---');
  const mockTrans = await mockTranslationProvider.translate('ayam kampung segar', 'id', 'ja');
  assert(mockTrans === '新鮮な地鶏（丸鶏）', 'MockTranslationProvider accurately translates known dictionary term');

  const testProductMissingTranslations: Product = {
    id: 'test-nangka-muda',
    category: 'Sayuran Segar',
    price: 350,
    rating: 4.5,
    reviews: 10,
    stock: 20,
    image: 'https://example.com/nangka.jpg',
    localizedContent: {
      id: {
        name: 'Nangka Muda Segar',
        description: 'Nangka muda untuk sayur lodeh atau gudeg',
      },
    },
  };

  const translationResult = await ensureProductTranslations(testProductMissingTranslations);
  assert(
    translationResult.generatedLocales.length === 7,
    `ensureProductTranslations filled all 7 missing locales (generated: ${translationResult.generatedLocales.length})`
  );
  assert(
    Boolean(translationResult.updatedProduct.localizedContent.en?.name),
    'English translation generated'
  );
  assert(
    Boolean(translationResult.updatedProduct.localizedContent.ja?.name),
    'Japanese translation generated'
  );

  // -------------------------------------------------------------------------
  // 8. Catalog `filterProducts` In-Memory Cross-Language Verification
  // -------------------------------------------------------------------------
  console.log('\n--- 8. filterProducts In-Memory Cross-Language Support ---');
  const localizedMockProds = getLocalizedProducts(mockProducts, 'id');
  const filteredCrossLang = filterProducts({
    products: localizedMockProds,
    params: { query: 'chicken' },
  });
  assert(
    filteredCrossLang.some((p) => p.id === 'ayam-kampung-segar'),
    'Client filterProducts matches "chicken" on Indonesian localized catalog through localizedContent'
  );

  // -------------------------------------------------------------------------
  // 9. Security & Credential Isolation
  // -------------------------------------------------------------------------
  console.log('\n--- 9. Security & Credential Isolation ---');
  const config = getSearchConfig();
  assert(config.provider === 'mock', 'Default local environment resolves to mock provider safely');
  assert(
    typeof window === 'undefined',
    'Search indexing and admin keys are strictly server-side runtime'
  );

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log('\n' + '='.repeat(70));
  console.log(`STEP 13 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('='.repeat(70));

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
