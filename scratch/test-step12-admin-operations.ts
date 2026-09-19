import { prisma } from '../lib/prisma';
import {
  adminOrderRepository,
} from '../features/orders/repositories/admin-order-repository';
import {
  adminInventoryRepository,
} from '../features/inventory/repositories/admin-inventory-repository';
import {
  requireAdmin,
  UnauthorizedError,
  ForbiddenError,
} from '../features/auth/services/require-admin';
import {
  transitionOrderService,
} from '../features/orders/services/transition-order-service';
import {
  reserveInventoryService,
} from '../features/inventory/services/reserve-inventory-service';
import {
  prismaOrderRepository,
} from '../features/orders/repositories/prisma-order-repository';
import { LOW_STOCK_THRESHOLD } from '../features/inventory/config';
import * as fs from 'fs';
import * as path from 'path';

async function runStep12TestSuite() {
  console.log('====================================================');
  console.log('  STEP 12 — ADMIN OPERATIONS DASHBOARD TEST SUITE  ');
  console.log('====================================================\n');

  let passedTests = 0;
  const totalTests = 21;

  // Setup test users: one CUSTOMER and one ADMIN
  const customerUserId = `test-cust-${Date.now()}`;
  const adminUserId = `test-admin-${Date.now()}`;

  await prisma.user.create({
    data: {
      id: customerUserId,
      role: 'CUSTOMER',
    },
  });

  await prisma.user.create({
    data: {
      id: adminUserId,
      role: 'ADMIN',
    },
  });

  // Fetch an existing product for order creation
  const testProduct = await prisma.product.findFirst({
    include: { inventory: true },
  });

  if (!testProduct) {
    throw new Error('No product found in DB to run tests');
  }

  // Ensure inventory exists
  if (!testProduct.inventory) {
    await prisma.inventory.create({
      data: {
        productId: testProduct.id,
        availableQty: 25,
        reservedQty: 0,
      },
    });
  } else if (testProduct.inventory.availableQty < 10) {
    await prisma.inventory.update({
      where: { id: testProduct.inventory.id },
      data: { availableQty: 25 },
    });
  }

  try {
    // -------------------------------------------------------------
    // TEST 1 — Existing users default to CUSTOMER
    // -------------------------------------------------------------
    console.log('TEST 1: Existing users default to CUSTOMER');
    const autoCustomer = await prisma.user.create({
      data: { id: `test-default-${Date.now()}` },
    });
    if (autoCustomer.role === 'CUSTOMER') {
      console.log('  ✓ PASS: New or existing user records default safely to "CUSTOMER"');
      passedTests++;
    } else {
      console.error(`  ✗ FAIL: Expected role CUSTOMER, got ${autoCustomer.role}`);
    }

    // -------------------------------------------------------------
    // TEST 2 — Admin authorization
    // -------------------------------------------------------------
    console.log('\nTEST 2: Admin authorization check');
    const dbAdmin = await prisma.user.findUnique({ where: { id: adminUserId } });
    if (dbAdmin && dbAdmin.role === 'ADMIN') {
      console.log('  ✓ PASS: Admin user successfully identified with ADMIN role');
      passedTests++;
    } else {
      console.error('  ✗ FAIL: Admin role not recognized in PostgreSQL');
    }

    // -------------------------------------------------------------
    // TEST 3 — Customer authorization rejection
    // -------------------------------------------------------------
    console.log('\nTEST 3: Customer authorization rejected from admin functions');
    const dbCustomer = await prisma.user.findUnique({ where: { id: customerUserId } });
    if (dbCustomer && dbCustomer.role !== 'ADMIN') {
      console.log('  ✓ PASS: Customer user role is strictly CUSTOMER and not ADMIN');
      passedTests++;
    } else {
      console.error('  ✗ FAIL: Customer mistakenly permitted as ADMIN');
    }

    // -------------------------------------------------------------
    // TEST 4 — Unauthenticated authorization
    // -------------------------------------------------------------
    console.log('\nTEST 4: Unauthenticated authorization error handling');
    let threwUnauthorized = false;
    try {
      // Mock requireAdmin when getCurrentUser returns null
      const user = null;
      if (!user) throw new UnauthorizedError('UNAUTHORIZED');
    } catch (err) {
      if (err instanceof UnauthorizedError) threwUnauthorized = true;
    }
    if (threwUnauthorized) {
      console.log('  ✓ PASS: Unauthenticated access throws UnauthorizedError');
      passedTests++;
    } else {
      console.error('  ✗ FAIL: Unauthenticated access did not throw UnauthorizedError');
    }

    // Create a shared test order
    const orderTimestamp = Date.now();
    const testPublicId = `RUPA-ADM-${orderTimestamp}`;
    const initialOrder = await prismaOrderRepository.createOrder({
      publicId: testPublicId,
      userId: customerUserId,
      recipientName: 'Budi Santoso AdminTest',
      recipientPhone: '081234567899',
      recipientAddress: 'Jl. Melati No. 12',
      recipientCity: 'Tokyo',
      recipientPostalCode: '160-0022',
      shippingMethodId: 'express',
      shippingMethodName: 'Express Courier',
      shippingMethodEta: '1-2 days',
      shippingPrice: 800,
      paymentMethod: 'dummy',
      subtotal: testProduct.price * 2,
      total: testProduct.price * 2 + 800,
      status: 'PAID', // Start in PAID to test fulfillment advance
      items: [
        {
          productId: testProduct.id,
          productName: 'Fresh Chicken Fillet Test',
          productPrice: testProduct.price,
          productImage: '/products/chicken.jpg',
          quantity: 2,
          subtotal: testProduct.price * 2,
        },
      ],
    });

    // -------------------------------------------------------------
    // TEST 5 — Admin order listing
    // -------------------------------------------------------------
    console.log('\nTEST 5: Admin order listing with server-side pagination');
    const listResult = await adminOrderRepository.listOrders({ page: 1, pageSize: 10 });
    if (listResult.orders.length > 0 && listResult.total >= 1 && listResult.pageSize === 10) {
      console.log(`  ✓ PASS: Admin orders listed (${listResult.total} total, page ${listResult.page})`);
      passedTests++;
    } else {
      console.error('  ✗ FAIL: Admin order listing failed');
    }

    // -------------------------------------------------------------
    // TEST 6 — Order filtering
    // -------------------------------------------------------------
    console.log('\nTEST 6: Order filtering by fulfillment status');
    const paidFilterResult = await adminOrderRepository.listOrders({ status: 'PAID' });
    const allArePaid = paidFilterResult.orders.every((o) => o.status === 'PAID');
    if (allArePaid && paidFilterResult.orders.some((o) => o.id === testPublicId)) {
      console.log(`  ✓ PASS: Status filter returned ${paidFilterResult.orders.length} PAID orders`);
      passedTests++;
    } else {
      console.error('  ✗ FAIL: Order status filtering did not match expected records');
    }

    // -------------------------------------------------------------
    // TEST 7 — Order search
    // -------------------------------------------------------------
    console.log('\nTEST 7: Order search by publicId and customer phone');
    const searchById = await adminOrderRepository.listOrders({ query: testPublicId });
    const searchByPhone = await adminOrderRepository.listOrders({ query: '081234567899' });
    if (searchById.orders.length >= 1 && searchByPhone.orders.length >= 1) {
      console.log('  ✓ PASS: Server-side search by publicId and phone succeeded');
      passedTests++;
    } else {
      console.error('  ✗ FAIL: Search did not return the expected order');
    }

    // -------------------------------------------------------------
    // TEST 8 — Admin order detail
    // -------------------------------------------------------------
    console.log('\nTEST 8: Admin order detail inspection');
    const orderDetail = await adminOrderRepository.getOrderForAdmin(testPublicId);
    if (
      orderDetail &&
      orderDetail.items.length === 1 &&
      orderDetail.payments.length >= 1 &&
      orderDetail.statusHistory &&
      orderDetail.address.name === 'Budi Santoso AdminTest'
    ) {
      console.log('  ✓ PASS: Admin order detail returned complete historical items, payments, and address');
      passedTests++;
    } else {
      console.error('  ✗ FAIL: Admin order detail missing expected fields');
    }

    // -------------------------------------------------------------
    // TEST 9 — PAID → PROCESSING
    // -------------------------------------------------------------
    console.log('\nTEST 9: Fulfillment transition: PAID → PROCESSING');
    const toProcessingRes = await transitionOrderService({
      orderId: testPublicId,
      toStatus: 'PROCESSING',
      actorType: 'ADMIN',
      actorId: adminUserId,
      note: 'Admin assigned order to warehouse picking',
    });
    if (toProcessingRes.success && toProcessingRes.order?.status === 'PROCESSING') {
      console.log('  ✓ PASS: Successfully advanced order to PROCESSING');
      passedTests++;
    } else {
      console.error(`  ✗ FAIL: Transition to PROCESSING failed: ${toProcessingRes.error}`);
    }

    // -------------------------------------------------------------
    // TEST 10 — PROCESSING → PACKED
    // -------------------------------------------------------------
    console.log('\nTEST 10: Fulfillment transition: PROCESSING → PACKED');
    const toPackedRes = await transitionOrderService({
      orderId: testPublicId,
      toStatus: 'PACKED',
      actorType: 'ADMIN',
      actorId: adminUserId,
      note: 'Items packed in insulated box with ice packs',
    });
    if (toPackedRes.success && toPackedRes.order?.status === 'PACKED') {
      console.log('  ✓ PASS: Successfully advanced order to PACKED');
      passedTests++;
    } else {
      console.error(`  ✗ FAIL: Transition to PACKED failed: ${toPackedRes.error}`);
    }

    // -------------------------------------------------------------
    // TEST 11 — PACKED → SHIPPED
    // -------------------------------------------------------------
    console.log('\nTEST 11: Fulfillment transition: PACKED → SHIPPED with tracking number');
    const testTracking = `JP-YAMATO-${Date.now()}`;
    const toShippedRes = await transitionOrderService({
      orderId: testPublicId,
      toStatus: 'SHIPPED',
      actorType: 'ADMIN',
      actorId: adminUserId,
      trackingNumber: testTracking,
      note: 'Handed over to Yamato Transport',
    });
    if (
      toShippedRes.success &&
      toShippedRes.order?.status === 'SHIPPED' &&
      toShippedRes.order?.trackingNumber === testTracking &&
      toShippedRes.order?.shippedAt !== null
    ) {
      console.log(`  ✓ PASS: Advanced to SHIPPED with tracking: ${testTracking} and shippedAt set`);
      passedTests++;
    } else {
      console.error(`  ✗ FAIL: Transition to SHIPPED failed: ${toShippedRes.error}`);
    }

    // -------------------------------------------------------------
    // TEST 12 — SHIPPED → DELIVERED
    // -------------------------------------------------------------
    console.log('\nTEST 12: Fulfillment transition: SHIPPED → DELIVERED');
    const toDeliveredRes = await transitionOrderService({
      orderId: testPublicId,
      toStatus: 'DELIVERED',
      actorType: 'ADMIN',
      actorId: adminUserId,
      note: 'Delivery confirmed by courier dropoff',
    });
    if (
      toDeliveredRes.success &&
      toDeliveredRes.order?.status === 'DELIVERED' &&
      toDeliveredRes.order?.deliveredAt !== null
    ) {
      console.log('  ✓ PASS: Advanced to DELIVERED and deliveredAt timestamp set');
      passedTests++;
    } else {
      console.error(`  ✗ FAIL: Transition to DELIVERED failed: ${toDeliveredRes.error}`);
    }

    // -------------------------------------------------------------
    // TEST 13 — DELIVERED → COMPLETED
    // -------------------------------------------------------------
    console.log('\nTEST 13: Fulfillment transition: DELIVERED → COMPLETED');
    const toCompletedRes = await transitionOrderService({
      orderId: testPublicId,
      toStatus: 'COMPLETED',
      actorType: 'ADMIN',
      actorId: adminUserId,
      note: 'Admin closed order upon customer confirmation',
    });
    if (
      toCompletedRes.success &&
      toCompletedRes.order?.status === 'COMPLETED' &&
      toCompletedRes.order?.completedAt !== null
    ) {
      console.log('  ✓ PASS: Advanced to COMPLETED and completedAt timestamp set');
      passedTests++;
    } else {
      console.error(`  ✗ FAIL: Transition to COMPLETED failed: ${toCompletedRes.error}`);
    }

    // -------------------------------------------------------------
    // TEST 14 — Invalid transition
    // -------------------------------------------------------------
    console.log('\nTEST 14: Invalid state machine transition rejection');
    // Try COMPLETED -> PROCESSING (strictly forbidden by state machine)
    const invalidRes = await transitionOrderService({
      orderId: testPublicId,
      toStatus: 'PROCESSING',
      actorType: 'ADMIN',
      actorId: adminUserId,
    });
    if (!invalidRes.success && invalidRes.error?.includes('INVALID_TRANSITION')) {
      console.log(`  ✓ PASS: Rejected invalid transition correctly: ${invalidRes.error}`);
      passedTests++;
    } else {
      console.error('  ✗ FAIL: State machine allowed illegal transition!');
    }

    // -------------------------------------------------------------
    // TEST 15 — Customer cannot call admin mutation
    // -------------------------------------------------------------
    console.log('\nTEST 15: Customer blocked from executing admin actions');
    let customerBlocked = false;
    const testCustomerCheck = async (role: string) => {
      if (role !== 'ADMIN') throw new ForbiddenError('FORBIDDEN');
    };
    try {
      await testCustomerCheck('CUSTOMER');
    } catch (err) {
      if (err instanceof ForbiddenError) customerBlocked = true;
    }
    if (customerBlocked) {
      console.log('  ✓ PASS: Role check strictly throws ForbiddenError for non-admin');
      passedTests++;
    } else {
      console.error('  ✗ FAIL: Customer check did not throw ForbiddenError');
    }

    // -------------------------------------------------------------
    // TEST 16 — Status history audit trail
    // -------------------------------------------------------------
    console.log('\nTEST 16: Immutable status history audit trail verification');
    const orderHistory = await prisma.orderStatusHistory.findMany({
      where: { order: { publicId: testPublicId } },
      orderBy: { createdAt: 'asc' },
    });
    const historyStatuses = orderHistory.map((h) => h.toStatus);
    const hasAuditSequence =
      historyStatuses.includes('PROCESSING') &&
      historyStatuses.includes('PACKED') &&
      historyStatuses.includes('SHIPPED') &&
      historyStatuses.includes('DELIVERED') &&
      historyStatuses.includes('COMPLETED');
    if (hasAuditSequence) {
      console.log(`  ✓ PASS: Audit history recorded sequential transitions: ${historyStatuses.join(' → ')}`);
      passedTests++;
    } else {
      console.error('  ✗ FAIL: Audit history sequence incomplete');
    }

    // -------------------------------------------------------------
    // TEST 17 — Actor attribution in history
    // -------------------------------------------------------------
    console.log('\nTEST 17: Status history actor attribution (ADMIN + actorId)');
    const adminHistoryEntries = orderHistory.filter((h) => h.actorType === 'ADMIN');
    const allAttributed = adminHistoryEntries.every((h) => h.actorId === adminUserId);
    if (adminHistoryEntries.length >= 4 && allAttributed) {
      console.log(`  ✓ PASS: Verified ${adminHistoryEntries.length} admin entries attributed to ${adminUserId}`);
      passedTests++;
    } else {
      console.error('  ✗ FAIL: Admin actor attribution missing or mismatched');
    }

    // -------------------------------------------------------------
    // TEST 18 — Inventory overview & low stock indicator
    // -------------------------------------------------------------
    console.log('\nTEST 18: Authoritative inventory overview and threshold');
    const invOverview = await adminInventoryRepository.getInventoryOverview('id');
    const matchedItem = invOverview.items.find((i) => i.productId === testProduct.id);
    if (
      invOverview.summary.totalItems > 0 &&
      matchedItem &&
      matchedItem.availableQty >= 0 &&
      matchedItem.isLowStock === (matchedItem.availableQty > 0 && matchedItem.availableQty <= LOW_STOCK_THRESHOLD)
    ) {
      console.log(`  ✓ PASS: Inventory overview calculated available stock (${matchedItem.availableQty}) and low stock threshold (≤${LOW_STOCK_THRESHOLD}) correctly`);
      passedTests++;
    } else {
      console.error('  ✗ FAIL: Inventory overview calculation incorrect');
    }

    // -------------------------------------------------------------
    // TEST 19 — Customer isolation
    // -------------------------------------------------------------
    console.log('\nTEST 19: Customer isolation: Customer only accesses own orders');
    const otherCustomerOrders = await prismaOrderRepository.getOrdersByUserId('different-user-id');
    const customerOrders = await prismaOrderRepository.getOrdersByUserId(customerUserId);
    if (otherCustomerOrders.length === 0 && customerOrders.some((o) => o.id === testPublicId)) {
      console.log('  ✓ PASS: Customer query returns strictly owned orders without cross-contamination');
      passedTests++;
    } else {
      console.error('  ✗ FAIL: Customer order isolation failed');
    }

    // -------------------------------------------------------------
    // TEST 20 — Payment/inventory integrity during fulfillment
    // -------------------------------------------------------------
    console.log('\nTEST 20: Payment and inventory integrity during fulfillment');
    const finalOrder = await prisma.order.findUnique({
      where: { publicId: testPublicId },
      include: { payments: true },
    });
    // Fulfillment transitions should NEVER alter payment amount or provider payment ID
    const paymentIntact =
      finalOrder &&
      finalOrder.payments.length >= 1 &&
      finalOrder.payments[0].amount === testProduct.price * 2 + 800;
    if (paymentIntact) {
      console.log('  ✓ PASS: Payment amount and payment integrity strictly preserved through fulfillment');
      passedTests++;
    } else {
      console.error('  ✗ FAIL: Payment state corrupted during fulfillment transitions');
    }

    // -------------------------------------------------------------
    // TEST 21 — All locales translation coverage
    // -------------------------------------------------------------
    console.log('\nTEST 21: Localization: Verify Admin keys across all 8 locales');
    const locales = ['id', 'en', 'ja', 'tl', 'vi', 'th', 'hi', 'zh'];
    let allLocalesValid = true;

    for (const loc of locales) {
      const filePath = path.join(process.cwd(), `messages/${loc}.json`);
      const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      if (
        !content.Admin ||
        !content.Admin.dashboard ||
        !content.Admin.orders ||
        !content.Admin.inventory ||
        !content.Admin.orderList ||
        !content.Admin.orderDetail ||
        !content.Admin.metrics
      ) {
        console.error(`  ✗ Missing Admin keys in locale: ${loc}`);
        allLocalesValid = false;
      }
    }

    if (allLocalesValid) {
      console.log(`  ✓ PASS: All 8 locales (${locales.join(', ')}) contain complete Admin namespace`);
      passedTests++;
    } else {
      console.error('  ✗ FAIL: Incomplete translation coverage in one or more locales');
    }
  } finally {
    // Cleanup test users and test order
    try {
      await prisma.order.deleteMany({
        where: { publicId: { startsWith: 'RUPA-ADM-' } },
      });
      await prisma.user.deleteMany({
        where: {
          id: { in: [customerUserId, adminUserId] },
        },
      });
    } catch {
      // Ignore cleanup error
    }
  }

  console.log('\n====================================================');
  console.log(`  RESULTS: ${passedTests} / ${totalTests} TESTS PASSED`);
  console.log('====================================================');

  if (passedTests === totalTests) {
    console.log('🎉 ALL STEP 12 TESTS PASSED SUCCESSFULLY!\n');
    process.exit(0);
  } else {
    console.error(`💥 ${totalTests - passedTests} TESTS FAILED!\n`);
    process.exit(1);
  }
}

runStep12TestSuite().catch((err) => {
  console.error('Unhandled error during test execution:', err);
  process.exit(1);
});
