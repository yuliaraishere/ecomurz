import type {
  CreatePaymentInput,
  CreatePaymentResult,
  VerifyPaymentInput,
  VerifyPaymentResult,
  RefundPaymentInput,
  RefundPaymentResult,
  WebhookResult,
} from '../types';

export interface PaymentProvider {
  readonly providerName: string;

  /**
   * Initializes a payment session with the provider and returns
   * a providerPaymentId and the redirect or action URL.
   */
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;

  /**
   * Verifies payment status authoritatively with the provider.
   */
  verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult>;

  /**
   * Executes or initiates a full or partial refund with the provider.
   */
  refundPayment(input: RefundPaymentInput): Promise<RefundPaymentResult>;

  /**
   * Parses and validates incoming webhook events from the provider,
   * verifying cryptographic signatures where supported.
   */
  handleWebhook(
    payload: unknown,
    headers?: Record<string, string | string[] | undefined>
  ): Promise<WebhookResult>;
}
