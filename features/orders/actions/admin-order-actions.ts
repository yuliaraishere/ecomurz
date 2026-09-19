'use server';

import { requireAdmin, UnauthorizedError, ForbiddenError } from '@/features/auth/services/require-admin';
import { revalidatePath } from 'next/cache';
import {
  markOrderAsProcessing,
  markOrderAsPacked,
  markOrderAsShipped,
  markOrderAsDelivered,
  completeOrderService,
  cancelOrderService,
} from '../services/fulfillment-services';
import { transitionOrderService, type TransitionOrderResult } from '../services/transition-order-service';
import type { OrderStatus } from '../domain';

export interface AdminActionResult extends TransitionOrderResult {
  message?: string;
}

/**
 * Generalized admin status transition action enforcing server-side ADMIN authorization.
 */
export async function adminTransitionOrderAction(
  orderId: string,
  toStatus: OrderStatus,
  options: {
    trackingNumber?: string | null;
    note?: string | null;
  } = {}
): Promise<AdminActionResult> {
  try {
    const admin = await requireAdmin();

    const result = await transitionOrderService({
      orderId,
      toStatus,
      actorType: 'ADMIN',
      actorId: admin.id,
      note: options.note || `Admin (${admin.email}) transitioned order to ${toStatus}`,
      trackingNumber: options.trackingNumber,
    });

    if (result.success) {
      revalidatePath('/admin');
      revalidatePath('/admin/orders');
      revalidatePath(`/admin/orders/${orderId}`);
      revalidatePath('/transactions');
      revalidatePath(`/transactions/${orderId}`);
    }

    return result;
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { success: false, error: 'UNAUTHORIZED', message: 'Authentication required' };
    }
    if (error instanceof ForbiddenError) {
      return { success: false, error: 'FORBIDDEN', message: 'Admin access privileges required' };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
    };
  }
}

/**
 * Admin action: PAID -> PROCESSING
 */
export async function adminMarkProcessingAction(
  orderId: string,
  note?: string
): Promise<AdminActionResult> {
  try {
    const admin = await requireAdmin();
    const result = await markOrderAsProcessing(
      orderId,
      admin.id,
      note || `Processing started by admin (${admin.email})`
    );

    if (result.success) {
      revalidatePath('/admin');
      revalidatePath('/admin/orders');
      revalidatePath(`/admin/orders/${orderId}`);
      revalidatePath('/transactions');
      revalidatePath(`/transactions/${orderId}`);
    }
    return result;
  } catch (error) {
    if (error instanceof UnauthorizedError) return { success: false, error: 'UNAUTHORIZED' };
    if (error instanceof ForbiddenError) return { success: false, error: 'FORBIDDEN' };
    return { success: false, error: error instanceof Error ? error.message : 'UNKNOWN_ERROR' };
  }
}

/**
 * Admin action: PROCESSING -> PACKED
 */
export async function adminMarkPackedAction(
  orderId: string,
  note?: string
): Promise<AdminActionResult> {
  try {
    const admin = await requireAdmin();
    const result = await markOrderAsPacked(
      orderId,
      admin.id,
      note || `Order packed and ready for shipping by admin (${admin.email})`
    );

    if (result.success) {
      revalidatePath('/admin');
      revalidatePath('/admin/orders');
      revalidatePath(`/admin/orders/${orderId}`);
      revalidatePath('/transactions');
      revalidatePath(`/transactions/${orderId}`);
    }
    return result;
  } catch (error) {
    if (error instanceof UnauthorizedError) return { success: false, error: 'UNAUTHORIZED' };
    if (error instanceof ForbiddenError) return { success: false, error: 'FORBIDDEN' };
    return { success: false, error: error instanceof Error ? error.message : 'UNKNOWN_ERROR' };
  }
}

/**
 * Admin action: PACKED -> SHIPPED with optional or validated tracking number
 */
export async function adminMarkShippedAction(
  orderId: string,
  trackingNumber?: string,
  note?: string
): Promise<AdminActionResult> {
  try {
    const admin = await requireAdmin();
    const cleanTracking = trackingNumber?.trim() || undefined;

    const result = await markOrderAsShipped(
      orderId,
      cleanTracking,
      admin.id,
      note || (cleanTracking ? `Dispatched with tracking ${cleanTracking}` : `Dispatched by admin (${admin.email})`)
    );

    if (result.success) {
      revalidatePath('/admin');
      revalidatePath('/admin/orders');
      revalidatePath(`/admin/orders/${orderId}`);
      revalidatePath('/transactions');
      revalidatePath(`/transactions/${orderId}`);
    }
    return result;
  } catch (error) {
    if (error instanceof UnauthorizedError) return { success: false, error: 'UNAUTHORIZED' };
    if (error instanceof ForbiddenError) return { success: false, error: 'FORBIDDEN' };
    return { success: false, error: error instanceof Error ? error.message : 'UNKNOWN_ERROR' };
  }
}

/**
 * Admin action: SHIPPED -> DELIVERED
 */
export async function adminMarkDeliveredAction(
  orderId: string,
  note?: string
): Promise<AdminActionResult> {
  try {
    const admin = await requireAdmin();
    const result = await markOrderAsDelivered(
      orderId,
      admin.id,
      note || `Delivery confirmed by admin (${admin.email})`
    );

    if (result.success) {
      revalidatePath('/admin');
      revalidatePath('/admin/orders');
      revalidatePath(`/admin/orders/${orderId}`);
      revalidatePath('/transactions');
      revalidatePath(`/transactions/${orderId}`);
    }
    return result;
  } catch (error) {
    if (error instanceof UnauthorizedError) return { success: false, error: 'UNAUTHORIZED' };
    if (error instanceof ForbiddenError) return { success: false, error: 'FORBIDDEN' };
    return { success: false, error: error instanceof Error ? error.message : 'UNKNOWN_ERROR' };
  }
}

/**
 * Admin action: DELIVERED -> COMPLETED
 */
export async function adminCompleteOrderAction(
  orderId: string,
  note?: string
): Promise<AdminActionResult> {
  try {
    const admin = await requireAdmin();
    const result = await completeOrderService(
      orderId,
      admin.id,
      'ADMIN'
    );

    if (result.success) {
      revalidatePath('/admin');
      revalidatePath('/admin/orders');
      revalidatePath(`/admin/orders/${orderId}`);
      revalidatePath('/transactions');
      revalidatePath(`/transactions/${orderId}`);
    }
    return result;
  } catch (error) {
    if (error instanceof UnauthorizedError) return { success: false, error: 'UNAUTHORIZED' };
    if (error instanceof ForbiddenError) return { success: false, error: 'FORBIDDEN' };
    return { success: false, error: error instanceof Error ? error.message : 'UNKNOWN_ERROR' };
  }
}

/**
 * Admin action: Controlled cancellation (permitted states only, e.g. PENDING_PAYMENT)
 */
export async function adminCancelOrderAction(
  orderId: string,
  reason?: string
): Promise<AdminActionResult> {
  try {
    const admin = await requireAdmin();
    const result = await cancelOrderService(
      orderId,
      reason || 'Order cancelled by admin',
      admin.id,
      'ADMIN'
    );

    if (result.success) {
      revalidatePath('/admin');
      revalidatePath('/admin/orders');
      revalidatePath(`/admin/orders/${orderId}`);
      revalidatePath('/transactions');
      revalidatePath(`/transactions/${orderId}`);
    }
    return result;
  } catch (error) {
    if (error instanceof UnauthorizedError) return { success: false, error: 'UNAUTHORIZED' };
    if (error instanceof ForbiddenError) return { success: false, error: 'FORBIDDEN' };
    return { success: false, error: error instanceof Error ? error.message : 'UNKNOWN_ERROR' };
  }
}
