import { shippingService, type ProcessShippingWebhookOptions } from './shipping-service';
import type { ShippingWebhookResult } from '../types';

/**
 * Handles incoming courier webhooks idempotently with database-backed deduplication.
 * Advances shipment lifecycle and harmonizes order state machine.
 */
export async function processShipmentWebhook(
  options: ProcessShippingWebhookOptions
): Promise<ShippingWebhookResult> {
  return shippingService.processWebhook(options);
}
