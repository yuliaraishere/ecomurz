import { getShippingProvider } from '../providers/shipping-provider-factory';
import type { GetShippingRatesInput, GetShippingRatesResult } from '../types';

/**
 * Server-authoritative shipping rate calculation.
 * Computes deterministic rates based on service code and destination.
 */
export async function calculateShipping(
  input: GetShippingRatesInput,
  providerName?: string
): Promise<GetShippingRatesResult> {
  const provider = getShippingProvider(providerName);
  return provider.getRates(input);
}
