import type {
  GetShippingRatesInput,
  GetShippingRatesResult,
  CreateShipmentInput,
  CreateShipmentResult,
  TrackingResult,
  ShippingWebhookResult,
  ShipmentStatus,
} from '../../types';
import type { ShippingProvider } from '../shipping-provider';

export class MockShippingProvider implements ShippingProvider {
  readonly providerName = 'mock';

  async getRates(_input: GetShippingRatesInput): Promise<GetShippingRatesResult> {
    return {
      provider: this.providerName,
      rates: [
        {
          serviceCode: 'REGULAR',
          serviceName: 'Regular Delivery',
          shippingCost: 180,
          currency: 'JPY',
          estimatedDelivery: '2–3 business days',
          description: 'Standard reliable courier delivery across Japan',
        },
        {
          serviceCode: 'EXPRESS',
          serviceName: 'Express Courier',
          shippingCost: 360,
          currency: 'JPY',
          estimatedDelivery: '1–2 business days',
          description: 'Priority overnight fulfillment with real-time tracking',
        },
        {
          serviceCode: 'SAME_DAY',
          serviceName: 'Same Day Delivery',
          shippingCost: 520,
          currency: 'JPY',
          estimatedDelivery: 'Same day (orders before 12:00)',
          description: 'Immediate metropolitan dispatch within Tokyo & Kanto',
        },
      ],
    };
  }

  async createShipment(input: CreateShipmentInput): Promise<CreateShipmentResult> {
    const timestamp = Date.now().toString(36).toUpperCase();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const providerShipmentId = `DSHP-MOCK-${timestamp}-${randomSuffix}`;
    const trackingNumber = `RUPA-TRK-${timestamp}-${randomSuffix}`;

    const estDays =
      input.serviceCode.toUpperCase() === 'SAME_DAY'
        ? 0
        : input.serviceCode.toUpperCase() === 'EXPRESS'
          ? 1
          : 3;
    const estimatedDelivery = new Date(Date.now() + estDays * 24 * 60 * 60 * 1000).toISOString();

    return {
      success: true,
      shipmentId: input.orderId,
      providerShipmentId,
      trackingNumber,
      status: 'READY_TO_SHIP',
      estimatedDelivery,
    };
  }

  async getTracking(input: { trackingNumber: string }): Promise<TrackingResult> {
    const now = new Date();
    return {
      success: true,
      trackingNumber: input.trackingNumber,
      provider: this.providerName,
      serviceName: 'RUPA Courier Express (Mock)',
      status: 'IN_TRANSIT',
      estimatedDelivery: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      events: [
        {
          status: 'READY_TO_SHIP',
          description: 'Shipping label created and parcel prepared at RUPA fulfillment center',
          timestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
          location: 'Tokyo Logistics Hub',
        },
        {
          status: 'SHIPPED',
          description: 'Parcel collected by courier driver',
          timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
          location: 'Tokyo Logistics Hub',
        },
        {
          status: 'IN_TRANSIT',
          description: 'Parcel departed sorting facility en route to delivery station',
          timestamp: now.toISOString(),
          location: 'Kanto Central Sort Hub',
        },
      ],
    };
  }

  async handleWebhook(
    payload: unknown,
    _headers?: Record<string, string | string[] | undefined>
  ): Promise<ShippingWebhookResult> {
    let parsed: unknown = payload;
    if (typeof payload === 'string') {
      try {
        parsed = JSON.parse(payload);
      } catch {
        return { received: false, processed: false, message: 'Invalid JSON payload' };
      }
    } else if (payload && typeof payload === 'object' && Buffer.isBuffer(payload)) {
      try {
        parsed = JSON.parse(payload.toString('utf-8'));
      } catch {
        return { received: false, processed: false, message: 'Invalid JSON payload' };
      }
    }

    if (!parsed || typeof parsed !== 'object') {
      return { received: false, processed: false, message: 'Invalid payload' };
    }

    const data = parsed as {
      provider?: string;
      eventId?: string;
      providerShipmentId?: string;
      trackingNumber?: string;
      orderPublicId?: string;
      event?: string;
      status?: ShipmentStatus;
    };

    if (data.provider && data.provider !== 'mock' && data.provider !== 'dummy') {
      return {
        received: true,
        processed: false,
        message: `Unsupported shipping provider: ${data.provider}`,
      };
    }

    if (!data.providerShipmentId && !data.trackingNumber && !data.orderPublicId) {
      return {
        received: true,
        processed: false,
        message: 'Missing shipment reference (providerShipmentId, trackingNumber, or orderPublicId)',
      };
    }

    const eventId =
      data.eventId || `mock-ship-evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    let status: ShipmentStatus = 'IN_TRANSIT';
    if (data.status) {
      status = data.status;
    } else if (data.event) {
      switch (data.event) {
        case 'shipment.ready_to_ship':
          status = 'READY_TO_SHIP';
          break;
        case 'shipment.shipped':
          status = 'SHIPPED';
          break;
        case 'shipment.in_transit':
          status = 'IN_TRANSIT';
          break;
        case 'shipment.out_for_delivery':
          status = 'OUT_FOR_DELIVERY';
          break;
        case 'shipment.delivered':
          status = 'DELIVERED';
          break;
        case 'shipment.delivery_failed':
          status = 'DELIVERY_FAILED';
          break;
        case 'shipment.returned':
          status = 'RETURNED';
          break;
        case 'shipment.cancelled':
          status = 'CANCELLED';
          break;
        default:
          status = 'IN_TRANSIT';
      }
    }

    return {
      received: true,
      processed: true,
      eventId,
      providerShipmentId: data.providerShipmentId,
      trackingNumber: data.trackingNumber,
      orderPublicId: data.orderPublicId,
      status,
      message: `Processed shipping event: ${data.event || status}`,
    };
  }
}

export const mockShippingProvider = new MockShippingProvider();
