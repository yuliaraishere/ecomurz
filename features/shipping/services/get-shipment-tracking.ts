import { shippingService, type GetTrackingOptions } from './shipping-service';
import type { TrackingResult } from '../types';

/**
 * Retrieves public-safe tracking details for a customer or internal lookup.
 * Verifies customer authorization and loads chronological event history.
 */
export async function getShipmentTracking(
  options: GetTrackingOptions
): Promise<TrackingResult> {
  return shippingService.getTracking(options);
}
