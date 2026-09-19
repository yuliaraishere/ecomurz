import type {
  GetShippingRatesInput,
  GetShippingRatesResult,
  CreateShipmentInput,
  CreateShipmentResult,
  TrackingResult,
  ShippingWebhookResult,
} from '../types';

export interface ShippingProvider {
  readonly providerName: string;

  getRates(input: GetShippingRatesInput): Promise<GetShippingRatesResult>;

  createShipment(input: CreateShipmentInput): Promise<CreateShipmentResult>;

  getTracking(input: { trackingNumber: string }): Promise<TrackingResult>;

  handleWebhook(
    payload: unknown,
    headers?: Record<string, string | string[] | undefined>
  ): Promise<ShippingWebhookResult>;
}
