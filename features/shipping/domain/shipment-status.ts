export type ShipmentStatus =
  | 'PENDING'
  | 'READY_TO_SHIP'
  | 'SHIPPED'
  | 'IN_TRANSIT'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'DELIVERY_FAILED'
  | 'RETURNED'
  | 'CANCELLED';

export {
  InvalidShipmentTransitionError,
  assertValidShipmentTransition,
  canTransitionShipment,
} from './shipment-state-machine';
