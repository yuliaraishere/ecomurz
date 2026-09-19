export type InventoryReservationStatus = 'ACTIVE' | 'RELEASED' | 'CONSUMED' | 'EXPIRED' | 'RESTORED';

export interface InventoryRecord {
  id: string;
  productId: string;
  availableQty: number;
  reservedQty: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface InventoryReservationRecord {
  id: string;
  orderId: string;
  productId: string;
  inventoryId?: string | null;
  quantity: number;
  status: InventoryReservationStatus;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReservationItemInput {
  productId: string;
  quantity: number;
}

export class InsufficientStockError extends Error {
  readonly productId: string;
  readonly requested: number;
  readonly available: number;

  constructor(productId: string, requested: number, available: number) {
    super(`Insufficient stock for product ${productId}: requested ${requested}, available ${available}`);
    this.name = 'InsufficientStockError';
    this.productId = productId;
    this.requested = requested;
    this.available = available;
  }
}

export class ReservationNotFoundError extends Error {
  constructor(orderId: string) {
    super(`No active reservation found for order ${orderId}`);
    this.name = 'ReservationNotFoundError';
  }
}
