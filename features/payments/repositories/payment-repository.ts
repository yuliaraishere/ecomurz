import type { PaymentRecord, PaymentStatus } from '../types';

export interface CreatePaymentRecordData {
  orderId: string;
  provider: string;
  providerPaymentId?: string | null;
  status: PaymentStatus;
  amount: number;
  currency?: string;
}

export interface PaymentRepository {
  createPayment(data: CreatePaymentRecordData): Promise<PaymentRecord>;
  getPaymentById(id: string): Promise<PaymentRecord | null>;
  getPaymentByProviderPaymentId(providerPaymentId: string): Promise<PaymentRecord | null>;
  getLatestPaymentForOrder(orderId: string): Promise<PaymentRecord | null>;
  updatePaymentStatus(id: string, status: PaymentStatus): Promise<PaymentRecord>;
}
