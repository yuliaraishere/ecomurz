import type { ShipmentStatus } from './shipment-status';
import type { TrackingEvent } from './tracking-event';

export interface Shipment {
  id: string;
  orderId: string;
  provider: string;
  providerShipmentId?: string | null;
  carrierName?: string | null;
  serviceCode: string;
  serviceName?: string | null;
  trackingNumber?: string | null;
  status: ShipmentStatus;
  shippingCost: number; // Integer JPY
  currency: string;
  estimatedDelivery?: Date | null;
  shippedAt?: Date | null;
  deliveredAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  trackingEvents?: TrackingEvent[];
}
