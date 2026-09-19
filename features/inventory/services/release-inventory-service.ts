import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import type { InventoryReservationRecord } from '../types';
import { mapPrismaReservationToRecord } from '../repositories/prisma-inventory-repository';

export interface ReleaseInventoryOptions {
  orderId: string;
  tx?: Prisma.TransactionClient;
}

export async function releaseInventoryService({
  orderId,
  tx,
}: ReleaseInventoryOptions): Promise<InventoryReservationRecord[]> {
  const runner = async (client: Prisma.TransactionClient) => {
    const activeReservations = await client.inventoryReservation.findMany({
      where: {
        orderId,
        status: 'ACTIVE',
      },
    });

    if (activeReservations.length === 0) {
      // Check if already released (idempotent no-op)
      const existingReleased = await client.inventoryReservation.findMany({
        where: { orderId, status: 'RELEASED' },
      });
      if (existingReleased.length > 0) {
        return existingReleased.map(mapPrismaReservationToRecord);
      }
      return [];
    }

    const releasedReservations: InventoryReservationRecord[] = [];

    for (const res of activeReservations) {
      // Return reservedQty back to availableQty
      await client.$executeRaw`
        UPDATE "Inventory"
        SET "availableQty" = "availableQty" + ${res.quantity},
            "reservedQty" = GREATEST(0, "reservedQty" - ${res.quantity}),
            "updatedAt" = NOW()
        WHERE "productId" = ${res.productId}
      `;

      // Mark reservation as RELEASED
      const updatedReservation = await client.inventoryReservation.update({
        where: { id: res.id },
        data: { status: 'RELEASED' },
      });

      releasedReservations.push(mapPrismaReservationToRecord(updatedReservation));
    }

    return releasedReservations;
  };

  if (tx) {
    return runner(tx);
  }

  return prisma.$transaction(async (internalTx) => {
    return runner(internalTx);
  });
}
