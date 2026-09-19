import { transitionOrderService, type TransitionOrderResult } from './transition-order-service';
import type { OrderActorType } from '../domain';

export async function markOrderAsProcessing(
  orderId: string,
  actorId?: string,
  note?: string
): Promise<TransitionOrderResult> {
  return transitionOrderService({
    orderId,
    toStatus: 'PROCESSING',
    actorType: 'ADMIN',
    actorId,
    note: note || 'Order is being processed',
  });
}

export async function markOrderAsPacked(
  orderId: string,
  actorId?: string,
  note?: string
): Promise<TransitionOrderResult> {
  return transitionOrderService({
    orderId,
    toStatus: 'PACKED',
    actorType: 'ADMIN',
    actorId,
    note: note || 'Items packaged and ready for dispatch',
  });
}

export async function markOrderAsShipped(
  orderId: string,
  trackingNumber?: string,
  actorId?: string,
  note?: string
): Promise<TransitionOrderResult> {
  return transitionOrderService({
    orderId,
    toStatus: 'SHIPPED',
    actorType: 'ADMIN',
    actorId,
    trackingNumber: trackingNumber || null,
    note: note || (trackingNumber ? `Dispatched with tracking: ${trackingNumber}` : 'Order dispatched to courier'),
  });
}

export async function markOrderAsDelivered(
  orderId: string,
  actorId?: string,
  note?: string
): Promise<TransitionOrderResult> {
  return transitionOrderService({
    orderId,
    toStatus: 'DELIVERED',
    actorType: 'SYSTEM',
    actorId,
    note: note || 'Delivery confirmed by courier service',
  });
}

export async function completeOrderService(
  orderId: string,
  actorId?: string,
  actorType: OrderActorType = 'CUSTOMER',
  requireUserId?: string
): Promise<TransitionOrderResult> {
  return transitionOrderService({
    orderId,
    toStatus: 'COMPLETED',
    actorType,
    actorId,
    note: 'Order completed and accepted by customer',
    requireUserId,
  });
}

export async function cancelOrderService(
  orderId: string,
  reason?: string,
  actorId?: string,
  actorType: OrderActorType = 'CUSTOMER',
  requireUserId?: string
): Promise<TransitionOrderResult> {
  return transitionOrderService({
    orderId,
    toStatus: 'CANCELLED',
    actorType,
    actorId,
    note: reason ? `Cancelled: ${reason}` : 'Order cancelled',
    requireUserId,
  });
}
