import 'dotenv/config';
import { mockProducts } from '../features/catalog/data/mock-products';
import { catalogRepository } from '../features/catalog';
import { filterProducts } from '../features/catalog/services/product-search';
import { getLocalizedProducts } from '../features/catalog/services/product-localization';
import { mockSearchProvider } from '../features/search/providers/mock/mock-search-provider';
import { searchCatalogProducts } from '../features/search/services/search-products';
import { SUPPORTED_LOCALES } from '../features/catalog/domain/locale';

async function main() {
  console.log('='.repeat(70));
  console.log('VERIFYING NEW CATALOG PRODUCTS & MULTILINGUAL DISCOVERY');
  console.log('='.repeat(70));

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, msg: string) {
    total++;
    if (condition) {
      passed++;
      console.log(`  ✔ PASS: ${msg}`);
    } else {
      console.error(`  ✖ FAIL: ${msg}`);
      throw new Error(`Assertion failed: ${msg}`);
    }
  }

  // 1. Verify all 8 new products exist in mockProducts
  console.log('\n--- 1. Checking Product Catalog Count & Structure ---');
  const expectedNewIds = [
    'bumbu-soto-ayam-kuning',
    'bumbu-nasi-goreng-spesial',
    'bumbu-dapur-komplit',
    'indomie-goreng-spesial',
    'mie-telur-keriting',
    'sanuki-udon-segar',
    'biskuit-kelapa-renyah',
    'biskuit-gandum-madu',
  ];

  assert(mockProducts.length === 16, `Total mock products is 16 (got ${mockProducts.length})`);

  for (const id of expectedNewIds) {
    const product = mockProducts.find((p) => p.id === id);
    assert(Boolean(product), `Product "${id}" exists in catalog`);
    assert(Number.isInteger(product!.price) && product!.price > 0, `Product "${id}" has valid JPY integer price: ¥${product!.price}`);
    assert((product!.stock || 0) > 0, `Product "${id}" has available stock: ${product!.stock}`);

    // Verify all 8 locales are present
    for (const locale of SUPPORTED_LOCALES) {
      const content = product!.localizedContent[locale];
      assert(Boolean(content && content.name && content.description), `Product "${id}" has valid ${locale} translation`);
    }
  }

  // 2. Verify Database Repository returns 16 products
  console.log('\n--- 2. Checking Database Repository (PostgreSQL) ---');
  const dbProducts = await catalogRepository.getProducts();
  assert(dbProducts.length === 16, `Database repository returned 16 products (got ${dbProducts.length})`);

  for (const id of expectedNewIds) {
    const p = dbProducts.find((item) => item.id === id);
    assert(Boolean(p), `Product "${id}" found in PostgreSQL database`);
  }

  // 3. Multilingual Search Resolution across languages
  console.log('\n--- 3. Testing Multilingual Search Queries ---');
  const testCases: Array<{ query: string; expectedId: string; lang: string }> = [
    // Bumbu Dapur
    { query: 'bumbu dapur', expectedId: 'bumbu-dapur-komplit', lang: 'Indonesian' },
    { query: 'soto', expectedId: 'bumbu-soto-ayam-kuning', lang: 'Indonesian' },
    { query: 'nasi goreng', expectedId: 'bumbu-nasi-goreng-spesial', lang: 'Indonesian' },
    { query: 'seasoning', expectedId: 'bumbu-nasi-goreng-spesial', lang: 'English' },
    { query: 'shallots', expectedId: 'bumbu-dapur-komplit', lang: 'English' },
    { query: 'ソトアヤム', expectedId: 'bumbu-soto-ayam-kuning', lang: 'Japanese' },
    { query: '台所スパイス', expectedId: 'bumbu-dapur-komplit', lang: 'Japanese' },
    { query: 'pampalasa', expectedId: 'bumbu-soto-ayam-kuning', lang: 'Tagalog' },
    { query: 'gia vị', expectedId: 'bumbu-soto-ayam-kuning', lang: 'Vietnamese' },
    { query: 'เครื่องปรุง', expectedId: 'bumbu-soto-ayam-kuning', lang: 'Thai' },
    { query: 'मसाला', expectedId: 'bumbu-soto-ayam-kuning', lang: 'Hindi' },
    { query: '香料', expectedId: 'bumbu-soto-ayam-kuning', lang: 'Chinese' },

    // Mie (Noodles)
    { query: 'indomie', expectedId: 'indomie-goreng-spesial', lang: 'Brand' },
    { query: 'mi goreng', expectedId: 'indomie-goreng-spesial', lang: 'Indonesian' },
    { query: 'curly egg noodles', expectedId: 'mie-telur-keriting', lang: 'English' },
    { query: 'ちぢれ卵麺', expectedId: 'mie-telur-keriting', lang: 'Japanese' },
    { query: 'instant noodles', expectedId: 'indomie-goreng-spesial', lang: 'English' },
    { query: 'mì trứng', expectedId: 'mie-telur-keriting', lang: 'Vietnamese' },
    { query: 'บะหมี่', expectedId: 'indomie-goreng-spesial', lang: 'Thai' },
    { query: 'नूडल्स', expectedId: 'indomie-goreng-spesial', lang: 'Hindi' },
    { query: '方便面', expectedId: 'indomie-goreng-spesial', lang: 'Chinese' },

    // Udon
    { query: 'udon', expectedId: 'sanuki-udon-segar', lang: 'English' },
    { query: 'うどん', expectedId: 'sanuki-udon-segar', lang: 'Japanese' },
    { query: 'sanuki', expectedId: 'sanuki-udon-segar', lang: 'Japanese/English' },
    { query: 'mì udon', expectedId: 'sanuki-udon-segar', lang: 'Vietnamese' },
    { query: 'เส้นอุด้ง', expectedId: 'sanuki-udon-segar', lang: 'Thai' },
    { query: 'उडोन', expectedId: 'sanuki-udon-segar', lang: 'Hindi' },
    { query: '乌冬面', expectedId: 'sanuki-udon-segar', lang: 'Chinese' },

    // Biscuits
    { query: 'biskuit', expectedId: 'biskuit-kelapa-renyah', lang: 'Indonesian' },
    { query: 'biscuit', expectedId: 'biskuit-kelapa-renyah', lang: 'English' },
    { query: 'coconut biscuits', expectedId: 'biskuit-kelapa-renyah', lang: 'English' },
    { query: 'digestive', expectedId: 'biskuit-gandum-madu', lang: 'English' },
    { query: 'ビスケット', expectedId: 'biskuit-kelapa-renyah', lang: 'Japanese' },
    { query: 'bánh quy', expectedId: 'biskuit-kelapa-renyah', lang: 'Vietnamese' },
    { query: 'บิสกิต', expectedId: 'biskuit-kelapa-renyah', lang: 'Thai' },
    { query: 'बिस्कुट', expectedId: 'biskuit-kelapa-renyah', lang: 'Hindi' },
    { query: '饼干', expectedId: 'biskuit-kelapa-renyah', lang: 'Chinese' },
  ];

  for (const tc of testCases) {
    const searchRes = await mockSearchProvider.searchProducts({ query: tc.query });
    assert(
      searchRes.productIds.includes(tc.expectedId),
      `Query "${tc.query}" (${tc.lang}) matches canonical ID "${tc.expectedId}"`
    );
  }

  // 4. Category Filtering
  console.log('\n--- 4. Testing Category Filtering ---');
  const noodleProducts = filterProducts({
    products: getLocalizedProducts(mockProducts, 'en'),
    params: { category: 'Mie & Pasta' },
  });
  assert(noodleProducts.length === 3, `Category "Mie & Pasta" returns 3 items (got ${noodleProducts.length})`);
  assert(noodleProducts.some((p) => p.id === 'indomie-goreng-spesial'), 'Indomie in Mie & Pasta');
  assert(noodleProducts.some((p) => p.id === 'mie-telur-keriting'), 'Mie Telur in Mie & Pasta');
  assert(noodleProducts.some((p) => p.id === 'sanuki-udon-segar'), 'Sanuki Udon in Mie & Pasta');

  const snackProducts = filterProducts({
    products: getLocalizedProducts(mockProducts, 'en'),
    params: { category: 'Makanan Ringan' },
  });
  assert(snackProducts.length === 2, `Category "Makanan Ringan" returns 2 items (got ${snackProducts.length})`);
  assert(snackProducts.some((p) => p.id === 'biskuit-kelapa-renyah'), 'Coconut biscuits in Makanan Ringan');
  assert(snackProducts.some((p) => p.id === 'biskuit-gandum-madu'), 'Honey digestive in Makanan Ringan');

  const spiceProducts = filterProducts({
    products: getLocalizedProducts(mockProducts, 'en'),
    params: { category: 'Bumbu & Rempah' },
  });
  assert(spiceProducts.length === 6, `Category "Bumbu & Rempah" returns 6 items (got ${spiceProducts.length})`);

  // 5. searchCatalogProducts end-to-end service integration
  console.log('\n--- 5. Testing searchCatalogProducts Service End-to-End ---');
  const e2eUdon = await searchCatalogProducts({ query: 'うどん', locale: 'en' });
  assert(e2eUdon.products.length > 0, 'searchCatalogProducts found results for "うどん"');
  assert(e2eUdon.products[0].id === 'sanuki-udon-segar', 'Top result is "sanuki-udon-segar"');
  assert(e2eUdon.products[0].name === 'Fresh Chewy Sanuki Udon Noodles (3-Pack)', 'Rendered in English name');

  const e2eIndoMie = await searchCatalogProducts({ query: 'noodle', locale: 'id' });
  assert(e2eIndoMie.products.some((p) => p.id === 'indomie-goreng-spesial'), 'Found Indomie in Indonesian locale');

  console.log('='.repeat(70));
  console.log(`ALL TESTS PASSED! (${passed}/${total} assertions)`);
  console.log('='.repeat(70));
}

main().catch((e) => {
  console.error('Test error:', e);
  process.exit(1);
});
