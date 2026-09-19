import { type OrderStatus, normalizeLegacyOrderStatus } from './order-status';

export class InvalidOrderTransitionError extends Error {
  readonly fromStatus: OrderStatus;
  readonly toStatus: OrderStatus;

  constructor(fromStatus: OrderStatus, toStatus: OrderStatus) {
    super(`Invalid order status transition from "${fromStatus}" to "${toStatus}"`);
    this.name = 'InvalidOrderTransitionError';
    this.fromStatus = fromStatus;
    this.toStatus = toStatus;
  }
}

/**
 * State Transition Matrix for RUPA Marketplace Order Fulfillment
 *
 * PENDING_PAYMENT → PAID | CANCELLED
 * PAID            → PROCESSING | CANCELLED (admin/system)
 * PROCESSING      → PACKED | CANCELLED (admin/system)
 * PACKED          → SHIPPED
 * SHIPPED         → DELIVERED
 * DELIVERED       → COMPLETED
 * COMPLETED       → (terminal)
 * CANCELLED       → (terminal)
 */
const ALLOWED_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING_PAYMENT: ['PAID', 'CANCELLED'],
  PAID: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['PACKED', 'CANCELLED'],
  PACKED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

export function canTransitionOrderStatus(
  fromRaw: string,
  to: OrderStatus
): boolean {
  const from = normalizeLegacyOrderStatus(fromRaw);
  if (from === to) return false;
  const allowed = ALLOWED_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

export function assertValidOrderTransition(
  fromRaw: string,
  to: OrderStatus
): void {
  const from = normalizeLegacyOrderStatus(fromRaw);
  if (!canTransitionOrderStatus(from, to)) {
    throw new InvalidOrderTransitionError(from, to);
  }
}

/**
 * Customer cancellation is strictly permitted only while the order
 * is in PENDING_PAYMENT (before payment is collected).
 * After PAID, no fake refund flow is simulated.
 */
export function isCustomerCancellable(statusRaw: string): boolean {
  const status = normalizeLegacyOrderStatus(statusRaw);
  return status === 'PENDING_PAYMENT';
}

export function getTimestampFieldForTransition(
  toStatus: OrderStatus
): 'shippedAt' | 'deliveredAt' | 'completedAt' | 'cancelledAt' | null {
  switch (toStatus) {
    case 'SHIPPED':
      return 'shippedAt';
    case 'DELIVERED':
      return 'deliveredAt';
    case 'COMPLETED':
      return 'completedAt';
    case 'CANCELLED':
      return 'cancelledAt';
    default:
      return null;
  }
}
