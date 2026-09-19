export type RefundStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'CANCELLED';

export interface RefundRecord {
  id: string;
  orderId: string;
  paymentId: string;
  providerRefundId?: string | null;
  status: RefundStatus;
  amount: number;
  currency: string;
  reason?: string | null;
  returnId?: string | null;
  processedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CalculateRefundableAmountResult {
  capturedAmount: number;
  totalRefunded: number;
  refundableAmount: number;
  currency: string;
}

export interface ProcessRefundOptions {
  orderId: string;
  paymentId?: string;
  amount: number;
  currency?: string;
  reason?: string;
  returnId?: string;
  actorType?: 'ADMIN' | 'SYSTEM' | 'PAYMENT' | 'CUSTOMER';
  actorId?: string | null;
  tx?: Prisma.TransactionClient;
}

export interface ProcessRefundResult {
  success: boolean;
  refund?: RefundRecord;
  error?: string;
  refundableAmount?: number;
}
import type { Prisma } from '@prisma/client';
