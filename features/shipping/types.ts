import type { Address } from '@/features/orders/types';

export type ShipmentStatus =
  | 'PENDING'
  | 'READY_TO_SHIP'
  | 'SHIPPED'
  | 'IN_TRANSIT'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'DELIVERY_FAILED'
  | 'RETURNED';

export interface ShippingRateOption {
  serviceCode: string;
  serviceName: string;
  shippingCost: number;
  currency: string;
  estimatedDelivery: string;
  description?: string;
}

export interface GetShippingRatesInput {
  address?: Partial<Address>;
  destinationPostalCode?: string;
  destinationCity?: string;
  items?: Array<{ productId: string; quantity: number; weightInGrams?: number }>;
}

export interface GetShippingRatesResult {
  provider: string;
  rates: ShippingRateOption[];
}

export interface CreateShipmentInput {
  orderId: string;
  orderPublicId: string;
  serviceCode: string;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  recipientCity: string;
  recipientPostalCode: string;
  shippingCost: number;
  currency?: string;
  items?: Array<{ productId: string; quantity: number; productName?: string }>;
}

export interface CreateShipmentResult {
  success: boolean;
  shipmentId: string;
  providerShipmentId: string;
  trackingNumber: string;
  status: ShipmentStatus;
  estimatedDelivery?: string;
  error?: string;
}

export interface TrackingEvent {
  status: ShipmentStatus;
  description: string;
  timestamp: string;
  location?: string;
}

export interface TrackingResult {
  success: boolean;
  trackingNumber: string;
  provider: string;
  serviceCode?: string;
  serviceName?: string;
  status: ShipmentStatus;
  events: TrackingEvent[];
  estimatedDelivery?: string;
  shippedAt?: string;
  deliveredAt?: string;
  error?: string;
}

export interface ShippingWebhookResult {
  received: boolean;
  processed: boolean;
  eventId?: string;
  providerShipmentId?: string;
  trackingNumber?: string;
  orderPublicId?: string;
  status?: ShipmentStatus;
  message?: string;
}

export interface TrackingEventRecord {
  id: string;
  shipmentId: string;
  eventId?: string | null;
  status: ShipmentStatus;
  description?: string | null;
  location?: string | null;
  occurredAt: string;
  createdAt: string;
}

export interface ShipmentRecord {
  id: string;
  orderId: string;
  provider: string;
  carrierName?: string | null;
  providerShipmentId?: string | null;
  serviceCode: string;
  serviceName?: string | null;
  trackingNumber?: string | null;
  status: ShipmentStatus;
  shippingCost: number;
  currency: string;
  estimatedDelivery?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  createdAt: string;
  updatedAt: string;
  trackingEvents?: TrackingEventRecord[];
}
