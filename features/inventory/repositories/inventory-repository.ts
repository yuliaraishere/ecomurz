import type {
  InventoryRecord,
  InventoryReservationRecord,
  InventoryReservationStatus,
} from '../types';

export interface InventoryRepository {
  getInventoryByProductId(productId: string): Promise<InventoryRecord | null>;
  getInventoryByProductIds(productIds: string[]): Promise<InventoryRecord[]>;
  getActiveReservationsForOrder(orderId: string): Promise<InventoryReservationRecord[]>;
  getAllReservationsForOrder(orderId: string): Promise<InventoryReservationRecord[]>;
  getExpiredActiveReservations(): Promise<InventoryReservationRecord[]>;
}
