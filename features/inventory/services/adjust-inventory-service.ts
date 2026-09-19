import { prisma } from '@/lib/prisma';

export interface AdjustInventoryInput {
  productId: string;
  adjustment: number; // positive to add, negative to deduct
  reason: string;
  adminUserId?: string;
}

export interface AdjustInventoryResult {
  success: boolean;
  productId: string;
  previousAvailableQty: number;
  newAvailableQty: number;
  reservedQty: number;
  error?: string;
}

export class AdjustInventoryService {
  async adjustInventory(input: AdjustInventoryInput): Promise<AdjustInventoryResult> {
    const { productId, adjustment, reason, adminUserId } = input;

    if (adjustment === 0) {
      throw new Error('Adjustment quantity cannot be 0');
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Fetch current inventory and product
      const inventory = await tx.inventory.findUnique({
        where: { productId },
      });

      if (!inventory) {
        throw new Error(`Inventory not found for product ${productId}`);
      }

      const newAvailableQty = inventory.availableQty + adjustment;
      if (newAvailableQty < 0) {
        throw new Error(`Cannot adjust stock below 0. Current available: ${inventory.availableQty}, adjustment: ${adjustment}`);
      }

      // 2. Update Inventory availableQty
      const updatedInventory = await tx.inventory.update({
        where: { productId },
        data: {
          availableQty: newAvailableQty,
        },
      });

      // 3. Keep Product.stock in sync with availableQty
      await tx.product.update({
        where: { id: productId },
        data: {
          stock: newAvailableQty,
        },
      });

      // 4. Record audit log
      await tx.catalogAuditLog.create({
        data: {
          entityType: 'PRODUCT',
          entityId: productId,
          action: 'STOCK_ADJUSTED',
          actorId: adminUserId || 'system',
          metadata: JSON.stringify({
            previousAvailableQty: inventory.availableQty,
            newAvailableQty,
            adjustment,
            reason,
          }),
        },
      });

      return {
        success: true,
        productId,
        previousAvailableQty: inventory.availableQty,
        newAvailableQty,
        reservedQty: updatedInventory.reservedQty,
      };
    });
  }
}

export const adjustInventoryService = new AdjustInventoryService();
