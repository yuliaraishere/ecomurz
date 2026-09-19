import { prisma } from '@/lib/prisma';
import type { Prisma, Inventory as PrismaInventory, InventoryReservation as PrismaInventoryReservation } from '@prisma/client';
import type {
  InventoryRecord,
  InventoryReservationRecord,
  InventoryReservationStatus,
} from '../types';
import type { InventoryRepository } from './inventory-repository';

type DbClient = Prisma.TransactionClient | typeof prisma;

export function mapPrismaInventoryToRecord(inv: PrismaInventory): InventoryRecord {
  return {
    id: inv.id,
    productId: inv.productId,
    availableQty: inv.availableQty,
    reservedQty: inv.reservedQty,
    createdAt: inv.createdAt,
    updatedAt: inv.updatedAt,
  };
}

export function mapPrismaReservationToRecord(res: PrismaInventoryReservation): InventoryReservationRecord {
  return {
    id: res.id,
    orderId: res.orderId,
    productId: res.productId,
    inventoryId: res.inventoryId,
    quantity: res.quantity,
    status: res.status as InventoryReservationStatus,
    expiresAt: res.expiresAt,
    createdAt: res.createdAt,
    updatedAt: res.updatedAt,
  };
}

export class PrismaInventoryRepository implements InventoryRepository {
  async getInventoryByProductId(productId: string, client: DbClient = prisma): Promise<InventoryRecord | null> {
    const inv = await client.inventory.findUnique({
      where: { productId },
    });
    return inv ? mapPrismaInventoryToRecord(inv) : null;
  }

  async getInventoryByProductIds(productIds: string[], client: DbClient = prisma): Promise<InventoryRecord[]> {
    const invs = await client.inventory.findMany({
      where: { productId: { in: productIds } },
    });
    return invs.map(mapPrismaInventoryToRecord);
  }

  async getActiveReservationsForOrder(orderId: string, client: DbClient = prisma): Promise<InventoryReservationRecord[]> {
    const reservations = await client.inventoryReservation.findMany({
      where: {
        orderId,
        status: 'ACTIVE',
      },
    });
    return reservations.map(mapPrismaReservationToRecord);
  }

  async getAllReservationsForOrder(orderId: string, client: DbClient = prisma): Promise<InventoryReservationRecord[]> {
    const reservations = await client.inventoryReservation.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    });
    return reservations.map(mapPrismaReservationToRecord);
  }

  async getExpiredActiveReservations(client: DbClient = prisma): Promise<InventoryReservationRecord[]> {
    const now = new Date();
    const reservations = await client.inventoryReservation.findMany({
      where: {
        status: 'ACTIVE',
        expiresAt: { lte: now },
      },
    });
    return reservations.map(mapPrismaReservationToRecord);
  }
}

export const prismaInventoryRepository = new PrismaInventoryRepository();
