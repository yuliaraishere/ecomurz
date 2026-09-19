import type { ShipmentRecord, ShipmentStatus, TrackingEventRecord } from '../types';

export interface CreateShipmentRecordInput {
  orderId: string;
  provider: string;
  carrierName?: string | null;
  providerShipmentId?: string | null;
  serviceCode: string;
  serviceName?: string | null;
  trackingNumber?: string | null;
  status?: ShipmentStatus;
  shippingCost: number;
  currency?: string;
  estimatedDelivery?: Date | null;
  shippedAt?: Date | null;
  deliveredAt?: Date | null;
}

export interface CreateTrackingEventRecordInput {
  shipmentId: string;
  eventId?: string | null;
  status: ShipmentStatus;
  description?: string | null;
  location?: string | null;
  occurredAt?: Date;
}

export interface UpdateShipmentRecordInput {
  status?: ShipmentStatus;
  trackingNumber?: string | null;
  carrierName?: string | null;
  providerShipmentId?: string | null;
  shippedAt?: Date | null;
  deliveredAt?: Date | null;
}

export interface ShippingRepository {
  createShipment(input: CreateShipmentRecordInput): Promise<ShipmentRecord>;
  getShipmentByOrderId(orderId: string): Promise<ShipmentRecord | null>;
  getShipmentByTrackingNumber(trackingNumber: string): Promise<ShipmentRecord | null>;
  updateShipment(id: string, input: UpdateShipmentRecordInput): Promise<ShipmentRecord>;
  addTrackingEvent(input: CreateTrackingEventRecordInput): Promise<TrackingEventRecord>;
  getTrackingEvents(shipmentId: string): Promise<TrackingEventRecord[]>;
}
