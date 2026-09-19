'use server';

import { getCurrentUser } from '@/features/auth/services/current-user';
import { requireAdmin } from '@/features/auth/services/require-admin';
import { getShippingProvider } from '../providers/shipping-provider-factory';
import { shippingService } from '../services/shipping-service';
import type { GetShippingRatesInput, ShipmentStatus } from '../types';
import { revalidatePath } from 'next/cache';

export async function getShippingRatesAction(input: GetShippingRatesInput) {
  const provider = getShippingProvider();
  return provider.getRates(input);
}

export async function getCustomerShipmentAction(orderPublicId: string) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: 'UNAUTHORIZED' };
  }

  return shippingService.getTracking({
    orderPublicId,
    userId: user.id,
  });
}

export async function adminCreateShipmentAction(orderPublicId: string) {
  const admin = await requireAdmin();
  const result = await shippingService.createShipment({
    orderId: orderPublicId,
  });

  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${orderPublicId}`);
  revalidatePath(`/transactions/${orderPublicId}`);

  return result;
}

export async function adminRefreshTrackingAction(orderPublicId: string) {
  const admin = await requireAdmin();
  const shipment = await shippingService.getTracking({
    orderPublicId,
  });

  if (!shipment.success || !shipment.trackingNumber) {
    return { success: false, error: 'SHIPMENT_NOT_FOUND' };
  }

  // Synchronize status if provider indicates a progression
  if (shipment.status && shipment.status !== 'DELIVERED') {
    // If the provider tracking reports DELIVERED or other forward status, transition
    const lastEvent = shipment.events[shipment.events.length - 1];
    if (lastEvent && lastEvent.status !== shipment.status) {
      await shippingService.transitionShipment({
        orderPublicId,
        toStatus: lastEvent.status,
        actorType: 'ADMIN',
        actorId: admin.id,
        note: `Tracking refreshed: ${lastEvent.description}`,
      });
    }
  }

  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${orderPublicId}`);
  revalidatePath(`/transactions/${orderPublicId}`);

  return {
    success: true,
    tracking: shipment,
  };
}

export async function adminSimulateShipmentAction(
  orderPublicId: string,
  targetStatus: ShipmentStatus
) {
  const admin = await requireAdmin();
  const result = await shippingService.transitionShipment({
    orderPublicId,
    toStatus: targetStatus,
    actorType: 'ADMIN',
    actorId: admin.id,
    note: `Admin simulation transition to ${targetStatus}`,
  });

  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${orderPublicId}`);
  revalidatePath(`/transactions/${orderPublicId}`);

  return result;
}
