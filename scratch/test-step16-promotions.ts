import { prisma } from '../lib/prisma';
import { normalizeCouponCode } from '../features/promotions/domain/coupon-normalizer';
import { allocateDiscountAcrossItems } from '../features/promotions/domain/promotion-allocator';
import { promotionEngine } from '../features/promotions/services/promotion-engine';
import { adminPromotionService } from '../features/promotions/services/admin-promotion-service';
import { createOrderService } from '../features/orders/services/create-order-service';
import { cancellationService } from '../features/cancellations/services/cancellation-service';
import { returnService } from '../features/returns/services/return-service';
import { getProductByIdSync } from '../features/catalog';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`✅ ${message}`);
}

async function runStep16Tests() {
  console.log('================================================================');
  console.log('STEP 16: PROMOTIONS & COUPONS - COMPREHENSIVE VERIFICATION SUITE');
  console.log('================================================================\n');

  let passed = 0;

  // -------------------------------------------------------------
  // TEST SUITE 1: COUPON NORMALIZATION
  // -------------------------------------------------------------
  console.log('--- SUITE 1: COUPON NORMALIZATION ---');
  assert(normalizeCouponCode('save10') === 'SAVE10', 'Normalizes lowercase to uppercase');
  assert(normalizeCouponCode('  disCount20  ') === 'DISCOUNT20', 'Trims whitespace');
  assert(normalizeCouponCode('') === '', 'Empty string returns empty');
  assert(normalizeCouponCode(null) === '', 'Null returns empty');
  assert(normalizeCouponCode(undefined) === '', 'Undefined returns empty');
  passed += 5;

  // -------------------------------------------------------------
  // TEST SUITE 2: INTEGER PROPORTIONAL ALLOCATION DOMAIN LOGIC
  // -------------------------------------------------------------
  console.log('\n--- SUITE 2: INTEGER PROPORTIONAL DISCOUNT ALLOCATION ---');

  // Test 2a: 3 items of equal price (1,000 yen each), 100 yen discount
  // Floor allocations: floor(100 * 1000 / 3000) = 33. Total = 99. Remainder = 1 distributed.
  const itemsEqual = [
    { productId: 'p1', categoryId: 'c1', quantity: 1, price: 1000, subtotal: 1000 },
    { productId: 'p2', categoryId: 'c1', quantity: 1, price: 1000, subtotal: 1000 },
    { productId: 'p3', categoryId: 'c1', quantity: 1, price: 1000, subtotal: 1000 },
  ];
  const allocEqual = allocateDiscountAcrossItems(itemsEqual, new Set([0, 1, 2]), 100);
  const sumEqual = allocEqual.reduce((sum, a) => sum + a.discountAllocation, 0);
  assert(sumEqual === 100, `Sum of equal allocations is exactly 100 (got ${sumEqual})`);
  assert(
    allocEqual.every((a) => a.discountAllocation >= 33 && a.discountAllocation <= 34),
    'Allocations distributed fairly (33, 33, 34)'
  );

  // Test 2b: Unequal items: 1000 and 3000, total = 4000. Discount = 200 (5%).
  // 1000 => 50, 3000 => 150.
  const itemsUnequal = [
    { productId: 'p1', categoryId: 'c1', quantity: 1, price: 1000, subtotal: 1000 },
    { productId: 'p2', categoryId: 'c1', quantity: 1, price: 3000, subtotal: 3000 },
  ];
  const allocUnequal = allocateDiscountAcrossItems(itemsUnequal, new Set([0, 1]), 200);
  assert(allocUnequal[0].discountAllocation === 50, 'Item 1 receives 50 yen');
  assert(allocUnequal[1].discountAllocation === 150, 'Item 2 receives 150 yen');
  assert(allocUnequal[0].discountAllocation + allocUnequal[1].discountAllocation === 200, 'Sum matches 200');

  // Test 2c: Ineligible items receive 0 allocation
  const itemsFiltered = [
    { productId: 'p1', categoryId: 'c1', quantity: 1, price: 1500, subtotal: 1500 },
    { productId: 'p2', categoryId: 'c2', quantity: 1, price: 2500, subtotal: 2500 },
  ];
  const allocFiltered = allocateDiscountAcrossItems(itemsFiltered, new Set([0]), 300);
  assert(allocFiltered[0].discountAllocation === 300, 'Eligible item receives full 300 discount');
  assert(allocFiltered[1].discountAllocation === 0, 'Ineligible item receives 0 discount');

  // Test 2d: Discount capped at eligible subtotal (never exceed subtotal)
  const allocCapped = allocateDiscountAcrossItems(itemsFiltered, new Set([0]), 2000);
  assert(allocCapped[0].discountAllocation === 1500, 'Discount capped at item subtotal 1500');
  passed += 7;

  // -------------------------------------------------------------
  // TEST SUITE 3: PROMOTION ENGINE VALIDATION RULES
  // -------------------------------------------------------------
  console.log('\n--- SUITE 3: PROMOTION ENGINE VALIDATION & RULES ---');

  const now = new Date();
  const past = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const farFuture = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);

  // Clean up any test promotions from previous runs
  await prisma.promotionUsage.deleteMany({
    where: { promotion: { code: { startsWith: 'TEST_' } } },
  });
  await prisma.promotion.deleteMany({
    where: { code: { startsWith: 'TEST_' } },
  });

  // Create test promotions
  const promoPercent = await prisma.promotion.create({
    data: {
      code: 'TEST_PERCENT_20',
      name: '20% Off Test',
      type: 'PERCENTAGE',
      value: 20,
      scope: 'ORDER',
      minOrderAmount: 1000,
      startsAt: past,
      expiresAt: future,
      isActive: true,
    },
  });

  const promoFixed = await prisma.promotion.create({
    data: {
      code: 'TEST_FIXED_500',
      name: '¥500 Off Test',
      type: 'FIXED_AMOUNT',
      value: 500,
      scope: 'ORDER',
      minOrderAmount: 2000,
      startsAt: past,
      expiresAt: future,
      isActive: true,
    },
  });

  const promoCapped = await prisma.promotion.create({
    data: {
      code: 'TEST_CAPPED_50',
      name: '50% Off Max ¥300',
      type: 'PERCENTAGE',
      value: 50,
      scope: 'ORDER',
      maxDiscountAmount: 300,
      minOrderAmount: 0,
      startsAt: past,
      expiresAt: future,
      isActive: true,
    },
  });

  const promoInactive = await prisma.promotion.create({
    data: {
      code: 'TEST_INACTIVE',
      name: 'Inactive Promo',
      type: 'PERCENTAGE',
      value: 10,
      scope: 'ORDER',
      startsAt: past,
      expiresAt: future,
      isActive: false,
    },
  });

  const promoExpired = await prisma.promotion.create({
    data: {
      code: 'TEST_EXPIRED',
      name: 'Expired Promo',
      type: 'PERCENTAGE',
      value: 10,
      scope: 'ORDER',
      startsAt: past,
      expiresAt: past,
      isActive: true,
    },
  });

  const promoFuture = await prisma.promotion.create({
    data: {
      code: 'TEST_FUTURE',
      name: 'Future Promo',
      type: 'PERCENTAGE',
      value: 10,
      scope: 'ORDER',
      startsAt: future,
      expiresAt: farFuture,
      isActive: true,
    },
  });

  // Test 3a: Non-existent coupon
  const resNotFound = await promotionEngine.validateAndCalculateDiscount('DOES_NOT_EXIST', [
    { productId: 'p1', categoryId: 'c1', quantity: 1, price: 1500, subtotal: 1500 },
  ]);
  assert(!resNotFound.valid, 'Non-existent coupon returns invalid');
  assert(resNotFound.errorCode === 'PROMOTION_NOT_FOUND', 'Correct error code PROMOTION_NOT_FOUND');

  // Test 3b: Inactive coupon
  const resInactive = await promotionEngine.validateAndCalculateDiscount('TEST_INACTIVE', [
    { productId: 'p1', categoryId: 'c1', quantity: 1, price: 1500, subtotal: 1500 },
  ]);
  assert(!resInactive.valid, 'Inactive coupon returns invalid');
  assert(resInactive.errorCode === 'PROMOTION_INACTIVE', 'Correct error code PROMOTION_INACTIVE');

  // Test 3c: Expired coupon
  const resExpired = await promotionEngine.validateAndCalculateDiscount('TEST_EXPIRED', [
    { productId: 'p1', categoryId: 'c1', quantity: 1, price: 1500, subtotal: 1500 },
  ]);
  assert(!resExpired.valid, 'Expired coupon returns invalid');
  assert(resExpired.errorCode === 'PROMOTION_EXPIRED', 'Correct error code PROMOTION_EXPIRED');

  // Test 3d: Future coupon
  const resFuture = await promotionEngine.validateAndCalculateDiscount('TEST_FUTURE', [
    { productId: 'p1', categoryId: 'c1', quantity: 1, price: 1500, subtotal: 1500 },
  ]);
  assert(!resFuture.valid, 'Future coupon returns invalid');
  assert(resFuture.errorCode === 'PROMOTION_NOT_STARTED', 'Correct error code PROMOTION_NOT_STARTED');

  // Test 3e: Min order amount not met
  const resMinNotMet = await promotionEngine.validateAndCalculateDiscount('TEST_FIXED_500', [
    { productId: 'p1', categoryId: 'c1', quantity: 1, price: 1200, subtotal: 1200 }, // min is 2000
  ]);
  assert(!resMinNotMet.valid, 'Below min order amount returns invalid');
  assert(resMinNotMet.errorCode === 'MIN_ORDER_NOT_MET', 'Correct error code MIN_ORDER_NOT_MET');

  // Test 3f: Valid percentage discount calculation: 20% on 3000 = 600
  const resValidPercent = await promotionEngine.validateAndCalculateDiscount('TEST_PERCENT_20', [
    { productId: 'p1', categoryId: 'c1', quantity: 1, price: 3000, subtotal: 3000 },
  ]);
  assert(resValidPercent.valid, 'Valid percentage coupon accepted');
  assert(resValidPercent.discountAmount === 600, `Discount is 600 (got ${resValidPercent.discountAmount})`);

  // Test 3g: Valid fixed discount: ¥500 on 2500
  const resValidFixed = await promotionEngine.validateAndCalculateDiscount('TEST_FIXED_500', [
    { productId: 'p1', categoryId: 'c1', quantity: 1, price: 2500, subtotal: 2500 },
  ]);
  assert(resValidFixed.valid, 'Valid fixed discount coupon accepted');
  assert(resValidFixed.discountAmount === 500, `Discount is 500 (got ${resValidFixed.discountAmount})`);

  // Test 3h: Max discount amount cap: 50% on 2000 = 1000, capped at 300
  const resCapped = await promotionEngine.validateAndCalculateDiscount('TEST_CAPPED_50', [
    { productId: 'p1', categoryId: 'c1', quantity: 1, price: 2000, subtotal: 2000 },
  ]);
  assert(resCapped.valid, 'Capped coupon accepted');
  assert(resCapped.discountAmount === 300, `Discount capped at 300 (got ${resCapped.discountAmount})`);
  passed += 14;

  // -------------------------------------------------------------
  // TEST SUITE 4: SCOPED PROMOTIONS (CATEGORY & PRODUCT)
  // -------------------------------------------------------------
  console.log('\n--- SUITE 4: SCOPED PROMOTIONS (CATEGORY & PRODUCT) ---');

  // Find a category and product from database
  const sampleProduct = await prisma.product.findFirst({
    include: { category: true },
  });
  assert(!!sampleProduct, 'Sample product found in database');

  const promoCat = await prisma.promotion.create({
    data: {
      code: 'TEST_CAT_PROMO',
      name: 'Category Promo',
      type: 'PERCENTAGE',
      value: 15,
      scope: 'CATEGORY',
      targetCategoryId: sampleProduct!.categoryId,
      startsAt: past,
      expiresAt: future,
      isActive: true,
    },
  });

  const promoProd = await prisma.promotion.create({
    data: {
      code: 'TEST_PROD_PROMO',
      name: 'Product Promo',
      type: 'FIXED_AMOUNT',
      value: 200,
      scope: 'PRODUCT',
      targetProductId: sampleProduct!.id,
      startsAt: past,
      expiresAt: future,
      isActive: true,
    },
  });

  // Test with matching item
  const resCatMatch = await promotionEngine.validateAndCalculateDiscount('TEST_CAT_PROMO', [
    { productId: sampleProduct!.id, categoryId: sampleProduct!.categoryId, quantity: 1, price: 1000, subtotal: 1000 },
    { productId: 'other-p', categoryId: 'other-cat', quantity: 1, price: 1000, subtotal: 1000 },
  ]);
  assert(resCatMatch.valid, 'Category promo valid for matching item');
  assert(resCatMatch.discountAmount === 150, 'Discount computed only on eligible category (15% of 1000 = 150)');
  assert(resCatMatch.itemAllocations[0].discountAllocation === 150, 'Matching item receives 150 discount');
  assert(resCatMatch.itemAllocations[1].discountAllocation === 0, 'Non-matching item receives 0 discount');

  // Test with no matching items in cart
  const resCatNoMatch = await promotionEngine.validateAndCalculateDiscount('TEST_CAT_PROMO', [
    { productId: 'other-p', categoryId: 'other-cat', quantity: 1, price: 1000, subtotal: 1000 },
  ]);
  assert(!resCatNoMatch.valid, 'Category promo invalid when no items match category');
  assert(resCatNoMatch.errorCode === 'NO_ELIGIBLE_ITEMS', 'Returns NO_ELIGIBLE_ITEMS error code');

  // Test product scope
  const resProdMatch = await promotionEngine.validateAndCalculateDiscount('TEST_PROD_PROMO', [
    { productId: sampleProduct!.id, categoryId: sampleProduct!.categoryId, quantity: 1, price: 1000, subtotal: 1000 },
    { productId: 'other-p', categoryId: sampleProduct!.categoryId, quantity: 1, price: 1000, subtotal: 1000 },
  ]);
  assert(resProdMatch.valid, 'Product promo valid for matching product');
  assert(resProdMatch.discountAmount === 200, 'Discount is ¥200');
  assert(resProdMatch.itemAllocations[0].discountAllocation === 200, 'Matching product gets 200');
  assert(resProdMatch.itemAllocations[1].discountAllocation === 0, 'Other product gets 0');
  passed += 9;

  // -------------------------------------------------------------
  // TEST SUITE 5: USAGE LIMITS & CONCURRENCY
  // -------------------------------------------------------------
  console.log('\n--- SUITE 5: USAGE LIMITS & CONCURRENCY ---');

  const promoLimited = await prisma.promotion.create({
    data: {
      code: 'TEST_LIMITED_USAGE',
      name: 'Limited to 2 Uses',
      type: 'FIXED_AMOUNT',
      value: 100,
      scope: 'ORDER',
      usageLimit: 2,
      usageCount: 0,
      startsAt: past,
      expiresAt: future,
      isActive: true,
    },
  });

  // Check before reaching limit
  const resLimBefore = await promotionEngine.validateAndCalculateDiscount('TEST_LIMITED_USAGE', [
    { productId: 'p1', categoryId: 'c1', quantity: 1, price: 1000, subtotal: 1000 },
  ]);
  assert(resLimBefore.valid, 'Coupon valid when usageCount (0) < usageLimit (2)');

  // Fake increment usageCount to 2
  await prisma.promotion.update({
    where: { id: promoLimited.id },
    data: { usageCount: 2 },
  });

  const resLimAfter = await promotionEngine.validateAndCalculateDiscount('TEST_LIMITED_USAGE', [
    { productId: 'p1', categoryId: 'c1', quantity: 1, price: 1000, subtotal: 1000 },
  ]);
  assert(!resLimAfter.valid, 'Coupon invalid after reaching usageLimit');
  assert(resLimAfter.errorCode === 'USAGE_LIMIT_EXCEEDED', 'Returns USAGE_LIMIT_EXCEEDED');

  // Per-user limit test
  const testUserId = 'test-promo-user-1';
  await prisma.user.upsert({
    where: { id: testUserId },
    create: { id: testUserId, role: 'CUSTOMER' },
    update: {},
  });

  const promoUserLimit = await prisma.promotion.create({
    data: {
      code: 'TEST_USER_LIMIT_1',
      name: 'Limit 1 Per User',
      type: 'PERCENTAGE',
      value: 10,
      scope: 'ORDER',
      perUserLimit: 1,
      startsAt: past,
      expiresAt: future,
      isActive: true,
    },
  });

  const resUserBefore = await promotionEngine.validateAndCalculateDiscount(
    'TEST_USER_LIMIT_1',
    [{ productId: 'p1', categoryId: 'c1', quantity: 1, price: 1000, subtotal: 1000 }],
    testUserId
  );
  assert(resUserBefore.valid, 'Per-user coupon valid before use');

  // Record a usage for this user
  const dummyOrder = await prisma.order.create({
    data: {
      publicId: `ORD-DUMMY-USAGE-${Date.now()}`,
      status: 'PENDING_PAYMENT',
      recipientName: 'Test Customer',
      recipientPhone: '0812345678',
      recipientAddress: 'Tokyo, Japan',
      recipientCity: 'Tokyo',
      recipientPostalCode: '100-0001',
      shippingMethodId: 'regular',
      shippingMethodName: 'Regular',
      shippingMethodEta: '2-3 days',
      shippingPrice: 180,
      paymentMethod: 'Bank Transfer',
      subtotal: 1000,
      discountAmount: 100,
      total: 1080,
      userId: testUserId,
      promotionId: promoUserLimit.id,
      couponCode: promoUserLimit.code,
    },
  });

  await prisma.promotionUsage.create({
    data: {
      promotionId: promoUserLimit.id,
      userId: testUserId,
      orderId: dummyOrder.id,
      discountAmount: 100,
    },
  });

  const resUserAfter = await promotionEngine.validateAndCalculateDiscount(
    'TEST_USER_LIMIT_1',
    [{ productId: 'p1', categoryId: 'c1', quantity: 1, price: 1000, subtotal: 1000 }],
    testUserId
  );
  assert(!resUserAfter.valid, 'Per-user coupon invalid after reaching user limit');
  assert(resUserAfter.errorCode === 'USER_USAGE_LIMIT_EXCEEDED', 'Returns USER_USAGE_LIMIT_EXCEEDED');
  passed += 5;

  // -------------------------------------------------------------
  // TEST SUITE 6: END-TO-END ORDER CREATION WITH COUPON
  // -------------------------------------------------------------
  console.log('\n--- SUITE 6: END-TO-END ORDER CREATION WITH PROMOTION ---');

  // Create an active 25% coupon
  const promoOrderTest = await prisma.promotion.create({
    data: {
      code: 'TEST_E2E_25',
      name: '25% Off E2E',
      type: 'PERCENTAGE',
      value: 25,
      scope: 'ORDER',
      minOrderAmount: 500,
      startsAt: past,
      expiresAt: future,
      isActive: true,
    },
  });

  // Ensure products have stock
  await prisma.product.update({
    where: { id: sampleProduct!.id },
    data: { stock: { increment: 10 } },
  });
  await prisma.inventory.upsert({
    where: { productId: sampleProduct!.id },
    create: { productId: sampleProduct!.id, availableQty: 20, reservedQty: 0 },
    update: { availableQty: { increment: 10 } },
  });

  const testQuantity = Math.max(2, Math.ceil(600 / sampleProduct!.price));
  const e2eResult = await createOrderService(
    {
      items: [{ productId: sampleProduct!.id, quantity: testQuantity }],
      address: {
        name: 'E2E Promo Shopper',
        phone: '08123456789',
        address: '1-1 Chiyoda, Tokyo',
        city: 'Tokyo',
        postalCode: '100-0001',
      },
      shippingId: 'regular',
      payment: 'Bank Transfer',
      couponCode: 'TEST_E2E_25',
      locale: 'ja',
    },
    testUserId
  );

  assert(e2eResult.success === true, 'Order created successfully with coupon: ' + (e2eResult.success ? '' : e2eResult.error));
  if (e2eResult.success) {
    const created = e2eResult.order;
    const expectedSubtotal = sampleProduct!.price * testQuantity;
    const expectedDiscount = Math.floor((expectedSubtotal * 25) / 100);
    const expectedTotal = expectedSubtotal - expectedDiscount + 180; // 180 regular shipping

    assert(created.subtotal === expectedSubtotal, `Authoritative subtotal is ${expectedSubtotal}`);
    assert(created.discountAmount === expectedDiscount, `Authoritative discount is ${expectedDiscount}`);
    assert(created.total === expectedTotal, `Authoritative total is ${expectedTotal} (got ${created.total})`);
    assert(created.couponCode === 'TEST_E2E_25', 'Coupon code persisted on order');
    assert(created.promotionId === promoOrderTest.id, 'Promotion ID persisted on order');

    // Check item discount allocation
    const itemAlloc = created.items[0].discountAllocation;
    assert(itemAlloc === expectedDiscount, `Item received full discount allocation of ${expectedDiscount}`);

    // Verify database record
    const dbOrder = await prisma.order.findUnique({
      where: { publicId: created.id },
      include: { items: true, promotionUsage: true },
    });
    assert(dbOrder?.discountAmount === expectedDiscount, 'DB order discountAmount matches');
    assert(dbOrder?.items[0].discountAllocation === expectedDiscount, 'DB orderItem discountAllocation matches');
    assert(!!dbOrder?.promotionUsage, 'DB PromotionUsage record created');
    assert(dbOrder?.promotionUsage?.discountAmount === expectedDiscount, 'PromotionUsage discountAmount matches');

    // Verify promotion usageCount incremented
    const promoAfterE2E = await prisma.promotion.findUnique({
      where: { id: promoOrderTest.id },
    });
    assert(promoAfterE2E?.usageCount === 1, `Promotion usageCount incremented to 1 (got ${promoAfterE2E?.usageCount})`);
  }
  passed += 11;

  // -------------------------------------------------------------
  // TEST SUITE 7: UNPAID ORDER CANCELLATION & USAGE ROLLBACK
  // -------------------------------------------------------------
  console.log('\n--- SUITE 7: ORDER CANCELLATION & PROMOTION ROLLBACK ---');

  if (e2eResult.success) {
    const cancelRes = await cancellationService.cancelUnpaidOrder({
      orderId: e2eResult.order.id,
      userId: testUserId,
      actorType: 'CUSTOMER',
      reason: 'Changed my mind',
    });

    assert(cancelRes.success === true, 'Cancellation of unpaid order succeeds');
    assert(cancelRes.orderStatus === 'CANCELLED', 'Order status changed to CANCELLED');

    // Verify promotion usageCount decremented back to 0
    const promoAfterCancel = await prisma.promotion.findUnique({
      where: { id: promoOrderTest.id },
    });
    assert(promoAfterCancel?.usageCount === 0, `Promotion usageCount rolled back to 0 (got ${promoAfterCancel?.usageCount})`);

    // Verify PromotionUsage record removed
    const usageAfterCancel = await prisma.promotionUsage.findUnique({
      where: { orderId: e2eResult.order.internalId! },
    });
    assert(usageAfterCancel === null, 'PromotionUsage record deleted on cancellation');
  }
  passed += 4;

  // -------------------------------------------------------------
  // TEST SUITE 8: PARTIAL RETURN REFUND CALCULATION INVARIANT
  // -------------------------------------------------------------
  console.log('\n--- SUITE 8: PARTIAL RETURN WITH DISCOUNT ALLOCATION ---');

  // Create order with 2 items and a fixed ¥600 discount (allocated ¥300 to each)
  const orderForReturn = await prisma.order.create({
    data: {
      publicId: `ORD-TEST-RETURN-DISC-${Date.now()}`,
      status: 'DELIVERED',
      recipientName: 'Return Test Customer',
      recipientPhone: '0812345678',
      recipientAddress: 'Kyoto, Japan',
      recipientCity: 'Kyoto',
      recipientPostalCode: '600-0001',
      shippingMethodId: 'regular',
      shippingMethodName: 'Regular',
      shippingMethodEta: '2-3 days',
      shippingPrice: 180,
      paymentMethod: 'Bank Transfer',
      subtotal: 4000,
      discountAmount: 600,
      total: 3580,
      deliveredAt: now,
      items: {
        create: [
          {
            productId: sampleProduct!.id,
            productName: 'Item A',
            productPrice: 1000,
            productImage: '/test.jpg',
            quantity: 2,
            subtotal: 2000,
            discountAllocation: 300, // Net paid: 2000 - 300 = 1700 (850 per unit)
          },
          {
            productId: sampleProduct!.id,
            productName: 'Item B',
            productPrice: 2000,
            productImage: '/test.jpg',
            quantity: 1,
            subtotal: 2000,
            discountAllocation: 300, // Net paid: 2000 - 300 = 1700
          },
        ],
      },
      payments: {
        create: {
          provider: 'dummy',
          providerPaymentId: `PAY-RET-${Date.now()}`,
          status: 'PAID',
          amount: 3580,
          currency: 'JPY',
          paidAt: now,
        },
      },
    },
    include: { items: true },
  });

  // Customer returns 1 of Item A (out of 2 units)
  // Original price: 1000.
  // Net price: (2000 - 300) * (1 / 2) = 1700 / 2 = 850 yen!
  const returnReq = await returnService.requestReturn({
    orderPublicId: orderForReturn.publicId,
    reason: 'DAMAGED',
    customerNote: 'Item arrived damaged',
    items: [
      {
        orderItemId: orderForReturn.items[0].id,
        quantity: 1,
        reason: 'Broken seal',
      },
    ],
  });

  assert(returnReq.success === true, 'Return request created');

  // Admin approves return
  const approveRes = await returnService.approveReturn({
    returnId: returnReq.returnRecord!.id,
    adminUserId: 'admin-tester',
  });
  assert(approveRes.success === true, 'Return approved');

  // Customer marks in transit
  const transitRes = await returnService.markReturnInTransit({
    returnId: returnReq.returnRecord!.id,
    actorType: 'CUSTOMER',
  });
  assert(transitRes.success === true, 'Return in transit');

  // Admin receives return with autoRefund = true
  const receiveRes = await returnService.receiveReturn({
    returnId: returnReq.returnRecord!.id,
    adminUserId: 'admin-tester',
    autoRefund: true,
  });

  assert(receiveRes.success === true, 'Return received and processed');
  const dbRefund = await prisma.refund.findFirst({
    where: { returnId: returnReq.returnRecord!.id },
  });
  assert(!!dbRefund, 'Refund record created for received return');
  // Net paid refund must be 850, NOT 1000!
  assert(
    dbRefund?.amount === 850,
    `Refund amount is strictly net paid amount ¥850, NOT undiscounted ¥1000 (got ¥${dbRefund?.amount})`
  );
  passed += 6;

  // -------------------------------------------------------------
  // TEST SUITE 9: ADMIN PROMOTION MANAGEMENT
  // -------------------------------------------------------------
  console.log('\n--- SUITE 9: ADMIN PROMOTION SERVICE ---');

  const createdAdminPromo = await adminPromotionService.createPromotion({
    code: 'ADMIN_PROMO_TEST',
    name: 'Admin Promo Test',
    description: 'Created by admin',
    type: 'FIXED_AMOUNT',
    value: 300,
    scope: 'ORDER',
    startsAt: past,
    expiresAt: future,
    isActive: true,
  });

  assert(createdAdminPromo.code === 'ADMIN_PROMO_TEST', 'Admin promotion created with correct code');
  assert(createdAdminPromo.isActive === true, 'Admin promotion active by default');

  // Toggle inactive
  const toggledPromo = await adminPromotionService.updatePromotionStatus(createdAdminPromo.id, false);
  assert(toggledPromo.isActive === false, 'Admin promotion successfully toggled to inactive');

  // List promotions
  const promoList = await adminPromotionService.listPromotions();
  assert(promoList.length >= 1, 'adminPromotionService.listPromotions returns promotions list');
  assert(promoList.some((p) => p.code === 'ADMIN_PROMO_TEST'), 'Created promo present in list');
  passed += 5;

  // Cleanup test data
  await prisma.promotionUsage.deleteMany({
    where: { promotion: { code: { startsWith: 'TEST_' } } },
  });
  await prisma.promotion.deleteMany({
    where: { code: { startsWith: 'TEST_' } },
  });
  await prisma.promotion.deleteMany({
    where: { code: 'ADMIN_PROMO_TEST' },
  });

  console.log('\n================================================================');
  console.log(`🎉 ALL ${passed} STEP 16 PROMOTIONS & COUPONS ASSERTIONS PASSED!`);
  console.log('================================================================\n');
}

runStep16Tests()
  .catch((err) => {
    console.error('Test run failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
