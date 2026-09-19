import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { getPaymentProvider } from '@/features/payments/providers/provider-factory';
import type {
  RefundRecord,
  CalculateRefundableAmountResult,
  ProcessRefundOptions,
  ProcessRefundResult,
} from '../types';

export class RefundService {
  /**
   * Authoritatively computes the refundable amount for an order or payment.
   * refundableAmount = capturedAmount - totalSuccessfulRefunds
   */
  async calculateRefundableAmount(
    orderId: string,
    tx?: Prisma.TransactionClient
  ): Promise<CalculateRefundableAmountResult> {
    const db = tx || prisma;

    const order = await db.order.findFirst({
      where: {
        OR: [{ id: orderId }, { publicId: orderId }],
      },
      include: {
        payments: {
          where: { status: 'PAID' },
          orderBy: { createdAt: 'desc' },
        },
        refunds: {
          where: { status: 'SUCCEEDED' },
        },
      },
    });

    if (!order) {
      return {
        capturedAmount: 0,
        totalRefunded: 0,
        refundableAmount: 0,
        currency: 'JPY',
      };
    }

    const capturedAmount = order.payments.reduce((sum, p) => sum + p.amount, 0);
    const totalRefunded = order.refunds.reduce((sum, r) => sum + r.amount, 0);
    const refundableAmount = Math.max(0, capturedAmount - totalRefunded);

    return {
      capturedAmount,
      totalRefunded,
      refundableAmount,
      currency: 'JPY',
    };
  }

  /**
   * Processes a full or partial refund for an order.
   * Atomically validates refundable amount, calls payment provider, persists refund record,
   * and creates audit entry.
   */
  async processRefund(options: ProcessRefundOptions): Promise<ProcessRefundResult> {
    const {
      orderId,
      paymentId,
      amount,
      reason,
      returnId,
      actorType = 'ADMIN',
      actorId = null,
      tx: explicitTx,
    } = options;

    if (amount <= 0 || !Number.isInteger(amount)) {
      return {
        success: false,
        error: 'Refund amount must be a positive integer in JPY',
      };
    }

    const runner = async (tx: Prisma.TransactionClient) => {
      // 1. Fetch order with payments and existing refunds
      const order = await tx.order.findFirst({
        where: {
          OR: [{ id: orderId }, { publicId: orderId }],
        },
        include: {
          payments: {
            where: { status: 'PAID' },
            orderBy: { createdAt: 'desc' },
          },
          refunds: {
            where: { status: 'SUCCEEDED' },
          },
        },
      });

      if (!order) {
        return { success: false, error: 'Order not found' };
      }

      const verifiedPayment = paymentId
        ? order.payments.find((p) => p.id === paymentId)
        : order.payments[0];

      if (!verifiedPayment) {
        return {
          success: false,
          error: 'No verified PAID payment record found for this order',
        };
      }

      // 2. Validate refundable amount
      const capturedAmount = order.payments.reduce((sum, p) => sum + p.amount, 0);
      const totalRefunded = order.refunds.reduce((sum, r) => sum + r.amount, 0);
      const refundableAmount = Math.max(0, capturedAmount - totalRefunded);

      if (amount > refundableAmount) {
        return {
          success: false,
          error: `Requested refund of ¥${amount} exceeds refundable balance of ¥${refundableAmount}`,
          refundableAmount,
        };
      }

      // 3. Create pending Refund record
      const pendingRefund = await tx.refund.create({
        data: {
          orderId: order.id,
          paymentId: verifiedPayment.id,
          amount,
          currency: 'JPY',
          status: 'PENDING',
          reason: reason || null,
          returnId: returnId || null,
        },
      });

      // 4. Execute refund with PaymentProvider
      const provider = getPaymentProvider(verifiedPayment.provider);
      const providerResult = await provider.refundPayment({
        paymentId: verifiedPayment.id,
        providerPaymentId: verifiedPayment.providerPaymentId,
        orderId: order.id,
        orderPublicId: order.publicId,
        amount,
        currency: 'JPY',
        reason: reason || undefined,
        idempotencyKey: `ref-tx-${pendingRefund.id}`,
      });

      if (!providerResult.success) {
        await tx.refund.update({
          where: { id: pendingRefund.id },
          data: {
            status: 'FAILED',
          },
        });

        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            fromStatus: order.status,
            toStatus: order.status,
            actorType,
            actorId,
            note: `Refund attempt failed: ${providerResult.error || 'Provider rejected refund'}`,
          },
        });

        return {
          success: false,
          error: providerResult.error || 'Provider rejected refund',
          refundableAmount,
        };
      }

      // 5. Update refund to SUCCEEDED
      const updatedRefund = await tx.refund.update({
        where: { id: pendingRefund.id },
        data: {
          status: 'SUCCEEDED',
          providerRefundId: providerResult.providerRefundId,
          processedAt: new Date(),
        },
      });

      // 6. Record in OrderStatusHistory
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: order.status,
          toStatus: order.status,
          actorType: 'PAYMENT',
          actorId: provider.providerName,
          note: `Refund of ¥${amount.toLocaleString()} processed successfully. Ref: ${providerResult.providerRefundId}`,
        },
      });

      return {
        success: true,
        refund: updatedRefund as RefundRecord,
        refundableAmount: refundableAmount - amount,
      };
    };

    return explicitTx
      ? runner(explicitTx)
      : prisma.$transaction(runner, { maxWait: 10_000, timeout: 60_000 });
  }
}

export const refundService = new RefundService();
