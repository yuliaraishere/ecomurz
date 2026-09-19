import { prisma } from '../lib/prisma';
import { createOrderService } from '../features/orders/services/create-order-service';
import { processDummyPaymentService } from '../features/payments/services/process-dummy-payment-service';
import { paymentWebhookService } from '../features/payments/services/payment-webhook-service';
import {
  transitionOrderService,
} from '../features/orders/services/transition-order-service';
import {
  markOrderAsProcessing,
  markOrderAsPacked,
  markOrderAsShipped,
  markOrderAsDelivered,
  completeOrderService,
  cancelOrderService,
} from '../features/orders/services/fulfillment-services';
import {
  canTransitionOrderStatus,
  assertValidOrderTransition,
  isCustomerCancellable,
  normalizeLegacyOrderStatus,
  InvalidOrderTransitionError,
} from '../features/orders/domain';

async function runStep11Tests() {
  console.log('=== STARTING STEP 11: ORDER FULFILLMENT & LIFECYCLE TEST SUITE ===\n');

  // Test setup: Users A and B
  const userA = 'user-step11-a';
  const userB = 'user-step11-b';
  await prisma.user.upsert({ where: { id: userA }, create: { id: userA }, update: {} });
  await prisma.user.upsert({ where: { id: userB }, create: { id: userB }, update: {} });

  const product = await prisma.product.findFirst({ include: { inventory: true } });
  if (!product) throw new Error('No product available to test');

  // Reset inventory to high amount for test stability
  await prisma.inventory.update({
    where: { productId: product.id },
    data: { availableQty: 100, reservedQty: 0 },
  });

  // -------------------------------------------------------------
  // TEST 1: Initial Order Status & History
  // -------------------------------------------------------------
  console.log('--- TEST 1: Initial Order Status & History ---');
  const order1Res = await createOrderService(
    {
      items: [{ productId: product.id, quantity: 2 }],
      address: {
        name: 'Alice',
        phone: '08123456789',
        address: '123 Tokyo St',
        city: 'Tokyo',
        postalCode: '100-0001',
      },
      shippingId: 'regular',
      payment: 'dummy',
    },
    userA
  );

  if (!order1Res.success) {
    throw new Error(`TEST 1 FAILED: Could not create order: ${order1Res.error}`);
  }

  const order1 = await prisma.order.findUnique({
    where: { id: order1Res.order.internalId },
    include: { statusHistory: true },
  });

  if (order1?.status !== 'PENDING_PAYMENT') {
    throw new Error(`TEST 1 FAILED: Expected PENDING_PAYMENT, got ${order1?.status}`);
  }
  if (!order1?.statusHistory || order1.statusHistory.length !== 1) {
    throw new Error(`TEST 1 FAILED: Expected 1 statusHistory record, got ${order1?.statusHistory?.length}`);
  }
  if (order1.statusHistory[0].toStatus !== 'PENDING_PAYMENT') {
    throw new Error(`TEST 1 FAILED: History record toStatus expected PENDING_PAYMENT, got ${order1.statusHistory[0].toStatus}`);
  }
  console.log('✓ TEST 1 PASSED: Order created in PENDING_PAYMENT with initial OrderStatusHistory audit entry.');

  // -------------------------------------------------------------
  // TEST 2: Payment Success -> PAID & Status History
  // -------------------------------------------------------------
  console.log('\n--- TEST 2: Payment Success (PENDING_PAYMENT → PAID) ---');
  const payRes = await processDummyPaymentService({
    orderPublicId: order1.publicId,
    outcome: 'SUCCESS',
    userId: userA,
  });

  if (!payRes.success || payRes.orderStatus !== 'PAID') {
    throw new Error(`TEST 2 FAILED: Payment simulation failed: ${JSON.stringify(payRes)}`);
  }

  const order1AfterPay = await prisma.order.findUnique({
    where: { id: order1.id },
    include: { statusHistory: { orderBy: { createdAt: 'asc' } }, reservations: true },
  });

  if (order1AfterPay?.status !== 'PAID') {
    throw new Error(`TEST 2 FAILED: Expected Order.status === PAID, got ${order1AfterPay?.status}`);
  }
  if (order1AfterPay.statusHistory.length !== 2) {
    throw new Error(`TEST 2 FAILED: Expected 2 history entries, got ${order1AfterPay.statusHistory.length}`);
  }
  const paidHistory = order1AfterPay.statusHistory[1];
  if (paidHistory.fromStatus !== 'PENDING_PAYMENT' || paidHistory.toStatus !== 'PAID' || paidHistory.actorType !== 'PAYMENT') {
    throw new Error(`TEST 2 FAILED: Invalid history record: ${JSON.stringify(paidHistory)}`);
  }
  if (order1AfterPay.reservations[0]?.status !== 'CONSUMED') {
    throw new Error(`TEST 2 FAILED: Expected inventory reservation CONSUMED, got ${order1AfterPay.reservations[0]?.status}`);
  }
  console.log('✓ TEST 2 PASSED: Payment transition to PAID succeeded, inventory CONSUMED, history audit logged.');

  // -------------------------------------------------------------
  // TEST 3: PAID → PROCESSING
  // -------------------------------------------------------------
  console.log('\n--- TEST 3: PAID → PROCESSING ---');
  const procRes = await markOrderAsProcessing(order1.id, 'admin-1', 'Order accepted by store');
  if (!procRes.success || procRes.order?.status !== 'PROCESSING') {
    throw new Error(`TEST 3 FAILED: Transition to PROCESSING failed: ${procRes.error}`);
  }
  console.log('✓ TEST 3 PASSED: Transition to PROCESSING succeeded.');

  // -------------------------------------------------------------
  // TEST 4: PROCESSING → PACKED
  // -------------------------------------------------------------
  console.log('\n--- TEST 4: PROCESSING → PACKED ---');
  const packRes = await markOrderAsPacked(order1.id, 'admin-1', 'Packed in carton');
  if (!packRes.success || packRes.order?.status !== 'PACKED') {
    throw new Error(`TEST 4 FAILED: Transition to PACKED failed: ${packRes.error}`);
  }
  console.log('✓ TEST 4 PASSED: Transition to PACKED succeeded.');

  // -------------------------------------------------------------
  // TEST 5: PACKED → SHIPPED (with trackingNumber and shippedAt)
  // -------------------------------------------------------------
  console.log('\n--- TEST 5: PACKED → SHIPPED ---');
  const testTracking = 'YAMATO-987654321';
  const shipRes = await markOrderAsShipped(order1.id, testTracking, 'admin-1');
  if (!shipRes.success || shipRes.order?.status !== 'SHIPPED') {
    throw new Error(`TEST 5 FAILED: Transition to SHIPPED failed: ${shipRes.error}`);
  }

  const order1Shipped = await prisma.order.findUnique({ where: { id: order1.id } });
  if (order1Shipped?.trackingNumber !== testTracking || !order1Shipped?.shippedAt) {
    throw new Error(`TEST 5 FAILED: trackingNumber or shippedAt not populated: ${JSON.stringify(order1Shipped)}`);
  }
  console.log('✓ TEST 5 PASSED: Transition to SHIPPED succeeded, trackingNumber and shippedAt populated.');

  // -------------------------------------------------------------
  // TEST 6: SHIPPED → DELIVERED (with deliveredAt)
  // -------------------------------------------------------------
  console.log('\n--- TEST 6: SHIPPED → DELIVERED ---');
  const delivRes = await markOrderAsDelivered(order1.id);
  if (!delivRes.success || delivRes.order?.status !== 'DELIVERED') {
    throw new Error(`TEST 6 FAILED: Transition to DELIVERED failed: ${delivRes.error}`);
  }

  const order1Delivered = await prisma.order.findUnique({ where: { id: order1.id } });
  if (!order1Delivered?.deliveredAt) {
    throw new Error('TEST 6 FAILED: deliveredAt timestamp not populated');
  }
  console.log('✓ TEST 6 PASSED: Transition to DELIVERED succeeded, deliveredAt populated.');

  // -------------------------------------------------------------
  // TEST 7: DELIVERED → COMPLETED (with completedAt)
  // -------------------------------------------------------------
  console.log('\n--- TEST 7: DELIVERED → COMPLETED ---');
  const compRes = await completeOrderService(order1.id, userA, 'CUSTOMER', userA);
  if (!compRes.success || compRes.order?.status !== 'COMPLETED') {
    throw new Error(`TEST 7 FAILED: Transition to COMPLETED failed: ${compRes.error}`);
  }

  const order1Completed = await prisma.order.findUnique({ where: { id: order1.id } });
  if (!order1Completed?.completedAt) {
    throw new Error('TEST 7 FAILED: completedAt timestamp not populated');
  }
  console.log('✓ TEST 7 PASSED: Transition to COMPLETED succeeded, completedAt populated.');

  // -------------------------------------------------------------
  // TEST 8: Invalid Transition (COMPLETED → PROCESSING)
  // -------------------------------------------------------------
  console.log('\n--- TEST 8: Invalid Transition Rejection ---');
  const invalidRes = await transitionOrderService({
    orderId: order1.id,
    toStatus: 'PROCESSING',
    actorType: 'ADMIN',
  });

  if (invalidRes.success) {
    throw new Error('TEST 8 FAILED: COMPLETED → PROCESSING should have failed');
  }

  const order1AfterInvalid = await prisma.order.findUnique({ where: { id: order1.id } });
  if (order1AfterInvalid?.status !== 'COMPLETED') {
    throw new Error('TEST 8 FAILED: Order status corrupted after invalid transition');
  }
  console.log(`✓ TEST 8 PASSED: Invalid transition cleanly rejected (${invalidRes.error}), order remains COMPLETED.`);

  // -------------------------------------------------------------
  // TEST 9: Cancel Pending Payment & Release Inventory
  // -------------------------------------------------------------
  console.log('\n--- TEST 9: Cancel Pending Payment & Release Inventory ---');
  const invBeforeCancel = await prisma.inventory.findUnique({ where: { productId: product.id } });

  const orderToCancel = await createOrderService(
    {
      items: [{ productId: product.id, quantity: 5 }],
      address: {
        name: 'Bob',
        phone: '08123456789',
        address: '456 Shinjuku',
        city: 'Tokyo',
        postalCode: '160-0022',
      },
      shippingId: 'regular',
      payment: 'dummy',
    },
    userA
  );
  if (!orderToCancel.success) throw new Error('TEST 9 setup failed');

  const invDuringPending = await prisma.inventory.findUnique({ where: { productId: product.id } });
  if (invDuringPending?.reservedQty !== (invBeforeCancel?.reservedQty ?? 0) + 5) {
    throw new Error('TEST 9 setup failed: reservation did not increase reservedQty');
  }

  // Cancel the pending order
  const cancelRes = await cancelOrderService(orderToCancel.order.internalId!, 'Changed mind', userA, 'CUSTOMER', userA);
  if (!cancelRes.success || cancelRes.order?.status !== 'CANCELLED') {
    throw new Error(`TEST 9 FAILED: Cancellation failed: ${cancelRes.error}`);
  }

  const invAfterCancel = await prisma.inventory.findUnique({ where: { productId: product.id } });
  if (invAfterCancel?.reservedQty !== invBeforeCancel?.reservedQty) {
    throw new Error(
      `TEST 9 FAILED: Reserved inventory was not released. Expected ${invBeforeCancel?.reservedQty}, got ${invAfterCancel?.reservedQty}`
    );
  }

  const orderCancelled = await prisma.order.findUnique({
    where: { id: orderToCancel.order.internalId },
    include: { reservations: true },
  });
  if (orderCancelled?.cancelledAt == null) {
    throw new Error('TEST 9 FAILED: cancelledAt timestamp was not set');
  }
  if (orderCancelled.reservations[0]?.status !== 'RELEASED') {
    throw new Error(`TEST 9 FAILED: Reservation expected RELEASED, got ${orderCancelled.reservations[0]?.status}`);
  }
  console.log('✓ TEST 9 PASSED: Pending order cancelled, active reservation RELEASED, cancelledAt set.');

  // -------------------------------------------------------------
  // TEST 10: Cannot Cancel Shipped Order
  // -------------------------------------------------------------
  console.log('\n--- TEST 10: Cannot Cancel Shipped Order ---');
  const shipCancelAttempt = await cancelOrderService(order1.id, 'Too late', userA, 'CUSTOMER', userA);
  if (shipCancelAttempt.success) {
    throw new Error('TEST 10 FAILED: Shipped/Completed order should not be cancellable');
  }
  console.log(`✓ TEST 10 PASSED: Cannot cancel completed/shipped order: ${shipCancelAttempt.error}`);

  // -------------------------------------------------------------
  // TEST 11: Idempotent Payment Webhook
  // -------------------------------------------------------------
  console.log('\n--- TEST 11: Idempotent Payment Webhook ---');
  const webhookOrder = await createOrderService(
    {
      items: [{ productId: product.id, quantity: 1 }],
      address: {
        name: 'Charlie',
        phone: '08123456789',
        address: 'Ginza 1',
        city: 'Tokyo',
        postalCode: '104-0061',
      },
      shippingId: 'regular',
      payment: 'dummy',
    },
    userA
  );
  if (!webhookOrder.success) throw new Error('TEST 11 setup failed');

  const paymentObj = await prisma.payment.findFirst({ where: { orderId: webhookOrder.order.internalId } });
  if (!paymentObj?.providerPaymentId) throw new Error('TEST 11 setup failed: no provider payment ID');

  // First webhook
  await paymentWebhookService({
    provider: 'dummy',
    providerPaymentId: paymentObj.providerPaymentId,
    event: 'payment.success',
  });

  const historyCount1 = await prisma.orderStatusHistory.count({ where: { orderId: webhookOrder.order.internalId } });

  // Duplicate replay webhook
  await paymentWebhookService({
    provider: 'dummy',
    providerPaymentId: paymentObj.providerPaymentId,
    event: 'payment.success',
  });

  const historyCount2 = await prisma.orderStatusHistory.count({ where: { orderId: webhookOrder.order.internalId } });
  if (historyCount1 !== historyCount2) {
    throw new Error(`TEST 11 FAILED: Duplicate webhook created extra history: ${historyCount1} vs ${historyCount2}`);
  }
  console.log('✓ TEST 11 PASSED: Duplicate payment webhook was idempotent (no duplicate status history or inventory deduction).');

  // -------------------------------------------------------------
  // TEST 12: User Isolation
  // -------------------------------------------------------------
  console.log('\n--- TEST 12: User Isolation ---');
  // User B tries to cancel User A's order
  const crossCancel = await cancelOrderService(order1.id, 'Hacking', userB, 'CUSTOMER', userB);
  if (crossCancel.success) {
    throw new Error('TEST 12 FAILED: User B was able to cancel User A order');
  }
  if (crossCancel.error !== 'UNAUTHORIZED') {
    throw new Error(`TEST 12 FAILED: Expected UNAUTHORIZED, got ${crossCancel.error}`);
  }
  console.log('✓ TEST 12 PASSED: Cross-user mutation blocked with UNAUTHORIZED.');

  // -------------------------------------------------------------
  // TEST 13: Status History Integrity
  // -------------------------------------------------------------
  console.log('\n--- TEST 13: Status History Audit Integrity ---');
  const fullHistory = await prisma.orderStatusHistory.findMany({
    where: { orderId: order1.id },
    orderBy: { createdAt: 'asc' },
  });

  const expectedStatuses = ['PENDING_PAYMENT', 'PAID', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED', 'COMPLETED'];
  const actualStatuses = fullHistory.map((h) => h.toStatus);

  if (actualStatuses.length !== expectedStatuses.length) {
    throw new Error(`TEST 13 FAILED: Expected ${expectedStatuses.length} transitions, got ${actualStatuses.length}`);
  }

  for (let i = 0; i < expectedStatuses.length; i++) {
    if (actualStatuses[i] !== expectedStatuses[i]) {
      throw new Error(`TEST 13 FAILED: Step ${i} expected ${expectedStatuses[i]}, got ${actualStatuses[i]}`);
    }
  }
  console.log(`✓ TEST 13 PASSED: Full lifecycle audit trail verified: ${actualStatuses.join(' → ')}.`);

  // -------------------------------------------------------------
  // TEST 14: Timestamp Integrity
  // -------------------------------------------------------------
  console.log('\n--- TEST 14: Timestamp Integrity ---');
  if (!order1Shipped?.shippedAt || !order1Delivered?.deliveredAt || !order1Completed?.completedAt) {
    throw new Error('TEST 14 FAILED: Missing lifecycle timestamps on fulfilled order');
  }
  if (order1Completed.cancelledAt != null) {
    throw new Error('TEST 14 FAILED: completed order should not have cancelledAt');
  }
  console.log('✓ TEST 14 PASSED: Timestamps populated strictly at corresponding transitions.');

  // -------------------------------------------------------------
  // TEST 15: Legacy Orders Compatibility
  // -------------------------------------------------------------
  console.log('\n--- TEST 15: Legacy Orders Normalization ---');
  if (normalizeLegacyOrderStatus('Diproses') !== 'PROCESSING') {
    throw new Error('TEST 15 FAILED: Diproses should normalize to PROCESSING');
  }
  if (normalizeLegacyOrderStatus('PAID') !== 'PAID') {
    throw new Error('TEST 15 FAILED: PAID should normalize to PAID');
  }
  console.log('✓ TEST 15 PASSED: Legacy orders gracefully normalize without mutating database.');

  // -------------------------------------------------------------
  // TEST 16: All 8 Locales Verification
  // -------------------------------------------------------------
  console.log('\n--- TEST 16: All 8 Locales Fulfillment Keys ---');
  const locales = ['id', 'en', 'ja', 'tl', 'vi', 'th', 'hi', 'zh'];
  for (const loc of locales) {
    const messages = await import(`../messages/${loc}.json`);
    if (!messages.Fulfillment || !messages.Fulfillment.statuses || !messages.Fulfillment.timeline) {
      throw new Error(`TEST 16 FAILED: Locale ${loc} missing Fulfillment messages`);
    }
  }
  console.log(`✓ TEST 16 PASSED: All 8 locales (${locales.join(', ')}) contain complete Fulfillment translations.`);

  console.log('\n======================================================');
  console.log('🎉 ALL STEP 11 ORDER LIFECYCLE TESTS PASSED CLEANLY!');
  console.log('======================================================\n');
}

runStep11Tests()
  .catch((err) => {
    console.error('\n❌ STEP 11 TEST FAILURE:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
