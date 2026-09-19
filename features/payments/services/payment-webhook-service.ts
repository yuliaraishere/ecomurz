import { paymentService } from './payment-service';
import type { WebhookResult } from '../types';

export interface WebhookPayload {
  provider: string;
  providerPaymentId: string;
  event: 'payment.success' | 'payment.failed';
  eventId?: string;
}

export async function paymentWebhookService(
  payload: WebhookPayload | unknown,
  headers?: Record<string, string | string[] | undefined>,
  providerName?: string
): Promise<WebhookResult> {
  const provider =
    providerName ||
    ((payload as any)?.provider as string) ||
    'dummy';

  return paymentService.processWebhook({
    rawBody: payload,
    headers,
    providerName: provider,
  });
}
