import crypto from 'crypto';
import type {
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentStatus,
  VerifyPaymentInput,
  VerifyPaymentResult,
  WebhookResult,
} from '../types';
import type { PaymentProvider } from './payment-provider';

export interface StripeProviderConfig {
  secretKey?: string;
  webhookSecret?: string;
  isSandbox?: boolean;
}

export class StripePaymentProvider implements PaymentProvider {
  readonly providerName = 'stripe';
  private secretKey?: string;
  private webhookSecret?: string;
  private isSandbox: boolean;

  constructor(config?: StripeProviderConfig) {
    this.secretKey = config?.secretKey || process.env.STRIPE_SECRET_KEY;
    this.webhookSecret = config?.webhookSecret || process.env.STRIPE_WEBHOOK_SECRET;
    this.isSandbox = config?.isSandbox ?? (!this.secretKey);
  }

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const locale = input.locale || 'id';
    const currency = (input.currency || 'JPY').toLowerCase();

    // In Stripe, JPY is zero-decimal. For currencies like USD/EUR, amounts are in cents (* 100).
    const isZeroDecimal = ['jpy', 'krw', 'vnd'].includes(currency);
    const stripeUnitAmount = isZeroDecimal ? Math.round(input.amount) : Math.round(input.amount * 100);

    // If no real API key is configured, run in graceful sandbox mode
    if (!this.secretKey) {
      const simulatedSessionId = `cs_test_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      const returnUrl = input.returnUrl || `/${locale}/payments/${input.orderPublicId}/return`;
      const redirectUrl = `${returnUrl}?session_id=${simulatedSessionId}&provider=stripe`;

      return {
        success: true,
        paymentId: input.orderId,
        providerPaymentId: simulatedSessionId,
        redirectUrl,
      };
    }

    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const successUrl = `${baseUrl}/${locale}/payments/${input.orderPublicId}/return?session_id={CHECKOUT_SESSION_ID}&provider=stripe`;
      const cancelUrl = `${baseUrl}/${locale}/checkout?cancelled=true&orderId=${input.orderPublicId}`;

      const params = new URLSearchParams();
      params.append('payment_method_types[0]', 'card');
      params.append('mode', 'payment');
      params.append('client_reference_id', input.orderPublicId);
      params.append('line_items[0][price_data][currency]', currency);
      params.append('line_items[0][price_data][unit_amount]', stripeUnitAmount.toString());
      params.append('line_items[0][price_data][product_data][name]', `Order ${input.orderPublicId}`);
      params.append('line_items[0][quantity]', '1');
      params.append('success_url', successUrl);
      params.append('cancel_url', cancelUrl);
      params.append('metadata[orderId]', input.orderId);
      params.append('metadata[orderPublicId]', input.orderPublicId);
      if (input.customerEmail) {
        params.append('customer_email', input.customerEmail);
      }

      const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        return {
          success: false,
          paymentId: input.orderId,
          providerPaymentId: '',
          redirectUrl: '',
          error: errJson?.error?.message || `Stripe session creation failed with status ${res.status}`,
        };
      }

      const session = await res.json();
      return {
        success: true,
        paymentId: input.orderId,
        providerPaymentId: session.id,
        redirectUrl: session.url || successUrl.replace('{CHECKOUT_SESSION_ID}', session.id),
      };
    } catch (err: any) {
      return {
        success: false,
        paymentId: input.orderId,
        providerPaymentId: '',
        redirectUrl: '',
        error: err?.message || 'Failed to communicate with Stripe',
      };
    }
  }

  async verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
    const sessionId = input.providerPaymentId;
    if (!sessionId) {
      return {
        success: false,
        status: 'PENDING',
        providerPaymentId: '',
        error: 'Missing providerPaymentId (Stripe session id)',
      };
    }

    // Handle sandbox simulated sessions
    if (!this.secretKey || sessionId.startsWith('cs_test_')) {
      return {
        success: true,
        status: 'PAID',
        providerPaymentId: sessionId,
        paidAt: new Date().toISOString(),
      };
    }

    try {
      const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
        },
      });

      if (!res.ok) {
        return {
          success: false,
          status: 'FAILED',
          providerPaymentId: sessionId,
          error: `Stripe API error: ${res.statusText}`,
        };
      }

      const session = await res.json();
      let status: PaymentStatus = 'PENDING';
      if (session.payment_status === 'paid') {
        status = 'PAID';
      } else if (session.status === 'expired') {
        status = 'EXPIRED';
      } else if (session.payment_status === 'unpaid' && session.status === 'open') {
        status = 'PROCESSING';
      }

      return {
        success: status === 'PAID',
        status,
        providerPaymentId: session.id,
        paidAt: status === 'PAID' ? new Date().toISOString() : undefined,
      };
    } catch (err: any) {
      return {
        success: false,
        status: 'PENDING',
        providerPaymentId: sessionId,
        error: err?.message || 'Network error querying Stripe session',
      };
    }
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

    const currency = (input.currency || 'JPY').toLowerCase();
    const isZeroDecimal = ['jpy', 'krw', 'vnd'].includes(currency);
    const stripeUnitAmount = isZeroDecimal ? Math.round(input.amount) : Math.round(input.amount * 100);

    // Sandbox / fallback mode
    if (!this.secretKey) {
      const simulatedRefundId = `re_test_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      return {
        success: true,
        providerRefundId: simulatedRefundId,
        status: 'SUCCEEDED',
      };
    }

    try {
      const params = new URLSearchParams();
      params.append('amount', stripeUnitAmount.toString());

      if (input.providerPaymentId) {
        if (input.providerPaymentId.startsWith('pi_')) {
          params.append('payment_intent', input.providerPaymentId);
        } else if (input.providerPaymentId.startsWith('ch_')) {
          params.append('charge', input.providerPaymentId);
        }
      }

      if (input.reason) {
        params.append('reason', 'requested_by_customer');
      }

      const res = await fetch('https://api.stripe.com/v1/refunds', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          ...(input.idempotencyKey ? { 'Idempotency-Key': input.idempotencyKey } : {}),
        },
        body: params.toString(),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        return {
          success: false,
          providerRefundId: '',
          status: 'FAILED',
          error: errJson?.error?.message || `Stripe refund failed with status ${res.status}`,
        };
      }

      const refund = await res.json();
      return {
        success: refund.status === 'succeeded' || refund.status === 'pending',
        providerRefundId: refund.id,
        status: refund.status === 'succeeded' ? 'SUCCEEDED' : 'PROCESSING',
      };
    } catch (err: any) {
      return {
        success: false,
        providerRefundId: '',
        status: 'FAILED',
        error: err?.message || 'Network error executing Stripe refund',
      };
    }
  }

  verifyWebhookSignature(rawBody: string | Buffer, signatureHeader: string, secret: string): boolean {
    try {
      const parts = signatureHeader.split(',');
      let timestamp = '';
      const signatures: string[] = [];

      for (const part of parts) {
        const [k, v] = part.split('=');
        if (k === 't') timestamp = v;
        if (k === 'v1') signatures.push(v);
      }

      if (!timestamp || signatures.length === 0) {
        return false;
      }

      const payload = `${timestamp}.${typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8')}`;
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      return signatures.some((sig) => {
        try {
          return crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expectedSignature, 'hex'));
        } catch {
          return false;
        }
      });
    } catch {
      return false;
    }
  }

  async handleWebhook(
    payload: unknown,
    headers?: Record<string, string | string[] | undefined>
  ): Promise<WebhookResult> {
    const signature =
      (headers?.['stripe-signature'] as string) ||
      (headers?.['Stripe-Signature'] as string);

    // Verify cryptographic signature if secret is configured
    if (this.webhookSecret && signature) {
      const rawPayload = typeof payload === 'string' ? payload : JSON.stringify(payload);
      const isValid = this.verifyWebhookSignature(rawPayload, signature, this.webhookSecret);
      if (!isValid) {
        return {
          received: true,
          processed: false,
          message: 'Invalid Stripe signature',
        };
      }
    }

    let parsedPayload: any = payload;
    if (typeof payload === 'string') {
      try {
        parsedPayload = JSON.parse(payload);
      } catch {
        return { received: false, processed: false, message: 'Invalid JSON payload' };
      }
    }

    const event = parsedPayload as {
      id?: string;
      type?: string;
      data?: {
        object?: {
          id?: string;
          client_reference_id?: string;
          metadata?: { orderId?: string; orderPublicId?: string };
          payment_status?: string;
          status?: string;
          payment_intent?: string;
          charge?: string;
        };
      };
    };

    if (!event || !event.type) {
      return {
        received: false,
        processed: false,
        message: 'Invalid Stripe event format',
      };
    }

    const eventId = event.id || `evt_${Date.now()}`;
    const obj = event.data?.object;
    const providerPaymentId = (obj?.payment_intent as string) || obj?.id;
    const orderPublicId = obj?.client_reference_id || obj?.metadata?.orderPublicId;

    let status: PaymentStatus | undefined;
    let refundStatus: import('../types').RefundStatus | undefined;
    let providerRefundId: string | undefined;

    switch (event.type) {
      case 'checkout.session.completed':
        status = 'PAID';
        break;
      case 'checkout.session.expired':
        status = 'EXPIRED';
        break;
      case 'checkout.session.async_payment_failed':
      case 'payment_intent.payment_failed':
        status = 'FAILED';
        break;
      case 'charge.refunded':
      case 'refund.created':
      case 'refund.updated':
        refundStatus = 'SUCCEEDED';
        providerRefundId = obj?.id;
        break;
      default:
        return {
          received: true,
          processed: false,
          eventId,
          providerPaymentId,
          orderPublicId,
          message: `Ignored Stripe event type: ${event.type}`,
        };
    }

    return {
      received: true,
      processed: true,
      eventId,
      providerPaymentId,
      providerRefundId,
      orderPublicId,
      status,
      refundStatus,
      message: `Processed Stripe event ${event.type}`,
    };
  }
}

export const stripePaymentProvider = new StripePaymentProvider();
