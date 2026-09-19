import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import type { InventoryReservationRecord } from '../types';
import { mapPrismaReservationToRecord } from '../repositories/prisma-inventory-repository';

export interface ExpireInventoryOptions {
  tx?: Prisma.TransactionClient;
}

export async function expireInventoryReservationsService(
  options: ExpireInventoryOptions = {}
): Promise<InventoryReservationRecord[]> {
  const runner = async (client: Prisma.TransactionClient) => {
    const now = new Date();
    const expiredActiveReservations = await client.inventoryReservation.findMany({
      where: {
        status: 'ACTIVE',
        expiresAt: { lte: now },
      },
    });

    if (expiredActiveReservations.length === 0) {
      return [];
    }

    const processedReservations: InventoryReservationRecord[] = [];

    for (const res of expiredActiveReservations) {
      // Reclaim stock from reservedQty back to availableQty
      await client.$executeRaw`
        UPDATE "Inventory"
        SET "availableQty" = "availableQty" + ${res.quantity},
            "reservedQty" = GREATEST(0, "reservedQty" - ${res.quantity}),
            "updatedAt" = NOW()
        WHERE "productId" = ${res.productId}
      `;

      // Mark reservation as EXPIRED
      const updatedReservation = await client.inventoryReservation.update({
        where: { id: res.id },
        data: { status: 'EXPIRED' },
      });

      // If associated order is still PENDING_PAYMENT and has no other active reservations, cancel the order
      const remainingActive = await client.inventoryReservation.count({
        where: {
          orderId: res.orderId,
          status: 'ACTIVE',
        },
      });

      if (remainingActive === 0) {
        await client.order.updateMany({
          where: {
            id: res.orderId,
            status: 'PENDING_PAYMENT',
          },
          data: {
            status: 'CANCELLED',
          },
        });
      }

      processedReservations.push(mapPrismaReservationToRecord(updatedReservation));
    }

    return processedReservations;
  };

  if (options.tx) {
    return runner(options.tx);
  }

  return prisma.$transaction(
    async (internalTx) => {
      return runner(internalTx);
    },
    { timeout: 15000, maxWait: 10000 }
  );
}
