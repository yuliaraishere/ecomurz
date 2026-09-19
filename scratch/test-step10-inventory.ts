import { prisma } from '../lib/prisma';
import { reserveInventoryService } from '../features/inventory/services/reserve-inventory-service';
import { consumeInventoryService } from '../features/inventory/services/consume-inventory-service';
import { releaseInventoryService } from '../features/inventory/services/release-inventory-service';
import { expireInventoryReservationsService } from '../features/inventory/services/expire-inventory-reservations-service';
import { InsufficientStockError } from '../features/inventory/types';
import { createOrderService } from '../features/orders/services/create-order-service';
import { processDummyPaymentService } from '../features/payments/services/process-dummy-payment-service';
import { paymentWebhookService } from '../features/payments/services/payment-webhook-service';
import { retryOrderPaymentAction } from '../features/payments/actions/payment-actions';

async function runStep10Tests() {
  console.log('=== STARTING STEP 10: INVENTORY & ATOMIC RESERVATION TEST SUITE ===\n');

  // Test setup: ensure a test user exists
  const testUserId = 'test-user-step10';
  await prisma.user.upsert({
    where: { id: testUserId },
    create: { id: testUserId },
    update: {},
  });

  // Pick a base product for tests
  const baseProduct = await prisma.product.findFirst({
    include: { inventory: true },
  });
  if (!baseProduct) {
    throw new Error('No products found in database to test.');
  }
  console.log(`Using product: ${baseProduct.id} for baseline checks.`);

  // -------------------------------------------------------------
  // TEST 1: Inventory Backfill & Record Existence
  // -------------------------------------------------------------
  console.log('\n--- TEST 1: Inventory Backfill Verification ---');
  const allProducts = await prisma.product.findMany({ include: { inventory: true } });
  const missingInventory = allProducts.filter((p) => !p.inventory);
  if (missingInventory.length > 0) {
    throw new Error(`TEST 1 FAILED: Found ${missingInventory.length} products missing inventory record`);
  }
  console.log(`✓ TEST 1 PASSED: All ${allProducts.length} products have valid Inventory records.`);

  // -------------------------------------------------------------
  // TEST 2: Atomic Reservation on Order Creation
  // -------------------------------------------------------------
  console.log('\n--- TEST 2: Atomic Reservation on Order Creation ---');
  // Reset inventory for test product to known amount
  await prisma.inventory.update({
    where: { productId: baseProduct.id },
    data: { availableQty: 20, reservedQty: 0 },
  });

  const orderRes = await createOrderService(
    {
      items: [{ productId: baseProduct.id, quantity: 3 }],
      address: {
        name: 'Test Buyer',
        phone: '08123456789',
        address: '123 Shibuya St',
        city: 'Tokyo',
        postalCode: '150-0002',
      },
      shippingId: 'regular',
      payment: 'dummy',
    },
    testUserId
  );

  if (!orderRes.success) {
    throw new Error(`TEST 2 FAILED: Order creation failed: ${orderRes.error}`);
  }

  const invAfterOrder = await prisma.inventory.findUnique({
    where: { productId: baseProduct.id },
  });

  if (invAfterOrder?.availableQty !== 17 || invAfterOrder?.reservedQty !== 3) {
    throw new Error(
      `TEST 2 FAILED: Expected availableQty=17, reservedQty=3. Got available=${invAfterOrder?.availableQty}, reserved=${invAfterOrder?.reservedQty}`
    );
  }

  const reservation = await prisma.inventoryReservation.findFirst({
    where: { orderId: orderRes.order.internalId!, productId: baseProduct.id },
  });

  if (!reservation || reservation.status !== 'ACTIVE' || reservation.quantity !== 3) {
    throw new Error(`TEST 2 FAILED: Invalid reservation state: ${JSON.stringify(reservation)}`);
  }
  console.log('✓ TEST 2 PASSED: Order created, availableQty decremented by 3, reservedQty incremented by 3, status ACTIVE.');

  // -------------------------------------------------------------
  // TEST 3: Insufficient Stock Rejection & Rollback
  // -------------------------------------------------------------
  console.log('\n--- TEST 3: Insufficient Stock Rejection & Rollback ---');
  const excessiveOrderRes = await createOrderService(
    {
      items: [{ productId: baseProduct.id, quantity: 50 }], // exceeds 17
      address: {
        name: 'Greedy Buyer',
        phone: '08123456789',
        address: '123 Shinjuku',
        city: 'Tokyo',
        postalCode: '160-0022',
      },
      shippingId: 'regular',
      payment: 'dummy',
    },
    testUserId
  );

  if (excessiveOrderRes.success) {
    throw new Error('TEST 3 FAILED: Excessive order succeeded but should have failed with insufficient stock');
  }

  const invAfterExcessive = await prisma.inventory.findUnique({
    where: { productId: baseProduct.id },
  });

  if (invAfterExcessive?.availableQty !== 17 || invAfterExcessive?.reservedQty !== 3) {
    throw new Error('TEST 3 FAILED: Inventory modified despite rejected order');
  }
  console.log(`✓ TEST 3 PASSED: Excess order cleanly rejected (${excessiveOrderRes.error}), inventory intact.`);

  // -------------------------------------------------------------
  // TEST 4: High Concurrency Race Condition & Zero Overselling
  // -------------------------------------------------------------
  console.log('\n--- TEST 4: High Concurrency Race Condition Test ---');
  // Set test product availableQty = 2 exactly
  await prisma.inventory.update({
    where: { productId: baseProduct.id },
    data: { availableQty: 2, reservedQty: 0 },
  });

  // Launch 10 concurrent orders of quantity 1 each
  const concurrentOrders = Array.from({ length: 10 }, (_, i) =>
    createOrderService(
      {
        items: [{ productId: baseProduct.id, quantity: 1 }],
        address: {
          name: `Concurrent User ${i}`,
          phone: '08123456789',
          address: 'Tokyo Plaza',
          city: 'Tokyo',
          postalCode: '100-0001',
        },
        shippingId: 'regular',
        payment: 'dummy',
      },
      testUserId
    )
  );

  const results = await Promise.all(concurrentOrders);
  const successes = results.filter((r) => r.success);
  const failures = results.filter((r) => !r.success);

  console.log(`Concurrent results: ${successes.length} successes, ${failures.length} rejected.`);

  const invAfterRace = await prisma.inventory.findUnique({
    where: { productId: baseProduct.id },
  });

  if (successes.length !== 2 || failures.length !== 8) {
    throw new Error(
      `TEST 4 FAILED: Expected exactly 2 successes and 8 failures. Got ${successes.length} successes, ${failures.length} failures.`
    );
  }

  if (invAfterRace?.availableQty !== 0 || invAfterRace?.reservedQty !== 2) {
    throw new Error(
      `TEST 4 FAILED: Invalid inventory state after race: available=${invAfterRace?.availableQty}, reserved=${invAfterRace?.reservedQty}`
    );
  }
  console.log('✓ TEST 4 PASSED: Exactly 2 concurrent orders succeeded, 8 rejected, availableQty strictly 0 (no overselling, no negative stock).');

  // -------------------------------------------------------------
  // TEST 5: Payment Success -> Reservation Consumed
  // -------------------------------------------------------------
  console.log('\n--- TEST 5: Payment Success -> Reservation Consumed ---');
  const paidOrder = successes[0] as { success: true; order: any };
  const paySuccessRes = await processDummyPaymentService({
    orderPublicId: paidOrder.order.id,
    outcome: 'SUCCESS',
    userId: testUserId,
  });

  if (!paySuccessRes.success || paySuccessRes.paymentStatus !== 'PAID') {
    throw new Error(`TEST 5 FAILED: Payment simulation failed: ${JSON.stringify(paySuccessRes)}`);
  }

  const reservationAfterSuccess = await prisma.inventoryReservation.findFirst({
    where: { orderId: paidOrder.order.internalId },
  });

  if (reservationAfterSuccess?.status !== 'CONSUMED') {
    throw new Error(`TEST 5 FAILED: Expected reservation status CONSUMED, got ${reservationAfterSuccess?.status}`);
  }

  const invAfterSuccess = await prisma.inventory.findUnique({
    where: { productId: baseProduct.id },
  });

  // reservedQty dropped from 2 to 1; availableQty remains 0
  if (invAfterSuccess?.reservedQty !== 1 || invAfterSuccess?.availableQty !== 0) {
    throw new Error(
      `TEST 5 FAILED: Expected reservedQty=1, availableQty=0. Got reserved=${invAfterSuccess?.reservedQty}, available=${invAfterSuccess?.availableQty}`
    );
  }
  console.log('✓ TEST 5 PASSED: Payment SUCCESS consumed reservation (status=CONSUMED, reservedQty=1, availableQty=0).');

  // -------------------------------------------------------------
  // TEST 6: Payment Failure -> Reservation Released
  // -------------------------------------------------------------
  console.log('\n--- TEST 6: Payment Failure -> Reservation Released ---');
  const failedOrder = successes[1] as { success: true; order: any };
  const payFailRes = await processDummyPaymentService({
    orderPublicId: failedOrder.order.id,
    outcome: 'FAILURE',
    userId: testUserId,
  });

  const reservationAfterFail = await prisma.inventoryReservation.findFirst({
    where: { orderId: failedOrder.order.internalId },
  });

  if (reservationAfterFail?.status !== 'RELEASED') {
    throw new Error(`TEST 6 FAILED: Expected reservation status RELEASED, got ${reservationAfterFail?.status}`);
  }

  const invAfterFail = await prisma.inventory.findUnique({
    where: { productId: baseProduct.id },
  });

  // reservedQty dropped from 1 to 0; availableQty increased from 0 to 1
  if (invAfterFail?.reservedQty !== 0 || invAfterFail?.availableQty !== 1) {
    throw new Error(
      `TEST 6 FAILED: Expected reservedQty=0, availableQty=1. Got reserved=${invAfterFail?.reservedQty}, available=${invAfterFail?.availableQty}`
    );
  }
  console.log('✓ TEST 6 PASSED: Payment FAILURE released reservation (status=RELEASED, availableQty restored to 1, reservedQty=0).');

  // -------------------------------------------------------------
  // TEST 7: Opportunistic Reservation Expiration
  // -------------------------------------------------------------
  console.log('\n--- TEST 7: Opportunistic Reservation Expiration ---');
  // Create an order with active reservation
  const expiredOrderRes = await createOrderService(
    {
      items: [{ productId: baseProduct.id, quantity: 1 }],
      address: {
        name: 'Expiring Buyer',
        phone: '08123456789',
        address: 'Roppongi Hills',
        city: 'Tokyo',
        postalCode: '106-0032',
      },
      shippingId: 'regular',
      payment: 'dummy',
    },
    testUserId
  );
  if (!expiredOrderRes.success) {
    throw new Error(`TEST 7 setup failed: ${expiredOrderRes.error}`);
  }

  // Backdate the expiresAt to 30 minutes in the past
  const pastDate = new Date(Date.now() - 30 * 60 * 1000);
  await prisma.inventoryReservation.updateMany({
    where: { orderId: expiredOrderRes.order.internalId },
    data: { expiresAt: pastDate },
  });

  // Verify stock was reserved before expiration
  const invBeforeExp = await prisma.inventory.findUnique({ where: { productId: baseProduct.id } });
  if (invBeforeExp?.availableQty !== 0 || invBeforeExp?.reservedQty !== 1) {
    throw new Error('TEST 7 setup failed: stock was not reserved');
  }

  // Trigger opportunistic expiration
  const expired = await expireInventoryReservationsService();
  const matchedExpired = expired.find((r) => r.orderId === expiredOrderRes.order.internalId);
  if (!matchedExpired || matchedExpired.status !== 'EXPIRED') {
    throw new Error('TEST 7 FAILED: Expired reservation was not processed');
  }

  const invAfterExp = await prisma.inventory.findUnique({ where: { productId: baseProduct.id } });
  if (invAfterExp?.availableQty !== 1 || invAfterExp?.reservedQty !== 0) {
    throw new Error(
      `TEST 7 FAILED: Stock not reclaimed after expiration. Got available=${invAfterExp?.availableQty}, reserved=${invAfterExp?.reservedQty}`
    );
  }

  const orderAfterExp = await prisma.order.findUnique({
    where: { id: expiredOrderRes.order.internalId },
  });
  if (orderAfterExp?.status !== 'CANCELLED') {
    throw new Error(`TEST 7 FAILED: Order status expected CANCELLED, got ${orderAfterExp?.status}`);
  }
  console.log('✓ TEST 7 PASSED: Expired reservation reclaimed stock (status=EXPIRED, availableQty=1, order=CANCELLED).');

  // -------------------------------------------------------------
  // TEST 8: Webhook Idempotency on Payment Events
  // -------------------------------------------------------------
  console.log('\n--- TEST 8: Webhook Idempotency ---');
  // Create another order and pay via webhook
  const webhookOrderRes = await createOrderService(
    {
      items: [{ productId: baseProduct.id, quantity: 1 }],
      address: {
        name: 'Webhook Buyer',
        phone: '08123456789',
        address: 'Akihabara',
        city: 'Tokyo',
        postalCode: '101-0021',
      },
      shippingId: 'regular',
      payment: 'dummy',
    },
    testUserId
  );
  if (!webhookOrderRes.success) {
    throw new Error('TEST 8 setup failed');
  }

  const paymentRecord = await prisma.payment.findFirst({
    where: { orderId: webhookOrderRes.order.internalId },
  });
  if (!paymentRecord || !paymentRecord.providerPaymentId) {
    throw new Error('TEST 8 setup failed: no payment record');
  }

  // Send first success webhook
  const wh1 = await paymentWebhookService({
    provider: 'dummy',
    providerPaymentId: paymentRecord.providerPaymentId,
    event: 'payment.success',
  });
  if (!wh1.processed || wh1.status !== 'PAID') {
    throw new Error('TEST 8 FAILED: First webhook failed');
  }

  const invAfterWh1 = await prisma.inventory.findUnique({ where: { productId: baseProduct.id } });

  // Send duplicate success webhook (idempotent replay)
  const wh2 = await paymentWebhookService({
    provider: 'dummy',
    providerPaymentId: paymentRecord.providerPaymentId,
    event: 'payment.success',
  });
  if (!wh2.processed) {
    throw new Error('TEST 8 FAILED: Second webhook failed');
  }

  const invAfterWh2 = await prisma.inventory.findUnique({ where: { productId: baseProduct.id } });
  if (invAfterWh1?.reservedQty !== invAfterWh2?.reservedQty || invAfterWh1?.availableQty !== invAfterWh2?.availableQty) {
    throw new Error('TEST 8 FAILED: Inventory mutated on duplicate webhook');
  }
  console.log('✓ TEST 8 PASSED: Webhook idempotency verified (duplicate success event does not re-deduct inventory).');

  // -------------------------------------------------------------
  // TEST 9: Payment Retry with Stock Available vs Depleted
  // -------------------------------------------------------------
  console.log('\n--- TEST 9: Payment Retry with Stock Available vs Depleted ---');
  // failedOrder was failed in TEST 6, so its reservation was RELEASED and order is PENDING_PAYMENT
  // Currently availableQty = 0 because webhookOrder in TEST 8 consumed 1!
  // Let's set availableQty = 1 so retry can succeed
  await prisma.inventory.update({
    where: { productId: baseProduct.id },
    data: { availableQty: 1, reservedQty: 0 },
  });

  // Re-reserve via payment retry simulation
  const retrySuccess = await processDummyPaymentService({
    orderPublicId: failedOrder.order.id,
    outcome: 'SUCCESS',
    userId: testUserId,
  });

  if (!retrySuccess.success || retrySuccess.paymentStatus !== 'PAID') {
    throw new Error(`TEST 9 FAILED: Payment retry failed: ${JSON.stringify(retrySuccess)}`);
  }
  console.log('✓ TEST 9 PASSED: Payment retry on previously released order re-reserved and successfully paid.');

  // Now create an order, release it, exhaust stock, and verify retry fails
  await prisma.inventory.update({
    where: { productId: baseProduct.id },
    data: { availableQty: 1, reservedQty: 0 },
  });
  const orderToDeplete = await createOrderService(
    {
      items: [{ productId: baseProduct.id, quantity: 1 }],
      address: {
        name: 'Depletion Buyer',
        phone: '08123456789',
        address: 'Ginza',
        city: 'Tokyo',
        postalCode: '104-0061',
      },
      shippingId: 'regular',
      payment: 'dummy',
    },
    testUserId
  );
  if (!orderToDeplete.success) {
    throw new Error('TEST 9 setup failed');
  }

  // Release reservation via failure
  await processDummyPaymentService({
    orderPublicId: orderToDeplete.order.id,
    outcome: 'FAILURE',
    userId: testUserId,
  });

  // Now deplete availableQty to 0 artificially
  await prisma.inventory.update({
    where: { productId: baseProduct.id },
    data: { availableQty: 0 },
  });

  // Attempt to retry payment when out of stock
  const depletedRetry = await processDummyPaymentService({
    orderPublicId: orderToDeplete.order.id,
    outcome: 'SUCCESS',
    userId: testUserId,
  });

  if (depletedRetry.success) {
    throw new Error('TEST 9 FAILED: Depleted retry should have failed due to zero stock');
  }
  console.log(`✓ TEST 9.1 PASSED: Retry cleanly rejected on depleted inventory: ${depletedRetry.error}`);

  // -------------------------------------------------------------
  // CLEANUP & RESTORE
  // -------------------------------------------------------------
  // Restore product inventory to healthy baseline (stock from product table)
  await prisma.inventory.update({
    where: { productId: baseProduct.id },
    data: { availableQty: baseProduct.stock, reservedQty: 0 },
  });

  console.log('\n======================================================');
  console.log('🎉 ALL STEP 10 INVENTORY TESTS COMPLETED SUCCESSFULLY!');
  console.log('======================================================\n');
}

runStep10Tests()
  .catch((err) => {
    console.error('\n❌ STEP 10 TEST FAILURE:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
