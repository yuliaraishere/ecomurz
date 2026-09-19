import type { OrderStatus } from '@/features/orders/domain/order-status';

export class IneligibleCancellationError extends Error {
  constructor(status: string, reason?: string) {
    super(reason || `Order with status "${status}" is not eligible for cancellation.`);
    this.name = 'IneligibleCancellationError';
  }
}

/**
 * Checks if an order can be directly cancelled immediately (unpaid order).
 */
export function canDirectlyCancel(status: string): boolean {
  return status === 'PENDING_PAYMENT';
}

/**
 * Checks if a customer can submit a cancellation request (paid but pre-shipment).
 */
export function canRequestCancellation(status: string): boolean {
  return status === 'PAID' || status === 'PROCESSING' || status === 'PACKED';
}

/**
 * Shipped or delivered orders cannot be cancelled.
 */
export function isCancellationProhibited(status: string): boolean {
  return (
    status === 'SHIPPED' ||
    status === 'DELIVERED' ||
    status === 'COMPLETED' ||
    status === 'CANCELLED'
  );
}
