import { shippingService, type CreateShipmentOptions } from './shipping-service';

/**
 * Creates a shipment for an order that has reached PACKED or verified PAID status.
 * Ensures strict 1:1 order-to-shipment relation, registers tracking,
 * and initializes tracking events in database.
 */
export async function createShipment(options: CreateShipmentOptions) {
  return shippingService.createShipment(options);
}
