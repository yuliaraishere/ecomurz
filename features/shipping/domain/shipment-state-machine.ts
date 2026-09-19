import type { ShipmentStatus } from '../types';

export class InvalidShipmentTransitionError extends Error {
  readonly fromStatus: ShipmentStatus;
  readonly toStatus: ShipmentStatus;

  constructor(fromStatus: ShipmentStatus, toStatus: ShipmentStatus) {
    super(`Invalid shipment status transition from "${fromStatus}" to "${toStatus}"`);
    this.name = 'InvalidShipmentTransitionError';
    this.fromStatus = fromStatus;
    this.toStatus = toStatus;
  }
}

/**
 * State Transition Matrix for RUPA Courier & Shipment Lifecycle
 */
const ALLOWED_SHIPMENT_TRANSITIONS: Record<ShipmentStatus, readonly ShipmentStatus[]> = {
  PENDING: ['READY_TO_SHIP', 'CANCELLED'],
  READY_TO_SHIP: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['IN_TRANSIT', 'DELIVERY_FAILED'],
  IN_TRANSIT: ['OUT_FOR_DELIVERY', 'DELIVERY_FAILED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'DELIVERY_FAILED'],
  DELIVERED: ['RETURNED'],
  DELIVERY_FAILED: ['OUT_FOR_DELIVERY', 'RETURNED'],
  CANCELLED: [],
  RETURNED: [],
};

export function canTransitionShipment(from: ShipmentStatus, to: ShipmentStatus): boolean {
  if (from === to) return false;
  const allowed = ALLOWED_SHIPMENT_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

export function assertValidShipmentTransition(from: ShipmentStatus, to: ShipmentStatus): void {
  if (!canTransitionShipment(from, to)) {
    throw new InvalidShipmentTransitionError(from, to);
  }
}
