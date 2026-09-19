import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import type { InventoryReservationRecord } from '../types';
import { mapPrismaReservationToRecord } from '../repositories/prisma-inventory-repository';

export interface ConsumeInventoryOptions {
  orderId: string;
  tx?: Prisma.TransactionClient;
}

export async function consumeInventoryService({
  orderId,
  tx,
}: ConsumeInventoryOptions): Promise<InventoryReservationRecord[]> {
  const runner = async (client: Prisma.TransactionClient) => {
    const activeReservations = await client.inventoryReservation.findMany({
      where: {
        orderId,
        status: 'ACTIVE',
      },
    });

    if (activeReservations.length === 0) {
      // Check if already consumed (idempotent no-op)
      const existingConsumed = await client.inventoryReservation.findMany({
        where: { orderId, status: 'CONSUMED' },
      });
      if (existingConsumed.length > 0) {
        return existingConsumed.map(mapPrismaReservationToRecord);
      }
      return [];
    }

    const consumedReservations: InventoryReservationRecord[] = [];

    for (const res of activeReservations) {
      // Decrement reservedQty from Inventory
      await client.$executeRaw`
        UPDATE "Inventory"
        SET "reservedQty" = GREATEST(0, "reservedQty" - ${res.quantity}),
            "updatedAt" = NOW()
        WHERE "productId" = ${res.productId}
      `;

      // Synchronize legacy Product.stock for backward compatibility
      await client.$executeRaw`
        UPDATE "Product"
        SET "stock" = GREATEST(0, "stock" - ${res.quantity}),
            "updatedAt" = NOW()
        WHERE "id" = ${res.productId}
      `;

      // Mark reservation as CONSUMED
      const updatedReservation = await client.inventoryReservation.update({
        where: { id: res.id },
        data: { status: 'CONSUMED' },
      });

      consumedReservations.push(mapPrismaReservationToRecord(updatedReservation));
    }

    return consumedReservations;
  };

  if (tx) {
    return runner(tx);
  }

  return prisma.$transaction(async (internalTx) => {
    return runner(internalTx);
  });
}
