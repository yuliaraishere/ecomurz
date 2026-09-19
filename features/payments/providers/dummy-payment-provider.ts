import type {
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentStatus,
  VerifyPaymentInput,
  VerifyPaymentResult,
  WebhookResult,
} from '../types';
import type { PaymentProvider } from './payment-provider';

export class DummyPaymentProvider implements PaymentProvider {
  readonly providerName = 'dummy';

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    // Generate simulated external provider payment ID
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const timestamp = Date.now().toString(36).toUpperCase();
    const providerPaymentId = `DUMMY-${timestamp}-${randomSuffix}`;

    const locale = input.locale || 'id';
    const redirectUrl = `/${locale}/payments/dummy/${input.orderId}`;

    return {
      success: true,
      paymentId: input.orderId,
      providerPaymentId,
      redirectUrl,
    };
  }

  async verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
    if (!input.providerPaymentId && !input.paymentId) {
      return {
        success: false,
        status: 'PENDING',
        providerPaymentId: '',
        error: 'Missing payment identifier for verification',
      };
    }

    return {
      success: true,
      status: 'PAID',
      providerPaymentId: input.providerPaymentId || '',
      paidAt: new Date().toISOString(),
    };
  }

  async refundPayment(input: import('../types').RefundPaymentInput): Promise<import('../types').RefundPaymentResult> {
    if (input.amount <= 0) {
      return {
        success: false,
        providerRefundId: '',
        status: 'FAILED',
        error: 'Refund amount must be greater than 0',
      };
    }

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const timestamp = Date.now().toString(36).toUpperCase();
    const providerRefundId = `DUMMY-REFUND-${timestamp}-${randomSuffix}`;

    return {
      success: true,
      providerRefundId,
      status: 'SUCCEEDED',
    };
  }

  async handleWebhook(
    payload: unknown,
    headers?: Record<string, string | string[] | undefined>
  ): Promise<WebhookResult> {
    if (!payload || typeof payload !== 'object') {
      return { received: false, processed: false, message: 'Invalid payload' };
    }

    const data = payload as {
      provider?: string;
      providerPaymentId?: string;
      orderPublicId?: string;
      event?: string;
      eventId?: string;
      status?: any;
    };

    if (data.provider && data.provider !== 'dummy') {
      return {
        received: true,
        processed: false,
        message: 'Unsupported provider',
      };
    }

    if (!data.providerPaymentId && !data.orderPublicId) {
      return {
        received: true,
        processed: false,
        message: 'Missing providerPaymentId or orderPublicId',
      };
    }

    const eventId = data.eventId || `dummy-evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    let status: PaymentStatus = 'PAID';
    if (data.event === 'payment.failed' || data.status === 'FAILED') {
      status = 'FAILED';
    } else if (data.event === 'payment.expired' || data.status === 'EXPIRED') {
      status = 'EXPIRED';
    } else if (data.event === 'payment.success' || data.status === 'PAID') {
      status = 'PAID';
    }

    return {
      received: true,
      processed: true,
      eventId,
      providerPaymentId: data.providerPaymentId,
      orderPublicId: data.orderPublicId,
      status,
      message: `Processed dummy event: ${data.event || status}`,
    };
  }
}

export const dummyPaymentProvider = new DummyPaymentProvider();
