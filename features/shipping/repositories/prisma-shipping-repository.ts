import { prisma } from '@/lib/prisma';
import type { Prisma, Shipment, ShipmentTrackingEvent } from '@prisma/client';
import type { ShipmentRecord, ShipmentStatus, TrackingEventRecord } from '../types';
import type {
  ShippingRepository,
  CreateShipmentRecordInput,
  CreateTrackingEventRecordInput,
  UpdateShipmentRecordInput,
} from './shipping-repository';

export function mapPrismaTrackingEventToRecord(
  event: ShipmentTrackingEvent
): TrackingEventRecord {
  return {
    id: event.id,
    shipmentId: event.shipmentId,
    eventId: event.eventId,
    status: event.status as ShipmentStatus,
    description: event.description,
    location: event.location,
    occurredAt: event.occurredAt.toISOString(),
    createdAt: event.createdAt.toISOString(),
  };
}

export function mapPrismaShipmentToRecord(
  shipment: Shipment & { trackingEvents?: ShipmentTrackingEvent[] }
): ShipmentRecord {
  return {
    id: shipment.id,
    orderId: shipment.orderId,
    provider: shipment.provider,
    carrierName: shipment.carrierName,
    providerShipmentId: shipment.providerShipmentId,
    serviceCode: shipment.serviceCode,
    serviceName: shipment.serviceName,
    trackingNumber: shipment.trackingNumber,
    status: shipment.status as ShipmentStatus,
    shippingCost: shipment.shippingCost,
    currency: shipment.currency,
    estimatedDelivery: shipment.estimatedDelivery?.toISOString() || null,
    shippedAt: shipment.shippedAt?.toISOString() || null,
    deliveredAt: shipment.deliveredAt?.toISOString() || null,
    createdAt: shipment.createdAt.toISOString(),
    updatedAt: shipment.updatedAt.toISOString(),
    trackingEvents: shipment.trackingEvents?.map(mapPrismaTrackingEventToRecord),
  };
}

export class PrismaShippingRepository implements ShippingRepository {
  async createShipment(
    input: CreateShipmentRecordInput,
    client?: Prisma.TransactionClient
  ): Promise<ShipmentRecord> {
    const db = client || prisma;
    const shipment = await db.shipment.create({
      data: {
        orderId: input.orderId,
        provider: input.provider,
        carrierName: input.carrierName || null,
        providerShipmentId: input.providerShipmentId || null,
        serviceCode: input.serviceCode,
        serviceName: input.serviceName || null,
        trackingNumber: input.trackingNumber || null,
        status: input.status || 'PENDING',
        shippingCost: input.shippingCost,
        currency: input.currency || 'JPY',
        estimatedDelivery: input.estimatedDelivery || null,
        shippedAt: input.shippedAt || null,
        deliveredAt: input.deliveredAt || null,
      },
      include: {
        trackingEvents: {
          orderBy: { occurredAt: 'asc' },
        },
      },
    });
    return mapPrismaShipmentToRecord(shipment);
  }

  async getShipmentByOrderId(
    orderId: string,
    client?: Prisma.TransactionClient
  ): Promise<ShipmentRecord | null> {
    const db = client || prisma;
    const shipment = await db.shipment.findFirst({
      where: {
        OR: [{ orderId }, { order: { publicId: orderId } }],
      },
      include: {
        trackingEvents: {
          orderBy: { occurredAt: 'asc' },
        },
      },
    });
    return shipment ? mapPrismaShipmentToRecord(shipment) : null;
  }

  async getShipmentByTrackingNumber(
    trackingNumber: string,
    client?: Prisma.TransactionClient
  ): Promise<ShipmentRecord | null> {
    const db = client || prisma;
    const shipment = await db.shipment.findFirst({
      where: { trackingNumber },
      include: {
        trackingEvents: {
          orderBy: { occurredAt: 'asc' },
        },
      },
    });
    return shipment ? mapPrismaShipmentToRecord(shipment) : null;
  }

  async updateShipment(
    id: string,
    input: UpdateShipmentRecordInput,
    client?: Prisma.TransactionClient
  ): Promise<ShipmentRecord> {
    const db = client || prisma;
    const shipment = await db.shipment.update({
      where: { id },
      data: {
        ...(input.status !== undefined && { status: input.status }),
        ...(input.trackingNumber !== undefined && { trackingNumber: input.trackingNumber }),
        ...(input.carrierName !== undefined && { carrierName: input.carrierName }),
        ...(input.providerShipmentId !== undefined && { providerShipmentId: input.providerShipmentId }),
        ...(input.shippedAt !== undefined && { shippedAt: input.shippedAt }),
        ...(input.deliveredAt !== undefined && { deliveredAt: input.deliveredAt }),
      },
      include: {
        trackingEvents: {
          orderBy: { occurredAt: 'asc' },
        },
      },
    });
    return mapPrismaShipmentToRecord(shipment);
  }

  async addTrackingEvent(
    input: CreateTrackingEventRecordInput,
    client?: Prisma.TransactionClient
  ): Promise<TrackingEventRecord> {
    const db = client || prisma;
    const event = await db.shipmentTrackingEvent.create({
      data: {
        shipmentId: input.shipmentId,
        eventId: input.eventId || null,
        status: input.status,
        description: input.description || null,
        location: input.location || null,
        occurredAt: input.occurredAt || new Date(),
      },
    });
    return mapPrismaTrackingEventToRecord(event);
  }

  async getTrackingEvents(
    shipmentId: string,
    client?: Prisma.TransactionClient
  ): Promise<TrackingEventRecord[]> {
    const db = client || prisma;
    const events = await db.shipmentTrackingEvent.findMany({
      where: { shipmentId },
      orderBy: { occurredAt: 'asc' },
    });
    return events.map(mapPrismaTrackingEventToRecord);
  }
}

export const prismaShippingRepository = new PrismaShippingRepository();
