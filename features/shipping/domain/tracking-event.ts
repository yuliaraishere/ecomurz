import type { ShipmentStatus } from './shipment-status';

export interface TrackingEvent {
  id?: string;
  eventId?: string | null;
  status: ShipmentStatus;
  description: string;
  timestamp: string; // ISO 8601
  location?: string | null;
}
