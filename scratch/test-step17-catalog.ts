import { prisma } from '../lib/prisma';
import { adminCatalogService } from '../features/catalog/services/admin-catalog-service';
import { adminCatalogRepository } from '../features/catalog/repositories/admin-catalog-repository';
import { prismaCatalogRepository } from '../features/catalog/repositories/prisma-catalog-repository';
import { adjustInventoryService } from '../features/inventory/services/adjust-inventory-service';
import { generateSlug } from '../features/catalog/domain/slug-generator';
import { normalizeSku, isValidSku } from '../features/catalog/domain/sku-normalizer';
import {
  validateProductStatusTransition,
  validateCategoryStatusTransition,
  InvalidCatalogStateTransitionError,
} from '../features/catalog/domain/catalog-state-machine';
import { createOrderService } from '../features/orders/services/create-order-service';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

async function runStep17Tests() {
  console.log('=== Step 17 Product & Catalog Management Comprehensive Verification ===\n');

  // Test 1: Slug Generator
  console.log('Test Suite 1: Slug Generator');
  assert(generateSlug('Ayam Kampung Segar') === 'ayam-kampung-segar', 'Slug generates lowercased hyphenated string');
  assert(generateSlug('Daging & Unggas!!') === 'daging-unggas', 'Slug strips special punctuation');
  assert(generateSlug('  Multiple   Spaces  ') === 'multiple-spaces', 'Slug handles whitespace collapse');
  assert(generateSlug('café au lait') === 'cafe-au-lait', 'Slug strips accents');

  // Test 2: SKU Normalizer
  console.log('\nTest Suite 2: SKU Normalizer');
  assert(normalizeSku(' rupa-asian-001 ') === 'RUPA-ASIAN-001', 'SKU is uppercased and trimmed');
  assert(normalizeSku('sku@123#test') === 'SKU-123-TEST', 'SKU replaces invalid characters with hyphens');
  assert(isValidSku('RUPA-001') === true, 'Valid SKU passes validation');
  assert(isValidSku('A') === false, 'Short SKU fails validation');

  // Test 3: Catalog State Machine
  console.log('\nTest Suite 3: Catalog State Machine');
  try {
    validateProductStatusTransition('DRAFT', 'ACTIVE');
    assert(true, 'Product transition DRAFT -> ACTIVE permitted');
  } catch (e) {
    assert(false, 'Product transition DRAFT -> ACTIVE failed');
  }

  try {
    validateProductStatusTransition('ACTIVE', 'ARCHIVED');
    assert(true, 'Product transition ACTIVE -> ARCHIVED permitted');
  } catch (e) {
    assert(false, 'Product transition ACTIVE -> ARCHIVED failed');
  }

  try {
    validateProductStatusTransition('ARCHIVED', 'ACTIVE');
    assert(true, 'Product transition ARCHIVED -> ACTIVE (restore) permitted');
  } catch (e) {
    assert(false, 'Product transition ARCHIVED -> ACTIVE failed');
  }

  try {
    validateProductStatusTransition('ARCHIVED', 'DRAFT');
    assert(false, 'ARCHIVED -> DRAFT should have been rejected');
  } catch (e) {
    assert(e instanceof InvalidCatalogStateTransitionError, 'Invalid transition throws InvalidCatalogStateTransitionError');
  }

  try {
    validateCategoryStatusTransition('ACTIVE', 'ARCHIVED');
    assert(true, 'Category transition ACTIVE -> ARCHIVED permitted');
  } catch (e) {
    assert(false, 'Category transition ACTIVE -> ARCHIVED failed');
  }

  // Test 4: Database Product & Category Seeding Verification
  console.log('\nTest Suite 4: Database Catalog Seed Verification');
  const seededProducts = await prisma.product.findMany();
  assert(seededProducts.length >= 8, `At least 8 seeded products exist (found: ${seededProducts.length})`);

  const sampleProduct = seededProducts.find((p) => p.id === 'ayam-kampung-segar');
  assert(!!sampleProduct, 'Product "ayam-kampung-segar" exists');
  assert(sampleProduct?.sku === 'RUPA-ASIAN-001', `Product SKU matches expectation (found: ${sampleProduct?.sku})`);
  assert(sampleProduct?.status === 'ACTIVE', `Product status is ACTIVE (found: ${sampleProduct?.status})`);
  assert(sampleProduct?.currency === 'JPY', `Product currency is JPY (found: ${sampleProduct?.currency})`);

  // Test 5: Category Translations & Active Lookups
  console.log('\nTest Suite 5: Category & Product Public Storefront Filtering');
  const publicCategories = await prismaCatalogRepository.getCategories();
  assert(publicCategories.length >= 4, `Public categories retrieved (count: ${publicCategories.length})`);
  assert(publicCategories[0].id === 'semua', 'Default category "semua" exists at index 0');

  const publicProducts = await prismaCatalogRepository.getProducts();
  assert(publicProducts.every((p) => p.status === 'ACTIVE'), 'All public storefront products have status ACTIVE');

  // Test 6: Admin Catalog Repository
  console.log('\nTest Suite 6: Admin Catalog Repository');
  const adminList = await adminCatalogRepository.listProducts({ status: 'all' });
  assert(adminList.total >= 8, `Admin list returns all products (found: ${adminList.total})`);
  assert(adminList.products[0].availableQty !== undefined, 'Admin list item includes authoritative availableQty');
  assert(adminList.products[0].orderItemCount !== undefined, 'Admin list item includes orderItemCount');

  const adminDetail = await adminCatalogRepository.getProductById('ayam-kampung-segar');
  assert(adminDetail !== null, 'Admin detail retrieved by ID');
  assert(adminDetail?.id === 'ayam-kampung-segar', 'Admin detail matches requested ID');
  assert(adminDetail?.sku === 'RUPA-ASIAN-001', 'Admin detail matches SKU');

  // Test 7: Product Lifecycle & Price History
  console.log('\nTest Suite 7: Product Lifecycle & Price History');
  const testSku = `TEST-CAT-${Date.now()}`;
  const testSlug = `test-item-${Date.now()}`;

  // 7a. Create Product
  const created = await adminCatalogService.createProduct({
    name: 'Test Gourmet Kimchi',
    description: 'Fresh artisanal fermented kimchi',
    categoryId: 'sayuran segar',
    price: 850,
    sku: testSku,
    slug: testSlug,
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c',
    initialStock: 15,
    status: 'ACTIVE',
    translations: {
      en: { name: 'Test Gourmet Kimchi (EN)', description: 'Fresh artisanal fermented kimchi in English' },
      ja: { name: 'テスト用熟成キムチ', description: '本格熟成キムチ' },
    },
    adminUserId: 'admin-tester',
  });

  assert(created.id === testSlug, `Product created with ID: ${created.id}`);
  assert(created.sku === testSku, `Product created with SKU: ${created.sku}`);
  assert(created.status === 'ACTIVE', 'Created product has ACTIVE status');

  // Verify inventory initialized
  const initialInv = await prisma.inventory.findUnique({ where: { productId: created.id } });
  assert(initialInv?.availableQty === 15, `Initial inventory availableQty is 15 (found: ${initialInv?.availableQty})`);

  // Verify initial price history
  const priceHistory1 = await prisma.productPriceHistory.findMany({ where: { productId: created.id } });
  assert(priceHistory1.length === 1, 'Initial price history row created');
  assert(priceHistory1[0].newPrice === 850, 'Initial price history price is 850 JPY');

  // Verify initial audit log
  const auditLogs1 = await prisma.catalogAuditLog.findMany({ where: { entityId: created.id } });
  assert(auditLogs1.length >= 1, 'Catalog audit log created on product creation');
  assert(auditLogs1.some((l) => l.action === 'PRODUCT_CREATED'), 'Audit log contains PRODUCT_CREATED');

  // 7b. Update Price and verify PriceHistory
  const updated = await adminCatalogService.updateProduct({
    productId: created.id,
    price: 920,
    priceChangeReason: 'Raw ingredient cost inflation',
    adminUserId: 'admin-pricing-manager',
  });
  assert(updated.price === 920, 'Product price updated to 920 JPY');

  const priceHistory2 = await prisma.productPriceHistory.findMany({
    where: { productId: created.id },
    orderBy: { createdAt: 'desc' },
  });
  assert(priceHistory2.length === 2, 'New price history row added');
  assert(priceHistory2[0].previousPrice === 850, 'Price history previousPrice is 850');
  assert(priceHistory2[0].newPrice === 920, 'Price history newPrice is 920');
  assert(priceHistory2[0].reason === 'Raw ingredient cost inflation', 'Price change reason accurately recorded');

  // 7c. Archive Product & Customer Visibility Check
  await adminCatalogService.archiveProduct(created.id, 'admin-archiver');
  const archivedProduct = await prisma.product.findUnique({ where: { id: created.id } });
  assert(archivedProduct?.status === 'ARCHIVED', 'Product transitioned to ARCHIVED');
  assert(archivedProduct?.archivedAt !== null, 'Product has non-null archivedAt');

  // Storefront visibility: Archived product must NOT appear in public queries
  const publicFetch = await prismaCatalogRepository.getProductById(created.id);
  assert(publicFetch === undefined, 'Public getProductById returns undefined for ARCHIVED product');

  // Storefront checkout: Archived product must be rejected
  const checkoutResult = await createOrderService({
    items: [{ productId: created.id, quantity: 1 }],
    address: {
      name: 'Test Customer',
      phone: '08123456789',
      address: 'Tokyo Central 1-1',
      city: 'Tokyo',
      postalCode: '100-0001',
    },
    shippingId: 'regular',
    payment: 'DUMMY_PAYMENT',
  });
  assert(checkoutResult.success === false, 'Checkout fails for non-ACTIVE product');
  const checkoutError = (checkoutResult as { success: false; error: string }).error;
  assert(
    checkoutError?.includes('tidak tersedia untuk dibeli') === true,
    `Checkout returns unavailable error message (got: ${checkoutError})`
  );

  // 7d. Restore Product
  await adminCatalogService.restoreProduct(created.id, 'admin-restorer');
  const restoredProduct = await prisma.product.findUnique({ where: { id: created.id } });
  assert(restoredProduct?.status === 'ACTIVE', 'Product restored to ACTIVE');
  assert(restoredProduct?.archivedAt === null, 'Restored product archivedAt cleared');

  // Storefront visibility after restore
  const publicFetchRestored = await prismaCatalogRepository.getProductById(created.id);
  assert(publicFetchRestored !== undefined, 'Public getProductById succeeds for restored ACTIVE product');

  // Test 8: Inventory Adjustment via Service
  console.log('\nTest Suite 8: Authoritative Inventory Adjustment Service');
  const adjResult = await adjustInventoryService.adjustInventory({
    productId: created.id,
    adjustment: 10,
    reason: 'Incoming fresh shipment from supplier',
    adminUserId: 'admin-warehouse',
  });
  assert(adjResult.success === true, 'Stock adjustment (+10) succeeded');
  assert(adjResult.previousAvailableQty === 15, 'Previous availableQty was 15');
  assert(adjResult.newAvailableQty === 25, 'New availableQty is 25');

  // Verify Product.stock synced
  const syncedProduct = await prisma.product.findUnique({ where: { id: created.id } });
  assert(syncedProduct?.stock === 25, 'Product.stock synchronized with availableQty');

  // Verify stock deduction below zero fails
  try {
    await adjustInventoryService.adjustInventory({
      productId: created.id,
      adjustment: -50,
      reason: 'Excessive loss write-off',
    });
    assert(false, 'Should have failed to reduce stock below 0');
  } catch (e: any) {
    assert(e.message.includes('below 0'), 'Stock reduction below 0 rejected with clear error');
  }

  // Test 9: Category Management & Protection
  console.log('\nTest Suite 9: Category Management & Protection');
  const testCatId = `test-cat-${Date.now()}`;
  const testCatSlug = `slug-${testCatId}`;

  const catCreated = await adminCatalogService.createCategory({
    id: testCatId,
    name: 'Specialty Condiments',
    slug: testCatSlug,
    description: 'Sauces and condiments',
    adminUserId: 'admin-cat-manager',
  });
  assert(catCreated.id === testCatId, 'Category created with custom ID');

  // Attempting to delete category that has products must fail
  // Move test product to this category
  await prisma.product.update({
    where: { id: created.id },
    data: { categoryId: testCatId },
  });

  try {
    await adminCatalogService.deleteCategory(testCatId, 'admin-tester');
    assert(false, 'Should prevent deletion of category with assigned products');
  } catch (e: any) {
    assert(e.message.includes('contains 1 products'), 'Deletion of populated category prevented');
  }

  // Archive category
  const archivedCat = await adminCatalogService.archiveCategory(testCatId, 'admin-tester');
  assert(archivedCat.status === 'ARCHIVED', 'Category transitioned to ARCHIVED');

  // Restore category
  const restoredCat = await adminCatalogService.restoreCategory(testCatId, 'admin-tester');
  assert(restoredCat.status === 'ACTIVE', 'Category restored to ACTIVE');

  // Test 10: OrderItem Historical Immutability & Hard Delete Protection
  console.log('\nTest Suite 10: Historical Snapshot Immutability & Delete Protection');
  // Place an order with test product
  const validOrder = await createOrderService({
    items: [{ productId: created.id, quantity: 2 }],
    address: {
      name: 'Taro Yamada',
      phone: '09012345678',
      address: 'Shibuya 1-1',
      city: 'Tokyo',
      postalCode: '150-0002',
    },
    shippingId: 'regular',
    payment: 'DUMMY_PAYMENT',
  });

  assert(validOrder.success === true, 'Order created successfully with test product');
  const successOrder = validOrder as { success: true; order: { id: string } };
  assert(!!successOrder.order?.id, 'Order ID generated');

  // Inspect order item snapshot using publicId or internalId
  const dbOrder = await prisma.order.findUnique({
    where: { publicId: successOrder.order.id },
    include: { items: true },
  });
  assert(!!dbOrder, 'Order found in database');

  const orderItemSnapshot = dbOrder?.items.find((i) => i.productId === created.id);
  assert(orderItemSnapshot?.productPrice === 920, `OrderItem stores price snapshot (920 JPY, found: ${orderItemSnapshot?.productPrice})`);
  assert(orderItemSnapshot?.quantity === 2, 'OrderItem stores quantity snapshot (2)');

  // Now change the product's price again
  await adminCatalogService.updateProduct({
    productId: created.id,
    price: 1500,
    priceChangeReason: 'Luxury tier upgrade',
  });

  // Verify historical OrderItem is COMPLETELY UNTOUCHED
  const verifiedSnapshot = await prisma.orderItem.findFirst({
    where: { orderId: dbOrder!.id, productId: created.id },
  });
  assert(verifiedSnapshot?.productPrice === 920, `Historical OrderItem remains at 920 JPY despite product price change to 1500 JPY (found: ${verifiedSnapshot?.productPrice})`);

  // Attempting to hard-delete product with historical order items MUST FAIL
  try {
    await adminCatalogService.deleteProduct(created.id, 'admin-tester');
    assert(false, 'Should prevent deletion of product with order items');
  } catch (e: any) {
    assert(e.message.includes('historical order items'), 'Hard deletion rejected with clear explanation that archival is required');
  }

  // Cleanup: Delete test order and its dependencies, then clean up test product and test category
  await prisma.inventoryReservation.deleteMany({ where: { orderId: dbOrder!.id } });
  await prisma.payment.deleteMany({ where: { orderId: dbOrder!.id } });
  await prisma.orderStatusHistory.deleteMany({ where: { orderId: dbOrder!.id } });
  await prisma.orderItem.deleteMany({ where: { orderId: dbOrder!.id } });
  await prisma.order.deleteMany({ where: { id: dbOrder!.id } });

  // Now delete test product
  await adminCatalogService.deleteProduct(created.id, 'admin-tester');
  const deletedCheck = await prisma.product.findUnique({ where: { id: created.id } });
  assert(deletedCheck === null, 'Product cleanly deleted after order items cleaned');

  // Now delete test category
  await adminCatalogService.deleteCategory(testCatId, 'admin-tester');
  const deletedCatCheck = await prisma.category.findUnique({ where: { id: testCatId } });
  assert(deletedCatCheck === null, 'Category cleanly deleted once empty');

  console.log(`\n========================================`);
  console.log(`Step 17 Verification Complete: ${passed} passed, ${failed} failed.`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runStep17Tests()
  .catch((e) => {
    console.error('Test execution failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
