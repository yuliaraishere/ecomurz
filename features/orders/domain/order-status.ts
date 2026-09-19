export const ORDER_STATUSES = [
  'PENDING_PAYMENT',
  'PAID',
  'PROCESSING',
  'PACKED',
  'SHIPPED',
  'DELIVERED',
  'COMPLETED',
  'CANCELLED',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_ACTOR_TYPES = [
  'CUSTOMER',
  'SYSTEM',
  'ADMIN',
  'PAYMENT',
  'INVENTORY',
  'SHIPPING',
] as const;

export type OrderActorType = (typeof ORDER_ACTOR_TYPES)[number];

export function isKnownOrderStatus(status: string): status is OrderStatus {
  return ORDER_STATUSES.includes(status as OrderStatus);
}

/**
 * Normalizes legacy or informal order statuses (e.g. from Step 8 demo)
 * to official OrderStatus enum values.
 */
export function normalizeLegacyOrderStatus(status: string): OrderStatus {
  if (status === 'Diproses') {
    return 'PROCESSING';
  }
  if (isKnownOrderStatus(status)) {
    return status;
  }
  return 'PROCESSING';
}
