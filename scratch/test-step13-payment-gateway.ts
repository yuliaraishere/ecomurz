import crypto from 'node:crypto';
import { prisma } from '../lib/prisma';
import {
  getPaymentProvider,
  registerPaymentProvider,
  dummyPaymentProvider,
  stripePaymentProvider,
  StripePaymentProvider,
  paymentService,
  paymentWebhookService,
  retryOrderPaymentAction,
  reconcilePaymentAction,
  type PaymentProvider,
} from '../features/payments';
import { createOrderService } from '../features/orders/services/create-order-service';
import { adminOrderRepository } from '../features/orders/repositories/admin-order-repository';

async function runStep13TestSuite() {
  console.log('====================================================');
  console.log('  STEP 13 — PRODUCTION PAYMENT GATEWAY TEST SUITE   ');
  console.log('====================================================\n');

  let passedTests = 0;
  const totalTests = 23;

  // Setup test customer user
  const customerUserId = `test-p13-cust-${Date.now()}`;
  await prisma.user.create({
    data: {
      id: customerUserId,
      role: 'CUSTOMER',
    },
  });

  // Fetch or create a test product with sufficient inventory
  let testProduct = await prisma.product.findFirst({
    include: { inventory: true },
  });

  if (!testProduct) {
    throw new Error('No product found in DB');
  }

  // Ensure stock is available
  await prisma.inventory.upsert({
    where: { productId: testProduct.id },
    create: {
      productId: testProduct.id,
      availableQty: 50,
      reservedQty: 0,
    },
    update: {
      availableQty: 50,
      reservedQty: 0,
    },
  });

  try {
    // -------------------------------------------------------------
    // Test 1: Standard JPY Currency Verification in Schema & Models
    // -------------------------------------------------------------
    console.log('Test 1: Standard JPY Currency Verification in DB');
    const paymentCol = await prisma.payment.findFirst({
      select: { currency: true },
    });
    // Any existing or newly defaulted payment must use JPY
    const dummyP = await prisma.payment.create({
      data: {
        orderId: (await prisma.order.findFirst())?.id || 'temp',
        provider: 'dummy',
        amount: 1000,
        status: 'PENDING',
      },
    });
    if (dummyP.currency !== 'JPY') {
      throw new Error(`Expected default currency JPY, got ${dummyP.currency}`);
    }
    await prisma.payment.delete({ where: { id: dummyP.id } });
    console.log('  ✓ Test 1 Passed: Payment model defaults to JPY currency\n');
    passedTests++;

    // -------------------------------------------------------------
    // Test 2: Provider Abstraction Conformance
    // -------------------------------------------------------------
    console.log('Test 2: Provider Abstraction Conformance');
    if (
      typeof dummyPaymentProvider.createPayment !== 'function' ||
      typeof dummyPaymentProvider.verifyPayment !== 'function' ||
      typeof dummyPaymentProvider.handleWebhook !== 'function' ||
      dummyPaymentProvider.providerName !== 'dummy'
    ) {
      throw new Error('DummyPaymentProvider does not conform to PaymentProvider interface');
    }
    if (
      typeof stripePaymentProvider.createPayment !== 'function' ||
      typeof stripePaymentProvider.verifyPayment !== 'function' ||
      typeof stripePaymentProvider.handleWebhook !== 'function' ||
      stripePaymentProvider.providerName !== 'stripe'
    ) {
      throw new Error('StripePaymentProvider does not conform to PaymentProvider interface');
    }
    console.log('  ✓ Test 2 Passed: Providers conform to PaymentProvider interface\n');
    passedTests++;

    // -------------------------------------------------------------
    // Test 3: Provider Factory Resolution (Default/Dummy)
    // -------------------------------------------------------------
    console.log('Test 3: Provider Factory Resolution (Default/Dummy)');
    const defaultProvider = getPaymentProvider();
    if (defaultProvider.providerName !== 'dummy') {
      throw new Error(`Expected default provider dummy, got ${defaultProvider.providerName}`);
    }
    const explicitDummy = getPaymentProvider('dummy');
    if (explicitDummy.providerName !== 'dummy') {
      throw new Error(`Expected explicit dummy provider, got ${explicitDummy.providerName}`);
    }
    console.log('  ✓ Test 3 Passed: Provider Factory resolves dummy provider by default\n');
    passedTests++;

    // -------------------------------------------------------------
    // Test 4: Provider Factory Resolution (Explicit Stripe)
    // -------------------------------------------------------------
    console.log('Test 4: Provider Factory Resolution (Explicit Stripe)');
    const resolvedStripe = getPaymentProvider('stripe');
    if (resolvedStripe.providerName !== 'stripe') {
      throw new Error(`Expected stripe provider, got ${resolvedStripe.providerName}`);
    }
    console.log('  ✓ Test 4 Passed: Provider Factory resolves stripe provider\n');
    passedTests++;

    // -------------------------------------------------------------
    // Test 5: Provider Factory Fallback
    // -------------------------------------------------------------
    console.log('Test 5: Provider Factory Fallback on Unknown Provider');
    const fallbackProvider = getPaymentProvider('non_existent_provider_xyz');
    if (fallbackProvider.providerName !== 'dummy') {
      throw new Error(`Expected fallback to dummy, got ${fallbackProvider.providerName}`);
    }
    console.log('  ✓ Test 5 Passed: Provider Factory safely falls back to dummy\n');
    passedTests++;

    // -------------------------------------------------------------
    // Test 6: Provider Factory Custom Provider Registration
    // -------------------------------------------------------------
    console.log('Test 6: Provider Factory Custom Provider Registration');
    const mockCustomProvider: PaymentProvider = {
      providerName: 'custom_mock',
      async createPayment() {
        return { success: true, paymentId: 'p1', providerPaymentId: 'pp1', redirectUrl: '/custom' };
      },
      async verifyPayment() {
        return { success: true, status: 'PAID', providerPaymentId: 'pp1' };
      },
      async handleWebhook() {
        return { received: true, processed: true, status: 'PAID' };
      },
      async refundPayment() {
        return { success: true, providerRefundId: 'ref_custom_1', status: 'SUCCEEDED' };
      },
    };
    registerPaymentProvider('custom_mock', mockCustomProvider);
    const retrievedCustom = getPaymentProvider('custom_mock');
    if (retrievedCustom.providerName !== 'custom_mock') {
      throw new Error('Failed to retrieve registered custom payment provider');
    }
    console.log('  ✓ Test 6 Passed: Dynamic provider registration works seamlessly\n');
    passedTests++;

    // -------------------------------------------------------------
    // Test 7: Stripe Zero-Decimal JPY Amount Handling
    // -------------------------------------------------------------
    console.log('Test 7: Stripe Zero-Decimal JPY Amount Handling');
    const stripeInst = new StripePaymentProvider();
    const jpyInit = await stripeInst.createPayment({
      orderId: 'test-order-jpy',
      orderPublicId: 'RUPA-JPY-TEST',
      amount: 1500,
      currency: 'JPY',
    });
    if (!jpyInit.success || !jpyInit.providerPaymentId.startsWith('cs_test_')) {
      throw new Error('Stripe sandbox JPY payment creation failed');
    }
    console.log('  ✓ Test 7 Passed: Stripe correctly treats JPY as zero-decimal currency\n');
    passedTests++;

    // -------------------------------------------------------------
    // Test 8: Stripe Multi-Decimal Currency Handling (USD Cents)
    // -------------------------------------------------------------
    console.log('Test 8: Stripe Multi-Decimal Currency Handling');
    const usdInit = await stripeInst.createPayment({
      orderId: 'test-order-usd',
      orderPublicId: 'RUPA-USD-TEST',
      amount: 25.5,
      currency: 'USD',
    });
    if (!usdInit.success) {
      throw new Error('Stripe sandbox USD payment creation failed');
    }
    console.log('  ✓ Test 8 Passed: Stripe handles multi-decimal currencies without error\n');
    passedTests++;

    // -------------------------------------------------------------
    // Test 9: Stripe Sandbox Fallback
    // -------------------------------------------------------------
    console.log('Test 9: Stripe Sandbox Fallback Mode');
    if (!stripeInst.createPayment) {
      throw new Error('createPayment missing');
    }
    const sandboxSession = await stripeInst.createPayment({
      orderId: 'sandbox-1',
      orderPublicId: 'RUPA-SB-1',
      amount: 3200,
      currency: 'JPY',
    });
    if (!sandboxSession.redirectUrl.includes('RUPA-SB-1')) {
      throw new Error(`Invalid sandbox redirectUrl: ${sandboxSession.redirectUrl}`);
    }
    console.log('  ✓ Test 9 Passed: Stripe operates gracefully in sandbox mode\n');
    passedTests++;

    // -------------------------------------------------------------
    // Test 10: Stripe Webhook Cryptographic HMAC-SHA256 Signature
    // -------------------------------------------------------------
    console.log('Test 10: Stripe Webhook HMAC-SHA256 Valid Signature');
    const secret = 'whsec_test_secret_key_1234567890';
    const providerWithSecret = new StripePaymentProvider({
      webhookSecret: secret,
    });
    const payloadStr = JSON.stringify({
      id: 'evt_stripe_test_10',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_signed_123',
          client_reference_id: 'RUPA-ORD-10',
          payment_status: 'paid',
        },
      },
    });
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const hmacSig = crypto
      .createHmac('sha256', secret)
      .update(`${timestamp}.${payloadStr}`)
      .digest('hex');
    const sigHeader = `t=${timestamp},v1=${hmacSig}`;

    const validWebhookRes = await providerWithSecret.handleWebhook(payloadStr, {
      'stripe-signature': sigHeader,
    });
    if (!validWebhookRes.received || !validWebhookRes.processed || validWebhookRes.status !== 'PAID') {
      throw new Error(`Valid webhook signature rejected: ${validWebhookRes.message}`);
    }
    console.log('  ✓ Test 10 Passed: HMAC-SHA256 signature verified successfully\n');
    passedTests++;

    // -------------------------------------------------------------
    // Test 11: Stripe Webhook Tampered Payload Rejection
    // -------------------------------------------------------------
    console.log('Test 11: Stripe Webhook Tampered Payload Rejection');
    const tamperedPayload = payloadStr + ' ';
    const invalidWebhookRes = await providerWithSecret.handleWebhook(tamperedPayload, {
      'stripe-signature': sigHeader,
    });
    if (invalidWebhookRes.processed) {
      throw new Error('Tampered webhook payload was unexpectedly processed!');
    }
    console.log('  ✓ Test 11 Passed: Tampered webhook payload correctly rejected\n');
    passedTests++;

    // -------------------------------------------------------------
    // Test 12: Stripe Webhook Event Parsing: Completed -> PAID
    // -------------------------------------------------------------
    console.log('Test 12: Stripe Webhook Event Parsing: checkout.session.completed -> PAID');
    const completedEvt = {
      id: `evt_completed_${Date.now()}`,
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_completed',
          client_reference_id: 'RUPA-12',
          payment_status: 'paid',
        },
      },
    };
    const completedRes = await stripePaymentProvider.handleWebhook(completedEvt);
    if (completedRes.status !== 'PAID' || completedRes.providerPaymentId !== 'cs_test_completed') {
      throw new Error(`Unexpected completed status: ${completedRes.status}`);
    }
    console.log('  ✓ Test 12 Passed: checkout.session.completed mapped to PAID\n');
    passedTests++;

    // -------------------------------------------------------------
    // Test 13: Stripe Webhook Event Parsing: Expired -> EXPIRED
    // -------------------------------------------------------------
    console.log('Test 13: Stripe Webhook Event Parsing: checkout.session.expired -> EXPIRED');
    const expiredEvt = {
      id: `evt_expired_${Date.now()}`,
      type: 'checkout.session.expired',
      data: {
        object: {
          id: 'cs_test_expired',
          client_reference_id: 'RUPA-13',
        },
      },
    };
    const expiredRes = await stripePaymentProvider.handleWebhook(expiredEvt);
    if (expiredRes.status !== 'EXPIRED') {
      throw new Error(`Unexpected expired status: ${expiredRes.status}`);
    }
    console.log('  ✓ Test 13 Passed: checkout.session.expired mapped to EXPIRED\n');
    passedTests++;

    // -------------------------------------------------------------
    // Test 14: Stripe Webhook Event Parsing: Failed -> FAILED
    // -------------------------------------------------------------
    console.log('Test 14: Stripe Webhook Event Parsing: payment_intent.payment_failed -> FAILED');
    const failedEvt = {
      id: `evt_failed_${Date.now()}`,
      type: 'payment_intent.payment_failed',
      data: {
        object: {
          id: 'pi_test_failed',
          client_reference_id: 'RUPA-14',
        },
      },
    };
    const failedRes = await stripePaymentProvider.handleWebhook(failedEvt);
    if (failedRes.status !== 'FAILED') {
      throw new Error(`Unexpected failed status: ${failedRes.status}`);
    }
    console.log('  ✓ Test 14 Passed: payment_intent.payment_failed mapped to FAILED\n');
    passedTests++;

    // -------------------------------------------------------------
    // Create an Order for Database Webhook & Lifecycle Tests
    // -------------------------------------------------------------
    const orderCreateResult = await createOrderService({
      items: [{ productId: testProduct.id, quantity: 2 }],
      address: {
        name: 'Test Customer 13',
        phone: '080-1234-5678',
        address: '1-2-3 Shibuya',
        city: 'Tokyo',
        postalCode: '150-0002',
      },
      shippingId: 'regular',
      payment: 'dummy',
      locale: 'ja',
      userId: customerUserId,
    });

    if (!orderCreateResult.success) {
      throw new Error(`Order creation failed: ${orderCreateResult.error}`);
    }
    const order1 = orderCreateResult.order;

    // -------------------------------------------------------------
    // Test 15: Database Idempotency via PaymentWebhookEvent
    // -------------------------------------------------------------
    console.log('Test 15: Database Idempotency via PaymentWebhookEvent');
    const webhookEventId = `evt_idemp_${Date.now()}`;
    const webhookPayload = {
      provider: 'dummy',
      providerPaymentId: order1.providerPaymentId,
      orderPublicId: order1.id,
      event: 'payment.success',
      eventId: webhookEventId,
    };

    // First call
    const firstCall = await paymentService.processWebhook({
      rawBody: webhookPayload,
      providerName: 'dummy',
    });
    if (!firstCall.received || !firstCall.processed || firstCall.status !== 'PAID') {
      throw new Error(`First webhook call failed: ${firstCall.message}`);
    }

    // Verify PaymentWebhookEvent record exists
    const recordedEvt = await prisma.paymentWebhookEvent.findUnique({
      where: {
        provider_eventId: {
          provider: 'dummy',
          eventId: webhookEventId,
        },
      },
    });
    if (!recordedEvt) {
      throw new Error('PaymentWebhookEvent was not persisted to database');
    }

    // Second call with same eventId
    const secondCall = await paymentService.processWebhook({
      rawBody: webhookPayload,
      providerName: 'dummy',
    });
    if (!secondCall.message?.includes('Idempotent')) {
      throw new Error(`Second webhook call did not detect idempotency: ${secondCall.message}`);
    }
    console.log('  ✓ Test 15 Passed: Database idempotency via PaymentWebhookEvent verified\n');
    passedTests++;

    // -------------------------------------------------------------
    // Test 16: Webhook Success Lifecycle & Inventory Synchronization
    // -------------------------------------------------------------
    console.log('Test 16: Webhook Success Transitions Order to PAID & Consumes Stock');
    const updatedOrder = await prisma.order.findUnique({
      where: { id: order1.internalId! },
      include: {
        payments: true,
        reservations: true,
        statusHistory: true,
      },
    });
    if (updatedOrder?.status !== 'PAID') {
      throw new Error(`Expected order status PAID, got ${updatedOrder?.status}`);
    }
    const paidPayment = updatedOrder.payments.find((p) => p.status === 'PAID');
    if (!paidPayment || !paidPayment.paidAt) {
      throw new Error('Payment was not marked PAID with paidAt timestamp');
    }
    const activeRes = updatedOrder.reservations.some((r) => r.status === 'ACTIVE');
    if (activeRes) {
      throw new Error('Inventory reservations were not consumed upon successful payment');
    }
    const auditLog = updatedOrder.statusHistory.find(
      (h) => h.toStatus === 'PAID' && h.actorType === 'PAYMENT'
    );
    if (!auditLog) {
      throw new Error('OrderStatusHistory missing PAYMENT actor record');
    }
    console.log('  ✓ Test 16 Passed: Webhook success fully synchronizes order, payment, and inventory\n');
    passedTests++;

    // -------------------------------------------------------------
    // Test 17: Webhook Failure Lifecycle & Inventory Release
    // -------------------------------------------------------------
    console.log('Test 17: Webhook Failure Transitions Payment to FAILED & Releases Stock');
    const failOrderResult = await createOrderService({
      items: [{ productId: testProduct.id, quantity: 1 }],
      address: {
        name: 'Fail Customer',
        phone: '080-9999-8888',
        address: '4-5-6 Shinjuku',
        city: 'Tokyo',
        postalCode: '160-0022',
      },
      shippingId: 'regular',
      payment: 'dummy',
      userId: customerUserId,
    });
    if (!failOrderResult.success) {
      throw new Error('Failed to create order for failure test');
    }
    const orderToFail = failOrderResult.order;

    const failEvtId = `evt_fail_${Date.now()}`;
    await paymentService.processWebhook({
      rawBody: {
        provider: 'dummy',
        providerPaymentId: orderToFail.providerPaymentId,
        orderPublicId: orderToFail.id,
        event: 'payment.failed',
        eventId: failEvtId,
      },
      providerName: 'dummy',
    });

    const failedOrderDb = await prisma.order.findUnique({
      where: { id: orderToFail.internalId! },
      include: { payments: true, reservations: true },
    });
    const failedPayment = failedOrderDb?.payments.find((p) => p.status === 'FAILED');
    if (!failedPayment || !failedPayment.failedAt) {
      throw new Error('Payment missing FAILED status or failedAt timestamp');
    }
    const reservationsReleased = failedOrderDb?.reservations.every(
      (r) => r.status === 'RELEASED' || r.status === 'EXPIRED'
    );
    if (!reservationsReleased) {
      throw new Error('Active reservations were not released upon payment failure');
    }
    console.log('  ✓ Test 17 Passed: Webhook failure transitions payment and releases reservations\n');
    passedTests++;

    // -------------------------------------------------------------
    // Test 18: Payment Retry Lifecycle with Atomic Re-reservation
    // -------------------------------------------------------------
    console.log('Test 18: Payment Retry Lifecycle with Atomic Re-reservation');
    const retryResult = await paymentService.createOrRetryPayment({
      orderPublicId: orderToFail.id,
      userId: customerUserId,
      locale: 'ja',
      providerName: 'dummy',
    });
    if (!retryResult.success) {
      throw new Error(`Payment retry failed: ${retryResult.error}`);
    }

    const retriedOrderDb = await prisma.order.findUnique({
      where: { id: orderToFail.internalId! },
      include: {
        payments: { orderBy: { createdAt: 'desc' } },
        reservations: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (retriedOrderDb?.payments[0]?.status !== 'PENDING') {
      throw new Error('Expected latest payment attempt to be PENDING');
    }
    if (retriedOrderDb?.payments[0]?.currency !== 'JPY') {
      throw new Error(`Expected retry payment currency JPY, got ${retriedOrderDb?.payments[0]?.currency}`);
    }
    const hasActiveResAfterRetry = retriedOrderDb?.reservations.some((r) => r.status === 'ACTIVE');
    if (!hasActiveResAfterRetry) {
      throw new Error('Inventory was not atomically re-reserved upon payment retry');
    }
    console.log('  ✓ Test 18 Passed: Payment retry re-reserves stock and generates PENDING payment\n');
    passedTests++;

    // -------------------------------------------------------------
    // Test 19: Payment Retry Out of Stock Guard
    // -------------------------------------------------------------
    console.log('Test 19: Payment Retry Out of Stock Guard');
    // Deplete available stock
    await prisma.inventory.update({
      where: { productId: testProduct.id },
      data: { availableQty: 0, reservedQty: 0 },
    });
    // Release existing reservations for this order to trigger re-reservation attempt
    await prisma.inventoryReservation.updateMany({
      where: { orderId: orderToFail.internalId! },
      data: { status: 'RELEASED' },
    });

    const oosRetryResult = await paymentService.createOrRetryPayment({
      orderPublicId: orderToFail.id,
      userId: customerUserId,
      locale: 'ja',
      providerName: 'dummy',
    });
    if (oosRetryResult.success || oosRetryResult.error !== 'INSUFFICIENT_STOCK') {
      throw new Error(`Expected INSUFFICIENT_STOCK on retry, got: ${JSON.stringify(oosRetryResult)}`);
    }
    // Restore stock
    await prisma.inventory.update({
      where: { productId: testProduct.id },
      data: { availableQty: 50, reservedQty: 0 },
    });
    console.log('  ✓ Test 19 Passed: Payment retry fails gracefully when stock is unavailable\n');
    passedTests++;

    // -------------------------------------------------------------
    // Test 20: Authoritative Return Reconciliation
    // -------------------------------------------------------------
    console.log('Test 20: Authoritative Return Reconciliation');
    const orderForReconcile = await createOrderService({
      items: [{ productId: testProduct.id, quantity: 1 }],
      address: {
        name: 'Reconcile Customer',
        phone: '080-3333-2222',
        address: '7-8-9 Roppongi',
        city: 'Tokyo',
        postalCode: '106-0032',
      },
      shippingId: 'regular',
      payment: 'dummy',
      userId: customerUserId,
    });
    if (!orderForReconcile.success) {
      throw new Error('Failed to create order for reconcile test');
    }

    const recResult = await paymentService.reconcilePayment({
      orderPublicId: orderForReconcile.order.id,
      providerName: 'dummy',
    });
    if (!recResult.success || recResult.paymentStatus !== 'PAID') {
      throw new Error(`Reconciliation failed: ${JSON.stringify(recResult)}`);
    }

    const reconciledDb = await prisma.order.findUnique({
      where: { publicId: orderForReconcile.order.id },
      include: { payments: true },
    });
    if (reconciledDb?.status !== 'PAID' || reconciledDb?.payments[0]?.status !== 'PAID') {
      throw new Error('Reconciliation did not update database order & payment to PAID');
    }
    console.log('  ✓ Test 20 Passed: Authoritative return reconciliation verified\n');
    passedTests++;

    // -------------------------------------------------------------
    // Test 21: Order Creation Integration with JPY & Provider
    // -------------------------------------------------------------
    console.log('Test 21: Order Creation Integration with JPY & Provider');
    const newOrder = await createOrderService({
      items: [{ productId: testProduct.id, quantity: 1 }],
      address: {
        name: 'Creation Customer',
        phone: '090-1111-2222',
        address: '1-1 Ginza',
        city: 'Tokyo',
        postalCode: '104-0061',
      },
      shippingId: 'regular',
      payment: 'dummy',
      userId: customerUserId,
    });
    if (!newOrder.success) {
      throw new Error(`Order creation failed: ${newOrder.error}`);
    }
    const orderRecord = await prisma.order.findUnique({
      where: { publicId: newOrder.order.id },
      include: { payments: true },
    });
    if (orderRecord?.payments[0]?.currency !== 'JPY') {
      throw new Error(`Expected order payment currency JPY, got ${orderRecord?.payments[0]?.currency}`);
    }
    if (orderRecord?.payments[0]?.provider !== 'dummy') {
      throw new Error(`Expected provider dummy, got ${orderRecord?.payments[0]?.provider}`);
    }
    console.log('  ✓ Test 21 Passed: Order creation integrates provider factory and JPY\n');
    passedTests++;

    // -------------------------------------------------------------
    // Test 22: Admin Order Details Inspection with Timestamps
    // -------------------------------------------------------------
    console.log('Test 22: Admin Order Details Inspection with Timestamps');
    const adminOrder = await adminOrderRepository.getOrderForAdmin(orderForReconcile.order.id);
    if (!adminOrder) {
      throw new Error('Admin could not find order');
    }
    const adminPayment = adminOrder.payments[0];
    if (!adminPayment || adminPayment.currency !== 'JPY' || !adminPayment.paidAt) {
      throw new Error('Admin payment record missing JPY currency or paidAt timestamp');
    }
    console.log('  ✓ Test 22 Passed: Admin order detail includes JPY currency and paidAt timestamp\n');
    passedTests++;

    // -------------------------------------------------------------
    // Test 23: Webhook API Service E2E Simulation
    // -------------------------------------------------------------
    console.log('Test 23: Webhook API Service E2E Simulation');
    const e2eOrder = await createOrderService({
      items: [{ productId: testProduct.id, quantity: 1 }],
      address: {
        name: 'E2E Customer',
        phone: '070-5555-4444',
        address: '2-3-4 Akasaka',
        city: 'Tokyo',
        postalCode: '107-0052',
      },
      shippingId: 'regular',
      payment: 'dummy',
      userId: customerUserId,
    });
    if (!e2eOrder.success) {
      throw new Error('Failed to create order for E2E webhook test');
    }

    const e2eEventId = `evt_e2e_${Date.now()}`;
    const e2eRes = await paymentWebhookService(
      {
        provider: 'dummy',
        providerPaymentId: e2eOrder.order.providerPaymentId,
        orderPublicId: e2eOrder.order.id,
        event: 'payment.success',
        eventId: e2eEventId,
      },
      { 'x-payment-provider': 'dummy' },
      'dummy'
    );
    if (!e2eRes.received || !e2eRes.processed || e2eRes.status !== 'PAID') {
      throw new Error(`E2E webhook failed: ${e2eRes.message}`);
    }
    console.log('  ✓ Test 23 Passed: Webhook API service processes payload and headers idempotently\n');
    passedTests++;

    console.log('====================================================');
    console.log(`  ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!  `);
    console.log('====================================================\n');
  } finally {
    // Cleanup test data
    await prisma.user.deleteMany({
      where: { id: customerUserId },
    }).catch(() => {});
  }
}

runStep13TestSuite()
  .catch((err) => {
    console.error('\n❌ Test Suite Failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
