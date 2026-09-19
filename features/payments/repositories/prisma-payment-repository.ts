import { prisma } from '@/lib/prisma';
import type { Payment as PrismaPayment } from '@prisma/client';
import type { PaymentRecord, PaymentStatus } from '../types';
import type { CreatePaymentRecordData, PaymentRepository } from './payment-repository';

function mapPrismaPaymentToRecord(payment: PrismaPayment): PaymentRecord {
  return {
    id: payment.id,
    orderId: payment.orderId,
    provider: payment.provider,
    providerPaymentId: payment.providerPaymentId,
    status: payment.status as PaymentStatus,
    amount: payment.amount,
    currency: payment.currency,
    createdAt: payment.createdAt.toISOString(),
    updatedAt: payment.updatedAt.toISOString(),
  };
}

export class PrismaPaymentRepository implements PaymentRepository {
  async createPayment(data: CreatePaymentRecordData): Promise<PaymentRecord> {
    const payment = await prisma.payment.create({
      data: {
        orderId: data.orderId,
        provider: data.provider,
        providerPaymentId: data.providerPaymentId,
        status: data.status,
        amount: data.amount,
        currency: data.currency || 'IDR',
      },
    });
    return mapPrismaPaymentToRecord(payment);
  }

  async getPaymentById(id: string): Promise<PaymentRecord | null> {
    const payment = await prisma.payment.findUnique({
      where: { id },
    });
    return payment ? mapPrismaPaymentToRecord(payment) : null;
  }

  async getPaymentByProviderPaymentId(providerPaymentId: string): Promise<PaymentRecord | null> {
    const payment = await prisma.payment.findUnique({
      where: { providerPaymentId },
    });
    return payment ? mapPrismaPaymentToRecord(payment) : null;
  }

  async getLatestPaymentForOrder(orderId: string): Promise<PaymentRecord | null> {
    const payment = await prisma.payment.findFirst({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    });
    return payment ? mapPrismaPaymentToRecord(payment) : null;
  }

  async updatePaymentStatus(id: string, status: PaymentStatus): Promise<PaymentRecord> {
    const payment = await prisma.payment.update({
      where: { id },
      data: { status },
    });
    return mapPrismaPaymentToRecord(payment);
  }
}

export const prismaPaymentRepository = new PrismaPaymentRepository();
