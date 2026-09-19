import { prisma } from '@/lib/prisma';
import type { PaymentStatus, WebhookResult } from '../types';
import { getPaymentProvider } from '../providers/provider-factory';

export interface CreateOrRetryPaymentOptions {
  orderPublicId: string;
  userId: string;
  locale?: string;
  providerName?: string;
}

export interface ReconcilePaymentOptions {
  orderPublicId: string;
  providerPaymentId?: string;
  providerName?: string;
}

export interface ProcessWebhookOptions {
  rawBody: string | Buffer | unknown;
  headers?: Record<string, string | string[] | undefined>;
  providerName?: string;
}

export class PaymentService {
  /**
   * Creates or retries a payment attempt for an order.
   */
  async createOrRetryPayment(options: CreateOrRetryPaymentOptions) {
    const { orderPublicId, userId, locale = 'id', providerName } = options;

    const order = await prisma.order.findFirst({
      where: {
        publicId: orderPublicId,
        userId: userId,
      },
      include: {
        items: true,
        reservations: true,
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!order) {
      return { success: false, error: 'ORDER_NOT_FOUND' };
    }

    if (order.status !== 'PENDING_PAYMENT') {
      return { success: false, error: 'ORDER_NOT_PENDING', currentStatus: order.status };
    }

    const { reserveInventoryService, InsufficientStockError } = await import('@/features/inventory');
    const hasActiveReservation = order.reservations.some((r) => r.status === 'ACTIVE');

    const provider = getPaymentProvider(providerName || order.payments[0]?.provider);

    try {
      // 1. Ensure inventory is reserved (re-reserve if expired or previously released)
      if (!hasActiveReservation) {
        await reserveInventoryService({
          orderId: order.id,
          items: order.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        });
      }

      // 2. Call external payment provider
      const paymentInit = await provider.createPayment({
        orderId: order.id,
        orderPublicId: order.publicId,
        amount: order.total,
        currency: 'JPY',
        locale,
        customerName: order.recipientName,
      });

      if (!paymentInit.success) {
        return {
          success: false,
          error: 'PROVIDER_INIT_FAILED',
          message: paymentInit.error || 'Failed to initialize payment gateway session',
        };
      }

      // 3. Atomically record new PENDING payment attempt in database
      const payment = await prisma.payment.create({
        data: {
          orderId: order.id,
          provider: provider.providerName,
          providerPaymentId: paymentInit.providerPaymentId,
          status: 'PENDING',
          amount: order.total,
          currency: 'JPY',
        },
      });

      return {
        success: true,
        paymentId: payment.id,
        providerPaymentId: paymentInit.providerPaymentId,
        redirectUrl: paymentInit.redirectUrl,
      };
    } catch (err) {
      const { InsufficientStockError } = await import('@/features/inventory');
      if (err instanceof InsufficientStockError) {
        return {
          success: false,
          error: 'INSUFFICIENT_STOCK',
          message: `Stok produk tidak mencukupi untuk ${err.productId}. Tersedia: ${err.available}, diminta: ${err.requested}.`,
        };
      }

      console.error('Error in createOrRetryPayment:', err);
      return { success: false, error: 'SYSTEM_ERROR' };
    }
  }

  /**
   * Reconciles order payment status with authoritative payment provider.
   * Useful for return URL landing pages, background verification, or customer refresh.
   */
  async reconcilePayment(options: ReconcilePaymentOptions) {
    const { orderPublicId, providerPaymentId, providerName } = options;

    const order = await prisma.order.findUnique({
      where: { publicId: orderPublicId },
      include: {
        items: true,
        reservations: true,
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!order) {
      return { success: false, error: 'ORDER_NOT_FOUND' };
    }

    // Identify relevant payment
    const payment = providerPaymentId
      ? order.payments.find((p) => p.providerPaymentId === providerPaymentId) || order.payments[0]
      : order.payments[0];

    if (!payment) {
      return { success: false, error: 'NO_PAYMENT_RECORD' };
    }

    // If already finalized as PAID, return current state idempotently
    if (payment.status === 'PAID' && order.status === 'PAID') {
      return {
        success: true,
        orderPublicId,
        orderStatus: order.status,
        paymentStatus: 'PAID' as PaymentStatus,
      };
    }

    const provider = getPaymentProvider(providerName || payment.provider);
    const verification = await provider.verifyPayment({
      paymentId: payment.id,
      providerPaymentId: providerPaymentId || payment.providerPaymentId || undefined,
    });

    const newPaymentStatus: PaymentStatus = verification.status;
    const newOrderStatus = newPaymentStatus === 'PAID' ? 'PAID' : order.status;

    const { consumeInventoryService, releaseInventoryService } = await import('@/features/inventory');

    await prisma.$transaction(async (tx) => {
      if (newPaymentStatus === 'PAID') {
        await consumeInventoryService({ orderId: order.id, tx });
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: 'PAID',
            paidAt: new Date(verification.paidAt || Date.now()),
          },
        });
        await tx.order.update({
          where: { id: order.id },
          data: { status: 'PAID' },
        });

        if (order.status !== 'PAID') {
          await tx.orderStatusHistory.create({
            data: {
              orderId: order.id,
              fromStatus: order.status,
              toStatus: 'PAID',
              actorType: 'PAYMENT',
              actorId: provider.providerName,
              note: `Payment verified via ${provider.providerName} reconciliation`,
            },
          });
        }
      } else if (newPaymentStatus === 'FAILED' || newPaymentStatus === 'EXPIRED') {
        await releaseInventoryService({ orderId: order.id, tx });
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: newPaymentStatus,
            failedAt: newPaymentStatus === 'FAILED' ? new Date() : undefined,
            expiredAt: newPaymentStatus === 'EXPIRED' ? new Date() : undefined,
          },
        });
      }
    });

    return {
      success: newPaymentStatus === 'PAID',
      orderPublicId,
      orderStatus: newOrderStatus,
      paymentStatus: newPaymentStatus,
    };
  }

  /**
   * Processes incoming webhooks with database-backed idempotency.
   */
  async processWebhook(options: ProcessWebhookOptions): Promise<WebhookResult> {
    const { rawBody, headers, providerName } = options;
    const provider = getPaymentProvider(providerName);

    // 1. Provider handles payload verification and parsing
    const providerResult = await provider.handleWebhook(rawBody, headers);

    if (!providerResult.received || !providerResult.processed) {
      return providerResult;
    }

    const eventId = providerResult.eventId;
    if (!eventId) {
      return {
        received: true,
        processed: false,
        message: 'Webhook payload missing unique event identifier',
      };
    }

    // 2. Database idempotency check using PaymentWebhookEvent
    const existingEvent = await prisma.paymentWebhookEvent.findUnique({
      where: {
        provider_eventId: {
          provider: provider.providerName,
          eventId,
        },
      },
    });

    if (existingEvent) {
      return {
        received: true,
        processed: true,
        eventId,
        status: providerResult.status,
        message: 'Idempotent: webhook event already processed',
      };
    }

    // 3. Resolve order and payment
    const { providerPaymentId, orderPublicId, status: newPaymentStatus = 'PAID' } = providerResult;

    let payment = providerPaymentId
      ? await prisma.payment.findFirst({
          where: { providerPaymentId },
          include: { order: true },
        })
      : null;

    if (!payment && orderPublicId) {
      const order = await prisma.order.findUnique({
        where: { publicId: orderPublicId },
        include: {
          payments: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      });
      if (order && order.payments[0]) {
        payment = { ...order.payments[0], order };
      }
    }

    if (!payment) {
      return {
        received: true,
        processed: false,
        eventId,
        message: `Could not correlate payment record for providerPaymentId=${providerPaymentId} or orderPublicId=${orderPublicId}`,
      };
    }

    // 4. Atomic execution: record event, update payment, update order, synchronize inventory
    const { consumeInventoryService, releaseInventoryService } = await import('@/features/inventory');
    const orderId = payment.orderId;
    const currentOrderStatus = payment.order.status;
    const newOrderStatus = newPaymentStatus === 'PAID' ? 'PAID' : currentOrderStatus;

    await prisma.$transaction(async (tx) => {
      // Record webhook event for idempotency
      await tx.paymentWebhookEvent.create({
        data: {
          provider: provider.providerName,
          eventId,
          eventType: newPaymentStatus,
        },
      });

      // Synchronize inventory
      if (newPaymentStatus === 'PAID') {
        await consumeInventoryService({ orderId, tx });
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: 'PAID',
            paidAt: new Date(),
          },
        });
        await tx.order.update({
          where: { id: orderId },
          data: { status: 'PAID' },
        });

        if (currentOrderStatus !== 'PAID') {
          await tx.orderStatusHistory.create({
            data: {
              orderId,
              fromStatus: currentOrderStatus,
              toStatus: 'PAID',
              actorType: 'PAYMENT',
              actorId: provider.providerName,
              note: `Payment completed via ${provider.providerName} webhook (${eventId})`,
            },
          });
        }
      } else if (newPaymentStatus === 'FAILED' || newPaymentStatus === 'EXPIRED') {
        await releaseInventoryService({ orderId, tx });
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: newPaymentStatus,
            failedAt: newPaymentStatus === 'FAILED' ? new Date() : undefined,
            expiredAt: newPaymentStatus === 'EXPIRED' ? new Date() : undefined,
          },
        });
      }
    });

    return {
      received: true,
      processed: true,
      eventId,
      paymentId: payment.id,
      status: newPaymentStatus,
      message: `Webhook processed successfully for ${eventId}`,
    };
  }
}

export const paymentService = new PaymentService();
