import { prisma } from '@/lib/prisma';
import { shippingOptions } from '@/lib/marketplace';
import { generateTransactionId } from '../order-storage';
import { prismaOrderRepository } from '../repositories/prisma-order-repository';
import type { CreateOrderServerInput, CreateOrderResult } from '../types';

export async function createOrderService(
  input: CreateOrderServerInput & { userId?: string | null },
  userId?: string | null
): Promise<CreateOrderResult> {
  const effectiveUserId = userId ?? input.userId ?? null;
  try {
    // 1. Validate items
    if (!input.items || input.items.length === 0) {
      return { success: false, error: 'Keranjang belanja kosong.' };
    }

    // 2. Validate address
    const { address } = input;
    if (!address || !address.name?.trim() || !address.phone?.trim() || !address.address?.trim()) {
      return { success: false, error: 'Informasi alamat pengiriman tidak lengkap.' };
    }

    // 3. Validate shipping method (server authoritative pricing)
    const { getShippingProvider } = await import('@/features/shipping/providers/shipping-provider-factory');
    const shippingProvider = getShippingProvider();
    const ratesResult = await shippingProvider.getRates({ address, items: input.items });
    const selectedShippingRate = ratesResult.rates.find(
      (opt) => opt.serviceCode.toLowerCase() === input.shippingId.toLowerCase()
    );

    const fallbackShipping = shippingOptions.find((opt) => opt.id === input.shippingId);
    const selectedShipping = selectedShippingRate
      ? {
          id: selectedShippingRate.serviceCode.toLowerCase(),
          name: selectedShippingRate.serviceName,
          eta: selectedShippingRate.estimatedDelivery,
          price: selectedShippingRate.shippingCost,
        }
      : fallbackShipping;

    if (!selectedShipping) {
      return { success: false, error: 'Metode pengiriman tidak valid.' };
    }

    // 4. Validate payment method
    if (!input.payment?.trim()) {
      return { success: false, error: 'Metode pembayaran harus dipilih.' };
    }

    const locale = input.locale ?? 'id';

    // 5. Look up products from database for authoritative pricing and stock validation
    const itemSnapshots: Array<{
      productId: string;
      quantity: number;
      productName: string;
      productPrice: number;
      productImage: string;
      subtotal: number;
      discountAllocation?: number;
    }> = [];
    let subtotal = 0;

    for (const item of input.items) {
      if (
        !item.productId ||
        typeof item.quantity !== 'number' ||
        !Number.isInteger(item.quantity) ||
        item.quantity <= 0 ||
        item.quantity > 99
      ) {
        return {
          success: false,
          error: `Jumlah barang tidak valid untuk produk ${item.productId}. Harus berupa bilangan bulat antara 1 dan 99.`,
        };
      }

      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        include: { translations: true },
      });

      if (!product) {
        return { success: false, error: `Produk "${item.productId}" tidak ditemukan.` };
      }

      if (product.status !== 'ACTIVE') {
        return {
          success: false,
          error: `Produk "${item.productId}" saat ini tidak tersedia untuk dibeli (status: ${product.status}).`,
        };
      }

      if (item.quantity > product.stock) {
        return {
          success: false,
          error: `Stok produk tidak mencukupi untuk "${item.productId}". Tersedia: ${product.stock}, diminta: ${item.quantity}.`,
        };
      }

      const unitPrice = product.price;
      const itemSubtotal = unitPrice * item.quantity;
      subtotal += itemSubtotal;

      // Find localized name for snapshot
      const matchedTranslation =
        product.translations.find((t) => t.locale === locale) ??
        product.translations.find((t) => t.locale === 'id') ??
        product.translations[0];

      const productName = matchedTranslation?.name ?? product.id;

      itemSnapshots.push({
        productId: product.id,
        quantity: item.quantity,
        productName,
        productPrice: unitPrice,
        productImage: product.image,
        subtotal: itemSubtotal,
        discountAllocation: 0,
      });
    }

    // 5b. Validate coupon and calculate server-authoritative discount
    let discountAmount = 0;
    let promotionId: string | null = null;
    let normalizedCouponCode: string | null = null;

    if (input.couponCode && input.couponCode.trim().length > 0) {
      const { promotionEngine } = await import('@/features/promotions');
      const cartItemsForDiscount = itemSnapshots.map((snap, idx) => ({
        productId: snap.productId,
        categoryId: (input.items[idx] as any).categoryId || '', // Will be matched from product lookup below
        quantity: snap.quantity,
        price: snap.productPrice,
        subtotal: snap.subtotal,
      }));

      // Re-populate categoryId accurately from DB products
      for (const cartItem of cartItemsForDiscount) {
        const prod = await prisma.product.findUnique({
          where: { id: cartItem.productId },
          select: { categoryId: true },
        });
        if (prod) {
          cartItem.categoryId = prod.categoryId;
        }
      }

      const promoResult = await promotionEngine.validateAndCalculateDiscount(
        input.couponCode,
        cartItemsForDiscount,
        effectiveUserId
      );

      if (!promoResult.valid) {
        return {
          success: false,
          error: promoResult.errorMessage || 'Kupon tidak valid atau tidak memenuhi syarat.',
        };
      }

      discountAmount = promoResult.discountAmount;
      promotionId = promoResult.promotion?.id || null;
      normalizedCouponCode = promoResult.promotion?.code || null;

      // Assign discount allocations to item snapshots
      promoResult.itemAllocations.forEach((alloc, idx) => {
        if (itemSnapshots[idx]) {
          itemSnapshots[idx].discountAllocation = alloc.discountAllocation;
        }
      });
    }

    const total = Math.max(0, subtotal - discountAmount) + selectedShipping.price;
    const publicId = generateTransactionId();

    // 6. Opportunistically expire stale inventory reservations
    const { expireInventoryReservationsService, reserveInventoryService, InsufficientStockError } =
      await import('@/features/inventory');
    await expireInventoryReservationsService().catch((err) =>
      console.error('Failed opportunistic inventory expiration:', err)
    );

    // 7. Initialize payment reference via PaymentProvider abstraction
    const { getPaymentProvider } = await import('@/features/payments');
    const paymentProvider = getPaymentProvider();
    const paymentInit = await paymentProvider.createPayment({
      orderId: publicId,
      orderPublicId: publicId,
      amount: total,
      currency: 'JPY',
      locale,
      customerName: address.name.trim(),
    });

    // 8. Atomically persist order, pending payment, and reserve inventory in a single transaction
    const order = await prisma.$transaction(async (tx) => {
      // 8a. Ensure application User record exists idempotently
      if (effectiveUserId) {
        const { ensureUserExists } = await import('@/features/auth/services/user-sync-service');
        await ensureUserExists(effectiveUserId, tx);
      }

      // 8b. Persist order with item snapshots and pending payment
      const createdOrder = await prismaOrderRepository.createOrder(
        {
          publicId,
          userId: effectiveUserId || null,
          recipientName: address.name.trim(),
          recipientPhone: address.phone.trim(),
          recipientAddress: address.address.trim(),
          recipientCity: address.city?.trim() || 'Tokyo',
          recipientPostalCode: address.postalCode?.trim() || '100-0001',
          shippingMethodId: selectedShipping.id,
          shippingMethodName: selectedShipping.name,
          shippingMethodEta: selectedShipping.eta,
          shippingPrice: selectedShipping.price,
          paymentMethod: input.payment.trim(),
          paymentProvider: paymentProvider.providerName,
          currency: 'JPY',
          subtotal,
          discountAmount,
          total,
          promotionId,
          couponCode: normalizedCouponCode,
          status: 'PENDING_PAYMENT',
          providerPaymentId: paymentInit.providerPaymentId,
          items: itemSnapshots,
        },
        tx
      );

      // 8c. Record promotion usage if promotion was applied
      if (promotionId && discountAmount > 0) {
        const { promotionEngine } = await import('@/features/promotions');
        await promotionEngine.recordPromotionUsage(
          tx,
          createdOrder.internalId!,
          promotionId,
          discountAmount,
          effectiveUserId
        );
      }

      // 8d. Atomically reserve inventory (throws InsufficientStockError and rolls back if stock unavailable)
      await reserveInventoryService({
        orderId: createdOrder.internalId!,
        items: input.items,
        tx,
      });

      return createdOrder;
    });

    return {
      success: true,
      order,
      paymentUrl: paymentInit.redirectUrl,
    };
  } catch (error) {
    const { InsufficientStockError } = await import('@/features/inventory');
    if (error instanceof InsufficientStockError) {
      console.warn('Inventory reservation failed during order creation:', error.message);
      return {
        success: false,
        error: `Stok produk tidak mencukupi untuk ${error.productId}. Tersedia: ${error.available}, diminta: ${error.requested}.`,
      };
    }

    console.error('Failed to create order in database:', error);
    return {
      success: false,
      error: 'Terjadi kesalahan sistem saat memproses pesanan. Silakan coba beberapa saat lagi.',
    };
  }
}
