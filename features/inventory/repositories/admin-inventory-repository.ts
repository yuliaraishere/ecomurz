import { prisma } from '@/lib/prisma';
import { LOW_STOCK_THRESHOLD } from '../config';

export interface AdminInventoryItem {
  id: string;
  productId: string;
  productName: string;
  categoryName?: string;
  catalogStock: number;
  availableQty: number;
  reservedQty: number;
  activeReservationsCount: number;
  isLowStock: boolean;
  isOutOfStock: boolean;
  updatedAt: string;
}

export interface AdminInventorySummary {
  totalItems: number;
  lowStockItems: number;
  outOfStockItems: number;
  totalAvailableUnits: number;
  totalReservedUnits: number;
}

export interface AdminInventoryListResult {
  items: AdminInventoryItem[];
  summary: AdminInventorySummary;
}

export class AdminInventoryRepository {
  async getInventoryOverview(locale: string = 'id', filter?: 'all' | 'low_stock' | 'out_of_stock'): Promise<AdminInventoryListResult> {
    const inventories = await prisma.inventory.findMany({
      include: {
        product: {
          include: {
            category: true,
            translations: {
              where: { locale },
            },
          },
        },
        reservations: {
          where: { status: 'ACTIVE' },
        },
      },
      orderBy: {
        availableQty: 'asc',
      },
    });

    let lowStockCount = 0;
    let outOfStockCount = 0;
    let totalAvailable = 0;
    let totalReserved = 0;

    const mappedItems: AdminInventoryItem[] = inventories.map((inv) => {
      const translation = inv.product.translations[0];
      const productName = translation?.name || inv.productId;
      const isOutOfStock = inv.availableQty === 0;
      const isLowStock = inv.availableQty > 0 && inv.availableQty <= LOW_STOCK_THRESHOLD;

      if (isOutOfStock) outOfStockCount++;
      if (isLowStock) lowStockCount++;
      totalAvailable += inv.availableQty;
      totalReserved += inv.reservedQty;

      return {
        id: inv.id,
        productId: inv.productId,
        productName,
        categoryName: inv.product.category?.name,
        catalogStock: inv.product.stock,
        availableQty: inv.availableQty,
        reservedQty: inv.reservedQty,
        activeReservationsCount: inv.reservations.length,
        isLowStock,
        isOutOfStock,
        updatedAt: inv.updatedAt.toISOString(),
      };
    });

    let filteredItems = mappedItems;
    if (filter === 'low_stock') {
      filteredItems = mappedItems.filter((i) => i.isLowStock || i.isOutOfStock);
    } else if (filter === 'out_of_stock') {
      filteredItems = mappedItems.filter((i) => i.isOutOfStock);
    }

    return {
      items: filteredItems,
      summary: {
        totalItems: mappedItems.length,
        lowStockItems: lowStockCount,
        outOfStockItems: outOfStockCount,
        totalAvailableUnits: totalAvailable,
        totalReservedUnits: totalReserved,
      },
    };
  }
}

export const adminInventoryRepository = new AdminInventoryRepository();
