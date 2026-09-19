import { prisma } from '../lib/prisma';
import { cancellationService } from '../features/cancellations/services/cancellation-service';
import {
  canDirectlyCancel,
  canRequestCancellation,
  isCancellationProhibited,
} from '../features/cancellations/domain/cancellation-policy';
import { refundService } from '../features/refunds/services/refund-service';
import { returnService } from '../features/returns/services/return-service';
import {
  canTransitionReturn,
  assertValidReturnTransition,
  InvalidReturnTransitionError,
  canOrderInitiateReturn,
} from '../features/returns/domain/return-state-machine';
import { DummyPaymentProvider } from '../features/payments/providers/dummy-payment-provider';
import { StripePaymentProvider } from '../features/payments/providers/stripe-payment-provider';
import { prismaOrderRepository } from '../features/orders/repositories/prisma-order-repository';
import { adminOrderRepository } from '../features/orders/repositories/admin-order-repository';
import { reserveInventoryService } from '../features/inventory/services/reserve-inventory-service';
import { consumeInventoryService } from '../features/inventory/services/consume-inventory-service';
import { returnRepository } from '../features/returns/repositories/prisma-return-repository';

async function main() {
  console.log('===============================================================');
  console.log('STEP 15 TEST SUITE: REFUNDS, RETURNS & CANCELLATION');
  console.log('===============================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, message: string) {
    totalTests++;
    if (!condition) {
      console.error(`  ❌ FAILED: ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
    console.log(`  ✓ Passed: ${message}`);
    passedTests++;
  }

  try {
    // -------------------------------------------------------------
    // Setup Test Product & Baseline Inventory
    // -------------------------------------------------------------
    console.log('--- SETUP TEST DATA ---');
    const existingProducts = await prisma.product.findMany({ take: 2 });
    if (existingProducts.length < 2) {
      throw new Error('Expected at least 2 seeded products in database');
    }

    const testProduct = existingProducts[0];
    const testProduct2 = existingProducts[1];

    await prisma.inventory.upsert({
      where: { productId: testProduct.id },
      update: { availableQty: 100, reservedQty: 0 },
      create: { productId: testProduct.id, availableQty: 100, reservedQty: 0 },
    });
    await prisma.product.update({ where: { id: testProduct.id }, data: { stock: 100 } });

    await prisma.inventory.upsert({
      where: { productId: testProduct2.id },
      update: { availableQty: 100, reservedQty: 0 },
      create: { productId: testProduct2.id, availableQty: 100, reservedQty: 0 },
    });
    await prisma.product.update({ where: { id: testProduct2.id }, data: { stock: 100 } });

    console.log(`Using products ${testProduct.id} and ${testProduct2.id} for Step 15 test suite.\n`);

    // =============================================================
    // SECTION 1: CANCELLATION POLICY & DIRECT UNPAID CANCELLATION
    // =============================================================
    console.log('--- SECTION 1: CANCELLATION POLICY & UNPAID CANCELLATION ---');

    assert(canDirectlyCancel('PENDING_PAYMENT') === true, 'canDirectlyCancel is true for PENDING_PAYMENT');
    assert(canDirectlyCancel('PAID') === false, 'canDirectlyCancel is false for PAID');
    assert(canRequestCancellation('PAID') === true, 'canRequestCancellation is true for PAID');
    assert(canRequestCancellation('PROCESSING') === true, 'canRequestCancellation is true for PROCESSING');
    assert(canRequestCancellation('PACKED') === true, 'canRequestCancellation is true for PACKED');
    assert(isCancellationProhibited('SHIPPED') === true, 'Cancellation is prohibited for SHIPPED');
    assert(isCancellationProhibited('DELIVERED') === true, 'Cancellation is prohibited for DELIVERED');

    // Create an unpaid order with active inventory reservation
    const unpaidOrder = await prisma.order.create({
      data: {
        publicId: `ORD-TEST-UNPAID-${Date.now()}`,
        status: 'PENDING_PAYMENT',
        recipientName: 'Unpaid Customer',
        recipientPhone: '0812345678',
        recipientAddress: 'Tokyo, Japan',
        recipientCity: 'Tokyo',
        recipientPostalCode: '100-0001',
        shippingMethodId: 'std',
        shippingMethodName: 'Standard Courier',
        shippingMethodEta: '2-3 days',
        shippingPrice: 500,
        paymentMethod: 'dummy',
        subtotal: 3000,
        total: 3500,
        items: {
          create: [
            {
              productId: testProduct.id,
              quantity: 2,
              productName: testProduct.id,
              productPrice: testProduct.price,
              productImage: testProduct.image,
              subtotal: 3000,
            },
          ],
        },
      },
    });

    // Reserve inventory
    await reserveInventoryService({
      orderId: unpaidOrder.id,
      items: [{ productId: testProduct.id, quantity: 2 }],
    });

    const invAfterReserve = await prisma.inventory.findUnique({ where: { productId: testProduct.id } });
    assert(invAfterReserve!.reservedQty === 2, 'Inventory reservation holds 2 items for unpaid order');

    // Direct cancel unpaid order
    const cancelUnpaidRes = await cancellationService.cancelUnpaidOrder({
      orderId: unpaidOrder.id,
      reason: 'Customer cancelled before payment',
    });

    assert(cancelUnpaidRes.success === true, 'Direct cancel unpaid order succeeds');
    assert(cancelUnpaidRes.orderStatus === 'CANCELLED', 'Order status updated to CANCELLED');

    const invAfterCancel = await prisma.inventory.findUnique({ where: { productId: testProduct.id } });
    assert(invAfterCancel!.reservedQty === 0, 'Active inventory reservations released upon unpaid cancellation');

    // Idempotency check: cancelling already cancelled unpaid order
    const cancelIdempotent = await cancellationService.cancelUnpaidOrder({
      orderId: unpaidOrder.id,
    });
    assert(cancelIdempotent.success === true, 'Cancelling already cancelled order is idempotent');

    console.log('Section 1 Passed!\n');

    // =============================================================
    // SECTION 2: PAID PRE-SHIPMENT CANCELLATION & INVENTORY RESTORATION
    // =============================================================
    console.log('--- SECTION 2: PAID PRE-SHIPMENT CANCELLATION ---');

    // Create a paid order
    const paidOrder = await prisma.order.create({
      data: {
        publicId: `ORD-TEST-PAID-${Date.now()}`,
        status: 'PAID',
        recipientName: 'Paid Customer',
        recipientPhone: '0812345678',
        recipientAddress: 'Shinjuku, Tokyo',
        recipientCity: 'Tokyo',
        recipientPostalCode: '160-0022',
        shippingMethodId: 'std',
        shippingMethodName: 'Standard Courier',
        shippingMethodEta: '2-3 days',
        shippingPrice: 500,
        paymentMethod: 'dummy',
        subtotal: 3000,
        total: 3500,
        items: {
          create: [
            {
              productId: testProduct.id,
              quantity: 2,
              productName: testProduct.id,
              productPrice: testProduct.price,
              productImage: testProduct.image,
              subtotal: 3000,
            },
          ],
        },
        payments: {
          create: {
            provider: 'dummy',
            providerPaymentId: `DUMMY-PAY-${Date.now()}-paid`,
            status: 'PAID',
            amount: 3500,
            currency: 'JPY',
          },
        },
      },
    });

    // Reserve and consume inventory as happens on payment
    await reserveInventoryService({
      orderId: paidOrder.id,
      items: [{ productId: testProduct.id, quantity: 2 }],
    });
    await consumeInventoryService({ orderId: paidOrder.id });

    const invAfterConsume = await prisma.inventory.findUnique({ where: { productId: testProduct.id } });
    const prodAfterConsume = await prisma.product.findUnique({ where: { id: testProduct.id } });
    assert(prodAfterConsume!.stock === 98, 'Product stock reduced to 98 after payment consumption');
    assert(invAfterConsume!.availableQty === 98, 'Available inventory reduced to 98 after payment consumption');

    // Customer requests cancellation
    const cancelReq = await cancellationService.requestCancellation({
      orderPublicId: paidOrder.publicId,
      reason: 'Found cheaper alternative',
      customerNote: 'Please process refund to my card',
    });
    assert(cancelReq.success === true, 'Customer cancellation request submitted');
    assert(cancelReq.cancellation?.status === 'REQUESTED', 'Cancellation record status is REQUESTED');

    // Duplicate cancellation request idempotency
    const dupCancelReq = await cancellationService.requestCancellation({
      orderPublicId: paidOrder.publicId,
      reason: 'Found cheaper alternative',
    });
    assert(dupCancelReq.success === true, 'Duplicate cancellation request returns idempotent success');

    // Admin approves cancellation: executes full refund, restores consumed stock, sets CANCELLED
    const approveRes = await cancellationService.approveCancellation({
      cancellationId: cancelReq.cancellation!.id,
      adminUserId: 'admin-user-001',
      adminNote: 'Refund approved by store manager',
    });

    assert(approveRes.success === true, 'Admin cancellation approval succeeds');
    assert(approveRes.orderStatus === 'CANCELLED', 'Order status transitions to CANCELLED');
    assert(approveRes.cancellation?.status === 'APPROVED', 'Cancellation record status is APPROVED');

    // Verify refund was created
    const refundsForOrder = await prisma.refund.findMany({ where: { orderId: paidOrder.id } });
    assert(refundsForOrder.length === 1, 'Exactly one refund record created');
    assert(refundsForOrder[0].amount === 3500, 'Full order total (¥3,500) refunded');
    assert(refundsForOrder[0].status === 'SUCCEEDED', 'Refund status is SUCCEEDED');

    // Verify consumed stock was restored
    const invAfterRestore = await prisma.inventory.findUnique({ where: { productId: testProduct.id } });
    const prodAfterRestore = await prisma.product.findUnique({ where: { id: testProduct.id } });
    assert(prodAfterRestore!.stock === 100, 'Product stock restored back to 100');
    assert(invAfterRestore!.availableQty === 100, 'Available inventory restored back to 100');

    // Section 2.b: Admin rejection of cancellation request
    const rejectedOrder = await prisma.order.create({
      data: {
        publicId: `ORD-TEST-REJECT-${Date.now()}`,
        status: 'PAID',
        recipientName: 'Reject Customer',
        recipientPhone: '0812345678',
        recipientAddress: 'Shinjuku, Tokyo',
        recipientCity: 'Tokyo',
        recipientPostalCode: '160-0022',
        shippingMethodId: 'std',
        shippingMethodName: 'Standard',
        shippingMethodEta: '2-3 days',
        shippingPrice: 500,
        paymentMethod: 'dummy',
        subtotal: 1500,
        total: 2000,
        items: {
          create: [
            {
              productId: testProduct.id,
              quantity: 1,
              productName: testProduct.id,
              productPrice: testProduct.price,
              productImage: testProduct.image,
              subtotal: 1500,
            },
          ],
        },
      },
    });

    const rejectReq = await cancellationService.requestCancellation({
      orderPublicId: rejectedOrder.publicId,
      reason: 'Ordered by mistake',
    });

    const rejectRes = await cancellationService.rejectCancellation({
      cancellationId: rejectReq.cancellation!.id,
      adminUserId: 'admin-001',
      adminNote: 'Order is already customized and cannot be cancelled',
    });

    assert(rejectRes.success === true, 'Admin rejection succeeds');
    assert(rejectRes.cancellation?.status === 'REJECTED', 'Cancellation record status is REJECTED');

    console.log('Section 2 Passed!\n');

    // =============================================================
    // SECTION 3: REFUND DOMAIN & PAYMENT PROVIDER INTEGRATION
    // =============================================================
    console.log('--- SECTION 3: REFUND DOMAIN & PROVIDERS ---');

    // Provider unit tests
    const dummyProvider = new DummyPaymentProvider();
    const dummyRefundRes = await dummyProvider.refundPayment({
      paymentId: 'pay_dummy_test',
      orderId: 'ord_dummy_test',
      orderPublicId: 'ORD-DUMMY-TEST',
      providerPaymentId: 'DUMMY-PAY-999',
      amount: 1500,
      currency: 'JPY',
      reason: 'Customer return',
    });
    assert(dummyRefundRes.success === true, 'DummyPaymentProvider refund succeeds');
    assert(dummyRefundRes.status === 'SUCCEEDED', 'Dummy refund status is SUCCEEDED');
    assert(dummyRefundRes.providerRefundId?.startsWith('DUMMY-REFUND-') === true, 'Dummy refund ID prefix matches');

    const stripeProvider = new StripePaymentProvider();
    const stripeRefundRes = await stripeProvider.refundPayment({
      paymentId: 'pay_stripe_test',
      orderId: 'ord_stripe_test',
      orderPublicId: 'ORD-STRIPE-TEST',
      providerPaymentId: 'pi_test_12345',
      amount: 2500,
      currency: 'JPY',
      reason: 'Damaged item',
    });
    assert(stripeRefundRes.success === true, 'StripePaymentProvider refund handles zero-decimal JPY and sandbox fallback');

    // Balance checks with partial refunds
    const multiRefundOrder = await prisma.order.create({
      data: {
        publicId: `ORD-TEST-REFUND-BAL-${Date.now()}`,
        status: 'PAID',
        recipientName: 'Balance Check Customer',
        recipientPhone: '0812345678',
        recipientAddress: 'Osaka, Japan',
        recipientCity: 'Osaka',
        recipientPostalCode: '530-0001',
        shippingMethodId: 'std',
        shippingMethodName: 'Standard',
        shippingMethodEta: '2-3 days',
        shippingPrice: 500,
        paymentMethod: 'dummy',
        subtotal: 5000,
        total: 5500,
        payments: {
          create: {
            provider: 'dummy',
            providerPaymentId: `DUMMY-PAY-${Date.now()}-bal`,
            status: 'PAID',
            amount: 5500,
            currency: 'JPY',
          },
        },
      },
    });

    const bal1 = await refundService.calculateRefundableAmount(multiRefundOrder.id);
    assert(bal1.refundableAmount === 5500, 'Initial refundable amount is full captured total ¥5,500');

    // 1st partial refund of ¥2,000
    const part1 = await refundService.processRefund({
      orderId: multiRefundOrder.id,
      amount: 2000,
      reason: 'First partial refund',
      actorType: 'ADMIN',
      actorId: 'admin-001',
    });
    assert(part1.success === true, 'First partial refund of ¥2,000 succeeds');

    const bal2 = await refundService.calculateRefundableAmount(multiRefundOrder.id);
    assert(bal2.refundableAmount === 3500, 'Remaining refundable amount is exactly ¥3,500');

    // Attempt refund of ¥4,000 (exceeds balance of ¥3,500)
    const excessRefund = await refundService.processRefund({
      orderId: multiRefundOrder.id,
      amount: 4000,
      reason: 'Excessive refund attempt',
    });
    assert(excessRefund.success === false, 'Refund exceeding balance is rejected server-side');
    assert(excessRefund.error?.includes('exceeds') === true, 'Error message indicates balance exceeded');

    // 2nd partial refund of remaining ¥3,500
    const part2 = await refundService.processRefund({
      orderId: multiRefundOrder.id,
      amount: 3500,
      reason: 'Second partial refund to exhaust balance',
      actorType: 'ADMIN',
      actorId: 'admin-001',
    });
    assert(part2.success === true, 'Second partial refund of ¥3,500 succeeds');

    const bal3 = await refundService.calculateRefundableAmount(multiRefundOrder.id);
    assert(bal3.refundableAmount === 0, 'Remaining refundable balance is now 0');

    console.log('Section 3 Passed!\n');

    // =============================================================
    // SECTION 4: RETURN DOMAIN & LIFECYCLE
    // =============================================================
    console.log('--- SECTION 4: RETURN DOMAIN & LIFECYCLE ---');

    // State machine transitions
    assert(canTransitionReturn('RETURN_REQUESTED', 'RETURN_APPROVED') === true, 'RETURN_REQUESTED -> RETURN_APPROVED is valid');
    assert(canTransitionReturn('RETURN_APPROVED', 'RETURN_IN_TRANSIT') === true, 'RETURN_APPROVED -> RETURN_IN_TRANSIT is valid');
    assert(canTransitionReturn('RETURN_IN_TRANSIT', 'RETURN_RECEIVED') === true, 'RETURN_IN_TRANSIT -> RETURN_RECEIVED is valid');
    assert(canTransitionReturn('RETURN_RECEIVED', 'COMPLETED') === true, 'RETURN_RECEIVED -> COMPLETED is valid');
    assert(canTransitionReturn('RETURN_REQUESTED', 'COMPLETED') === false, 'RETURN_REQUESTED -> COMPLETED directly is invalid');

    try {
      assertValidReturnTransition('RETURN_REQUESTED', 'COMPLETED');
      assert(false, 'Should have thrown InvalidReturnTransitionError');
    } catch (e) {
      assert(e instanceof InvalidReturnTransitionError, 'Throws InvalidReturnTransitionError on invalid transition');
    }

    assert(canOrderInitiateReturn('DELIVERED') === true, 'DELIVERED order can initiate return');
    assert(canOrderInitiateReturn('PAID') === false, 'PAID order cannot initiate return');
    assert(canOrderInitiateReturn('SHIPPED') === false, 'SHIPPED order cannot initiate return');

    // Create a DELIVERED order with 2 items
    const deliveredOrder = await prisma.order.create({
      data: {
        publicId: `ORD-TEST-RETURN-${Date.now()}`,
        status: 'DELIVERED',
        recipientName: 'Delivered Customer',
        recipientPhone: '0812345678',
        recipientAddress: 'Kyoto, Japan',
        recipientCity: 'Kyoto',
        recipientPostalCode: '600-8001',
        shippingMethodId: 'std',
        shippingMethodName: 'Standard',
        shippingMethodEta: '2-3 days',
        shippingPrice: 500,
        paymentMethod: 'dummy',
        subtotal: 7000,
        total: 7500,
        items: {
          create: [
            {
              productId: testProduct.id,
              quantity: 2, // 2 x 1500 = 3000
              productName: testProduct.id,
              productPrice: testProduct.price,
              productImage: testProduct.image,
              subtotal: 3000,
            },
            {
              productId: testProduct2.id,
              quantity: 2, // 2 x 2000 = 4000
              productName: testProduct2.id,
              productPrice: testProduct2.price,
              productImage: testProduct2.image,
              subtotal: 4000,
            },
          ],
        },
        payments: {
          create: {
            provider: 'dummy',
            providerPaymentId: `DUMMY-PAY-${Date.now()}-ret`,
            status: 'PAID',
            amount: 7500,
            currency: 'JPY',
          },
        },
      },
      include: {
        items: true,
      },
    });

    const item1 = deliveredOrder.items.find((it) => it.productId === testProduct.id)!;

    // Validation: Quantity > purchased
    const invalidQtyRes = await returnService.requestReturn({
      orderPublicId: deliveredOrder.publicId,
      reason: 'Damaged',
      items: [{ orderItemId: item1.id, quantity: 5 }],
    });
    assert(invalidQtyRes.success === false, 'Return request with quantity exceeding purchase is rejected');

    // Valid Return Request: 1 of item1
    const initialInvProduct1 = await prisma.inventory.findUnique({ where: { productId: testProduct.id } });
    const initialProd1 = await prisma.product.findUnique({ where: { id: testProduct.id } });
    const reqReturnRes = await returnService.requestReturn({
      orderPublicId: deliveredOrder.publicId,
      reason: 'Damaged item',
      customerNote: 'Item arrived with crushed packaging',
      items: [{ orderItemId: item1.id, quantity: 1 }],
    });

    assert(reqReturnRes.success === true, 'Customer return request submitted successfully');
    const returnRecord = reqReturnRes.returnRecord!;
    assert(returnRecord.status === 'RETURN_REQUESTED', 'Return status is RETURN_REQUESTED');

    // CRUCIAL: Inventory must NOT be touched on return request
    const invAfterReq = await prisma.inventory.findUnique({ where: { productId: testProduct.id } });
    assert(invAfterReq!.availableQty === initialInvProduct1!.availableQty, 'Inventory NOT restored upon return request');

    // Admin approves return
    const appReturnRes = await returnService.approveReturn({
      returnId: returnRecord.id,
      adminUserId: 'admin-001',
      adminNote: 'Return approved, please send back via standard courier',
    });
    assert(appReturnRes.success === true, 'Admin return approval succeeds');
    assert(appReturnRes.returnRecord?.status === 'RETURN_APPROVED', 'Return status is RETURN_APPROVED');

    // CRUCIAL: Inventory must NOT be touched on return approval
    const invAfterApp = await prisma.inventory.findUnique({ where: { productId: testProduct.id } });
    assert(invAfterApp!.availableQty === initialInvProduct1!.availableQty, 'Inventory NOT restored upon return approval');

    // Mark in transit
    const inTransitRes = await returnService.markReturnInTransit({
      returnId: returnRecord.id,
      actorType: 'CUSTOMER',
    });
    assert(inTransitRes.success === true, 'Return marked in transit succeeds');
    assert(inTransitRes.returnRecord?.status === 'RETURN_IN_TRANSIT', 'Return status is RETURN_IN_TRANSIT');

    // CRUCIAL: Inventory must NOT be touched while in transit
    const invAfterTransit = await prisma.inventory.findUnique({ where: { productId: testProduct.id } });
    assert(invAfterTransit!.availableQty === initialInvProduct1!.availableQty, 'Inventory NOT restored while in transit');

    // Admin receives return: inventory IS restored and proportional refund is executed
    const receiveRes = await returnService.receiveReturn({
      returnId: returnRecord.id,
      adminUserId: 'admin-001',
      adminNote: 'Package inspected, goods received in returnable condition',
      autoRefund: true,
    });

    assert(receiveRes.success === true, 'Admin receives return successfully');
    assert(receiveRes.returnRecord?.status === 'COMPLETED', 'Return transitions to COMPLETED upon receipt');

    // CRUCIAL: Inventory IS restored now!
    const invAfterReceive = await prisma.inventory.findUnique({ where: { productId: testProduct.id } });
    const prodAfterReceive = await prisma.product.findUnique({ where: { id: testProduct.id } });
    assert(invAfterReceive!.availableQty === initialInvProduct1!.availableQty + 1, 'Inventory restored by 1 upon physical receipt');
    assert(prodAfterReceive!.stock === initialProd1!.stock + 1, 'Product stock restored by 1 upon physical receipt');

    // Verify proportional refund was issued
    assert(receiveRes.refund !== null, 'Proportional refund was generated');
    assert(receiveRes.refund?.amount === testProduct.price, `Refund amount matches returned item price ¥${testProduct.price}`);
    assert(receiveRes.refund?.status === 'SUCCEEDED', 'Refund status is SUCCEEDED');

    // Remaining returnable check: can return the 2nd unit of item1, but NOT 2 units
    const secondReqFail = await returnService.requestReturn({
      orderPublicId: deliveredOrder.publicId,
      reason: 'Another unit return attempt',
      items: [{ orderItemId: item1.id, quantity: 2 }], // only 1 remaining!
    });
    assert(secondReqFail.success === false, 'Cannot return more than remaining unreturned quantity');

    const secondReqSuccess = await returnService.requestReturn({
      orderPublicId: deliveredOrder.publicId,
      reason: 'Returning second unit',
      items: [{ orderItemId: item1.id, quantity: 1 }],
    });
    assert(secondReqSuccess.success === true, 'Can return the remaining 1 unit of item 1');

    // Customer cancels this second return request
    const cancelReturnRes = await returnService.cancelReturn({
      returnId: secondReqSuccess.returnRecord!.id,
      actorType: 'CUSTOMER',
    });
    assert(cancelReturnRes.success === true, 'Customer can cancel return request before receipt');
    assert(cancelReturnRes.returnRecord?.status === 'RETURN_CANCELLED', 'Return status is RETURN_CANCELLED');

    console.log('Section 4 Passed!\n');

    // =============================================================
    // SECTION 5: REPOSITORIES & END-TO-END DATA ACCESS
    // =============================================================
    console.log('--- SECTION 5: REPOSITORIES & DATA ACCESS ---');

    const fetchedOrder = await prismaOrderRepository.getOrderByPublicId(deliveredOrder.publicId);
    assert(fetchedOrder !== undefined, 'Order retrieved by publicId via prismaOrderRepository');
    assert(Array.isArray(fetchedOrder!.returns), 'Returns array included in order domain model');
    assert(fetchedOrder!.returns!.length === 2, 'Both returns attached to fetched order');
    assert(Array.isArray(fetchedOrder!.refunds), 'Refunds array included in order domain model');
    assert(fetchedOrder!.refunds!.length === 1, 'Refund record attached to fetched order');

    const adminOrderDetail = await adminOrderRepository.getOrderForAdmin(deliveredOrder.id);
    assert(adminOrderDetail !== null, 'Admin order details retrieved via adminOrderRepository');
    assert(Array.isArray(adminOrderDetail!.returns), 'Admin order includes returns');
    assert(Array.isArray(adminOrderDetail!.refunds), 'Admin order includes refunds');

    const repositoryUserId = `step15-return-user-${Date.now()}`;
    await prisma.user.create({ data: { id: repositoryUserId, role: 'CUSTOMER' } });
    await prisma.order.update({
      where: { id: deliveredOrder.id },
      data: { userId: repositoryUserId },
    });

    const customerReturns = await returnRepository.getReturnsByUserId(repositoryUserId);
    assert(customerReturns.total === 2, 'Customer return repository is scoped through order ownership');
    assert(customerReturns.returns.every((ret) => ret.order.userId === repositoryUserId), 'Customer return rows include only the requested user');

    const requestedReturns = await returnRepository.getAllReturns({ status: 'RETURN_REQUESTED' });
    assert(requestedReturns.returns.every((ret) => ret.status === 'RETURN_REQUESTED'), 'Admin return repository applies status filters');

    const returnDetail = await returnRepository.getReturnById(returnRecord.id);
    assert(returnDetail?.order.publicId === deliveredOrder.publicId, 'Return detail repository includes its order reference');
    assert(returnDetail?.items[0].orderItem.productName === item1.productName, 'Return detail repository includes historical item data');

    console.log('Section 5 Passed!\n');

    console.log('===============================================================');
    console.log(`ALL TESTS PASSED! (${passedTests}/${totalTests} assertions passed)`);
    console.log('===============================================================');
  } catch (error) {
    console.error('\nTest execution encountered an error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

void main();
