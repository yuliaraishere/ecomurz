import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import type { InventoryReservationRecord } from '../types';
import { mapPrismaReservationToRecord } from '../repositories/prisma-inventory-repository';

export interface RestoreConsumedOrderInventoryOptions {
  orderId: string;
  tx?: Prisma.TransactionClient;
}

export interface RestoreReturnedItemsInventoryOptions {
  items: Array<{ productId: string; quantity: number }>;
  returnId?: string;
  tx?: Prisma.TransactionClient;
}

/**
 * Restores consumed inventory back into sellable available stock
 * when a paid order is cancelled before fulfillment.
 * Idempotent: reservations marked as RESTORED will not be restored twice.
 */
export async function restoreConsumedOrderInventoryService({
  orderId,
  tx,
}: RestoreConsumedOrderInventoryOptions): Promise<InventoryReservationRecord[]> {
  const runner = async (client: Prisma.TransactionClient) => {
    // Locate consumed reservations
    const consumedReservations = await client.inventoryReservation.findMany({
      where: {
        orderId,
        status: 'CONSUMED',
      },
    });

    if (consumedReservations.length === 0) {
      // Idempotent: check if already restored
      const existingRestored = await client.inventoryReservation.findMany({
        where: { orderId, status: 'RESTORED' },
      });
      if (existingRestored.length > 0) {
        return existingRestored.map(mapPrismaReservationToRecord);
      }
      return [];
    }

    const restoredRecords: InventoryReservationRecord[] = [];

    for (const res of consumedReservations) {
      // Increase availableQty in Inventory
      await client.$executeRaw`
        UPDATE "Inventory"
        SET "availableQty" = "availableQty" + ${res.quantity},
            "updatedAt" = NOW()
        WHERE "productId" = ${res.productId}
      `;

      // Synchronize legacy Product.stock for backward compatibility
      await client.$executeRaw`
        UPDATE "Product"
        SET "stock" = "stock" + ${res.quantity},
            "updatedAt" = NOW()
        WHERE "id" = ${res.productId}
      `;

      // Mark reservation as RESTORED
      const updated = await client.inventoryReservation.update({
        where: { id: res.id },
        data: { status: 'RESTORED' },
      });

      restoredRecords.push(mapPrismaReservationToRecord(updated));
    }

    return restoredRecords;
  };

  return tx ? runner(tx) : prisma.$transaction(runner);
}

/**
 * Restores inventory for returned items when a Return is physically/operationally received.
 * Idempotently adds items back to availableQty and Product.stock.
 */
export async function restoreReturnedItemsInventoryService({
  items,
  tx,
}: RestoreReturnedItemsInventoryOptions): Promise<void> {
  const runner = async (client: Prisma.TransactionClient) => {
    for (const item of items) {
      if (item.quantity <= 0) continue;

      // Increment available stock in Inventory
      await client.$executeRaw`
        UPDATE "Inventory"
        SET "availableQty" = "availableQty" + ${item.quantity},
            "updatedAt" = NOW()
        WHERE "productId" = ${item.productId}
      `;

      // Increment legacy Product.stock
      await client.$executeRaw`
        UPDATE "Product"
        SET "stock" = "stock" + ${item.quantity},
            "updatedAt" = NOW()
        WHERE "id" = ${item.productId}
      `;
    }
  };

  return tx ? runner(tx) : prisma.$transaction(runner);
}
