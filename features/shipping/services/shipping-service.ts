import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { getShippingProvider } from '../providers/shipping-provider-factory';
import { prismaShippingRepository } from '../repositories/prisma-shipping-repository';
import {
  assertValidShipmentTransition,
  InvalidShipmentTransitionError,
} from '../domain/shipment-state-machine';
import type { ShipmentStatus, ShipmentRecord, TrackingResult, ShippingWebhookResult } from '../types';

export interface CreateShipmentOptions {
  orderId: string;
  userId?: string | null;
  providerName?: string;
  tx?: Prisma.TransactionClient;
}

export interface TransitionShipmentOptions {
  shipmentId?: string;
  orderPublicId?: string;
  trackingNumber?: string;
  toStatus: ShipmentStatus;
  actorType?: 'SHIPPING' | 'ADMIN' | 'SYSTEM';
  actorId?: string | null;
  note?: string | null;
  tx?: Prisma.TransactionClient;
}

export interface GetTrackingOptions {
  trackingNumber?: string;
  orderPublicId?: string;
  userId?: string | null;
}

export interface ProcessShippingWebhookOptions {
  rawBody: string | Buffer | unknown;
  headers?: Record<string, string | string[] | undefined>;
  providerName?: string;
}

export class ShippingService {
  /**
   * Authoritatively creates a shipment for an eligible (PAID) order.
   */
  async createShipment(options: CreateShipmentOptions) {
    const { orderId, userId, providerName, tx } = options;
    const db = tx || prisma;

    // 1. Fetch order with ownership and payment check
    const order = await db.order.findFirst({
      where: {
        OR: [{ id: orderId }, { publicId: orderId }],
      },
      include: {
        items: true,
        payments: { orderBy: { createdAt: 'desc' } },
        shipment: true,
      },
    });

    if (!order) {
      return { success: false, error: 'ORDER_NOT_FOUND' };
    }

    if (userId && order.userId && order.userId !== userId) {
      return { success: false, error: 'UNAUTHORIZED' };
    }

    // 2. Validate order eligibility: Order must be PAID or in fulfillment, and NOT CANCELLED
    if (order.status === 'PENDING_PAYMENT') {
      return { success: false, error: 'ORDER_UNPAID', message: 'Cannot create shipment for unpaid order' };
    }

    if (order.status === 'CANCELLED') {
      return { success: false, error: 'ORDER_CANCELLED', message: 'Cannot create shipment for cancelled order' };
    }

    const hasPaidPayment = order.payments.some((p) => p.status === 'PAID');
    if (!hasPaidPayment && order.status !== 'PAID' && order.status !== 'PROCESSING' && order.status !== 'PACKED') {
      return { success: false, error: 'ORDER_UNPAID', message: 'Order has no verified payment' };
    }

    // 3. Check if shipment already exists idempotently
    if (order.shipment) {
      return {
        success: true,
        shipment: order.shipment,
        trackingNumber: order.shipment.trackingNumber || '',
        message: 'Shipment already exists for this order',
      };
    }

    // 4. Resolve shipping provider
    const provider = getShippingProvider(providerName);

    // 5. Provider creates shipment reference
    const shipmentInit = await provider.createShipment({
      orderId: order.id,
      orderPublicId: order.publicId,
      serviceCode: order.shippingMethodId,
      recipientName: order.recipientName,
      recipientPhone: order.recipientPhone,
      recipientAddress: order.recipientAddress,
      recipientCity: order.recipientCity,
      recipientPostalCode: order.recipientPostalCode,
      shippingCost: order.shippingPrice,
      currency: 'JPY',
      items: order.items.map((i) => ({ productId: i.productId, quantity: i.quantity, productName: i.productName })),
    });

    if (!shipmentInit.success) {
      return { success: false, error: 'PROVIDER_CREATION_FAILED', message: shipmentInit.error };
    }

    // 6. Atomically persist shipment and link tracking to order
    const runner = async (client: Prisma.TransactionClient) => {
      const createdShipment = await prismaShippingRepository.createShipment(
        {
          orderId: order.id,
          provider: provider.providerName,
          carrierName: provider.providerName === 'mock' ? 'RUPA Express Logistics' : `${provider.providerName.toUpperCase()} Courier`,
          providerShipmentId: shipmentInit.providerShipmentId,
          serviceCode: order.shippingMethodId,
          serviceName: order.shippingMethodName,
          trackingNumber: shipmentInit.trackingNumber,
          status: shipmentInit.status || 'READY_TO_SHIP',
          shippingCost: order.shippingPrice,
          currency: 'JPY',
          estimatedDelivery: shipmentInit.estimatedDelivery ? new Date(shipmentInit.estimatedDelivery) : null,
        },
        client
      );

      await prismaShippingRepository.addTrackingEvent(
        {
          shipmentId: createdShipment.id,
          eventId: `evt-init-${createdShipment.id}`,
          status: createdShipment.status,
          description: 'Shipping label generated and package ready for pickup',
          location: 'Tokyo Fulfillment Hub',
          occurredAt: new Date(),
        },
        client
      );

      await client.order.update({
        where: { id: order.id },
        data: {
          trackingNumber: shipmentInit.trackingNumber,
        },
      });

      await client.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: order.status,
          toStatus: order.status,
          actorType: 'SHIPPING',
          actorId: provider.providerName,
          note: `Shipment created via ${provider.providerName}. Tracking: ${shipmentInit.trackingNumber}`,
        },
      });

      return createdShipment;
    };

    const shipment = tx ? await runner(tx) : await prisma.$transaction(runner);

    return {
      success: true,
      shipment,
      trackingNumber: shipmentInit.trackingNumber,
    };
  }

  /**
   * Advances shipment lifecycle through the validated state machine.
   */
  async transitionShipment(options: TransitionShipmentOptions) {
    const {
      shipmentId,
      orderPublicId,
      trackingNumber,
      toStatus,
      actorType = 'SHIPPING',
      actorId = null,
      note = null,
      tx,
    } = options;

    const runner = async (client: Prisma.TransactionClient) => {
      // 1. Resolve shipment
      const shipment = await client.shipment.findFirst({
        where: {
          OR: [
            ...(shipmentId ? [{ id: shipmentId }] : []),
            ...(trackingNumber ? [{ trackingNumber }] : []),
            ...(orderPublicId ? [{ order: { publicId: orderPublicId } }] : []),
          ],
        },
        include: { order: true },
      });

      if (!shipment) {
        return { success: false, error: 'SHIPMENT_NOT_FOUND' };
      }

      const currentStatus = shipment.status as ShipmentStatus;

      // 2. Idempotency check: if already in the target status, return current record
      if (currentStatus === toStatus) {
        return {
          success: true,
          shipment: await prismaShippingRepository.getShipmentByOrderId(shipment.orderId, client),
          orderStatus: shipment.order.status,
          message: 'Idempotent: shipment already in target status',
        };
      }

      // 3. State machine validation
      try {
        assertValidShipmentTransition(currentStatus, toStatus);
      } catch (err) {
        if (err instanceof InvalidShipmentTransitionError) {
          return {
            success: false,
            error: `INVALID_TRANSITION: Cannot transition shipment from ${err.fromStatus} to ${err.toStatus}`,
          };
        }
        throw err;
      }

      // 4. Update shipment status and timestamps
      const now = new Date();
      const shipmentUpdateData: Prisma.ShipmentUpdateInput = {
        status: toStatus,
      };

      if (toStatus === 'SHIPPED') {
        shipmentUpdateData.shippedAt = now;
      } else if (toStatus === 'DELIVERED') {
        shipmentUpdateData.deliveredAt = now;
      }

      const updatedShipment = await client.shipment.update({
        where: { id: shipment.id },
        data: shipmentUpdateData,
      });

      const eventDescriptions: Record<string, string> = {
        READY_TO_SHIP: 'Shipment label generated and package ready for pickup',
        SHIPPED: 'Package received by carrier and dispatched from sorting hub',
        IN_TRANSIT: 'Package in transit to regional delivery station',
        OUT_FOR_DELIVERY: 'Courier out for delivery to destination address',
        DELIVERED: 'Package successfully delivered to recipient',
        DELIVERY_FAILED: 'Delivery attempt unsuccessful',
        RETURNED: 'Package returned to sender',
        CANCELLED: 'Shipment cancelled',
      };

      await prismaShippingRepository.addTrackingEvent(
        {
          shipmentId: shipment.id,
          eventId: `evt-${toStatus.toLowerCase()}-${Date.now()}`,
          status: toStatus,
          description: note || eventDescriptions[toStatus] || `Shipment status: ${toStatus}`,
          location: toStatus === 'DELIVERED' ? 'Destination Address' : 'Tokyo Logistics Hub',
          occurredAt: now,
        },
        client
      );

      // 5. Synchronize Order state machine where applicable
      let newOrderStatus = shipment.order.status;

      if (toStatus === 'SHIPPED') {
        // Advance order to SHIPPED if not already shipped/delivered
        if (shipment.order.status === 'PAID' || shipment.order.status === 'PROCESSING' || shipment.order.status === 'PACKED') {
          newOrderStatus = 'SHIPPED';
          await client.order.update({
            where: { id: shipment.orderId },
            data: {
              status: 'SHIPPED',
              trackingNumber: shipment.trackingNumber,
              shippedAt: now,
            },
          });
          await client.orderStatusHistory.create({
            data: {
              orderId: shipment.orderId,
              fromStatus: shipment.order.status,
              toStatus: 'SHIPPED',
              actorType,
              actorId,
              note: `Order dispatched with tracking: ${shipment.trackingNumber}`,
            },
          });
        }
      } else if (toStatus === 'DELIVERED') {
        // Advance order to DELIVERED
        if (shipment.order.status === 'SHIPPED') {
          newOrderStatus = 'DELIVERED';
          await client.order.update({
            where: { id: shipment.orderId },
            data: {
              status: 'DELIVERED',
              deliveredAt: now,
            },
          });
          await client.orderStatusHistory.create({
            data: {
              orderId: shipment.orderId,
              fromStatus: 'SHIPPED',
              toStatus: 'DELIVERED',
              actorType,
              actorId,
              note: 'Parcel delivered to customer address',
            },
          });
        }
      } else {
        // Log milestone event in OrderStatusHistory without changing primary order status
        await client.orderStatusHistory.create({
          data: {
            orderId: shipment.orderId,
            fromStatus: shipment.order.status,
            toStatus: shipment.order.status,
            actorType,
            actorId,
            note: note || `Shipment status: ${toStatus}`,
          },
        });
      }

      return {
        success: true,
        shipment: updatedShipment,
        orderStatus: newOrderStatus,
      };
    };

    return tx ? await runner(tx) : await prisma.$transaction(runner);
  }

  /**
   * Retrieves tracking information verifying user authorization.
   */
  async getTracking(options: GetTrackingOptions): Promise<TrackingResult> {
    const { trackingNumber, orderPublicId, userId } = options;

    const shipment = await prisma.shipment.findFirst({
      where: {
        OR: [
          ...(trackingNumber ? [{ trackingNumber }] : []),
          ...(orderPublicId ? [{ order: { publicId: orderPublicId } }] : []),
        ],
      },
      include: { order: true },
    });

    if (!shipment) {
      return {
        success: false,
        trackingNumber: trackingNumber || '',
        provider: 'unknown',
        status: 'PENDING',
        events: [],
        error: 'Shipment not found',
      };
    }

    if (userId && shipment.order.userId && shipment.order.userId !== userId) {
      return {
        success: false,
        trackingNumber: shipment.trackingNumber || '',
        provider: shipment.provider,
        status: shipment.status as ShipmentStatus,
        events: [],
        error: 'UNAUTHORIZED',
      };
    }

    const provider = getShippingProvider(shipment.provider);
    const trackingInfo = await provider.getTracking({
      trackingNumber: shipment.trackingNumber || '',
    });

    const dbEvents = await prisma.shipmentTrackingEvent.findMany({
      where: { shipmentId: shipment.id },
      orderBy: { occurredAt: 'asc' },
    });

    const events = dbEvents.length > 0
      ? dbEvents.map((e) => ({
          status: e.status as ShipmentStatus,
          description: e.description || '',
          timestamp: e.occurredAt.toISOString(),
          location: e.location || undefined,
        }))
      : trackingInfo.events;

    return {
      ...trackingInfo,
      status: shipment.status as ShipmentStatus,
      events,
      shippedAt: shipment.shippedAt?.toISOString() || undefined,
      deliveredAt: shipment.deliveredAt?.toISOString() || undefined,
    };
  }

  /**
   * Processes shipping webhooks with database-backed idempotency.
   */
  async processWebhook(options: ProcessShippingWebhookOptions): Promise<ShippingWebhookResult> {
    const { rawBody, headers, providerName } = options;
    const provider = getShippingProvider(providerName);

    // 1. Provider handles raw parsing and validation
    const providerResult = await provider.handleWebhook(rawBody, headers);

    if (!providerResult.received || !providerResult.processed) {
      return providerResult;
    }

    const eventId = providerResult.eventId;
    if (!eventId) {
      return {
        received: true,
        processed: false,
        message: 'Webhook payload missing unique event identifier',
      };
    }

    // 2. Database idempotency check using ShippingWebhookEvent
    const existingEvent = await prisma.shippingWebhookEvent.findUnique({
      where: {
        provider_eventId: {
          provider: provider.providerName,
          eventId,
        },
      },
    });

    if (existingEvent) {
      return {
        received: true,
        processed: true,
        eventId,
        status: providerResult.status,
        message: 'Idempotent: shipping webhook event already processed',
      };
    }

    // 3. Locate shipment
    const { providerShipmentId, trackingNumber, orderPublicId, status: newStatus = 'IN_TRANSIT' } = providerResult;

    const shipment = await prisma.shipment.findFirst({
      where: {
        OR: [
          ...(providerShipmentId ? [{ providerShipmentId }] : []),
          ...(trackingNumber ? [{ trackingNumber }] : []),
          ...(orderPublicId ? [{ order: { publicId: orderPublicId } }] : []),
        ],
      },
      include: { order: true },
    });

    if (!shipment) {
      return {
        received: true,
        processed: false,
        eventId,
        message: `Could not locate shipment for providerShipmentId=${providerShipmentId} or tracking=${trackingNumber}`,
      };
    }

    // 4. Transactional execution: record event + transition shipment & order
    await prisma.$transaction(async (tx) => {
      await tx.shippingWebhookEvent.create({
        data: {
          provider: provider.providerName,
          eventId,
          eventType: newStatus,
        },
      });

      // If shipment is already delivered, ignore backwards/out-of-order transitions gracefully
      if (shipment.status === 'DELIVERED') {
        return;
      }

      const transitionResult = await this.transitionShipment({
        shipmentId: shipment.id,
        toStatus: newStatus,
        actorType: 'SHIPPING',
        actorId: provider.providerName,
        note: `Webhook event ${eventId}: ${newStatus}`,
        tx,
      });

      if (!transitionResult.success) {
        throw new Error(transitionResult.error || 'Failed to transition shipment');
      }
    });

    return {
      received: true,
      processed: true,
      eventId,
      providerShipmentId: shipment.providerShipmentId || undefined,
      trackingNumber: shipment.trackingNumber || undefined,
      orderPublicId: shipment.order.publicId,
      status: newStatus,
      message: `Shipment updated to ${newStatus} via webhook`,
    };
  }
}

export const shippingService = new ShippingService();
