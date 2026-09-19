export type PaymentStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'PAID'
  | 'FAILED'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'REFUNDED';

export interface PaymentRecord {
  id: string;
  orderId: string;
  provider: string;
  providerPaymentId?: string | null;
  status: PaymentStatus;
  amount: number;
  currency: string;
  paidAt?: string | null;
  failedAt?: string | null;
  expiredAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentInput {
  orderId: string;
  orderPublicId: string;
  amount: number;
  currency?: string;
  locale?: string;
  customerEmail?: string;
  customerName?: string;
  returnUrl?: string;
}

export interface CreatePaymentResult {
  success: boolean;
  paymentId: string;
  providerPaymentId: string;
  redirectUrl: string;
  error?: string;
}

export interface VerifyPaymentInput {
  paymentId?: string;
  providerPaymentId?: string;
}

export interface VerifyPaymentResult {
  success: boolean;
  status: PaymentStatus;
  providerPaymentId: string;
  paidAt?: string;
  error?: string;
}

export interface WebhookResult {
  received: boolean;
  processed: boolean;
  eventId?: string;
  providerPaymentId?: string;
  providerRefundId?: string;
  orderPublicId?: string;
  paymentId?: string;
  status?: PaymentStatus;
  refundStatus?: RefundStatus;
  message?: string;
}

export type RefundStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'CANCELLED';

export interface RefundPaymentInput {
  paymentId: string;
  providerPaymentId?: string | null;
  orderId: string;
  orderPublicId: string;
  amount: number;
  currency?: string;
  reason?: string;
  idempotencyKey?: string;
}

export interface RefundPaymentResult {
  success: boolean;
  providerRefundId: string;
  status: RefundStatus;
  error?: string;
}
