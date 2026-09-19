import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { getReservationExpiresAt } from '../config';
import {
  InsufficientStockError,
  type InventoryReservationRecord,
  type ReservationItemInput,
} from '../types';
import { mapPrismaReservationToRecord } from '../repositories/prisma-inventory-repository';

export interface ReserveInventoryOptions {
  orderId: string;
  items: ReservationItemInput[];
  tx?: Prisma.TransactionClient;
  expiresAt?: Date;
}

export async function reserveInventoryService({
  orderId,
  items,
  tx,
  expiresAt,
}: ReserveInventoryOptions): Promise<InventoryReservationRecord[]> {
  const runner = async (client: Prisma.TransactionClient) => {
    // Sort items by productId to prevent deadlocks across concurrent multi-item transactions
    const sortedItems = [...items].sort((a, b) => a.productId.localeCompare(b.productId));
    const reservationExpiry = expiresAt || getReservationExpiresAt();
    const createdReservations: InventoryReservationRecord[] = [];

    for (const item of sortedItems) {
      if (item.quantity <= 0) continue;

      // Ensure inventory record exists (gracefully backfill from Product.stock if missing)
      const existingInventory = await client.inventory.findUnique({
        where: { productId: item.productId },
      });

      if (!existingInventory) {
        const product = await client.product.findUnique({
          where: { id: item.productId },
          select: { stock: true },
        });
        const initialStock = product?.stock ?? 0;
        await client.inventory.create({
          data: {
            productId: item.productId,
            availableQty: initialStock,
            reservedQty: 0,
          },
        });
      }

      // Atomic conditional reservation: decrement availableQty and increment reservedQty
      // strictly WHERE availableQty >= requested quantity
      const updatedRows = await client.$queryRaw<
        Array<{ id: string; productId: string; availableQty: number; reservedQty: number }>
      >`
        UPDATE "Inventory"
        SET "availableQty" = "availableQty" - ${item.quantity},
            "reservedQty" = "reservedQty" + ${item.quantity},
            "updatedAt" = NOW()
        WHERE "productId" = ${item.productId} AND "availableQty" >= ${item.quantity}
        RETURNING "id", "productId", "availableQty", "reservedQty"
      `;

      if (updatedRows.length === 0) {
        const currentInv = await client.inventory.findUnique({
          where: { productId: item.productId },
          select: { availableQty: true },
        });
        const available = currentInv?.availableQty ?? 0;
        throw new InsufficientStockError(item.productId, item.quantity, available);
      }

      const updated = updatedRows[0];

      // Create ACTIVE reservation record
      const reservation = await client.inventoryReservation.create({
        data: {
          orderId,
          productId: item.productId,
          inventoryId: updated.id,
          quantity: item.quantity,
          status: 'ACTIVE',
          expiresAt: reservationExpiry,
        },
      });

      createdReservations.push(mapPrismaReservationToRecord(reservation));
    }

    return createdReservations;
  };

  if (tx) {
    return runner(tx);
  }

  return prisma.$transaction(async (internalTx) => {
    return runner(internalTx);
  });
}
