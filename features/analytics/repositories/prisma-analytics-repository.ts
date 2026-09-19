/**
 * Prisma Analytics Repository Implementation
 * PostgreSQL aggregate queries over authoritative commerce tables.
 * Safe zero-normalization, strictly integer JPY, Asia/Tokyo timezone.
 */

import { prisma } from '@/lib/prisma';
import type { AnalyticsRepository } from './analytics-repository';
import type {
  DateRange,
  SanitizedAnalyticsFilters,
  SalesSummary,
  SalesSeriesPoint,
  OrderMetrics,
  ProductAnalytics,
  CategoryAnalytics,
  InventoryMetrics,
  PromotionAnalytics,
  ReturnMetrics,
  RefundMetrics,
  CancellationMetrics,
  FulfillmentMetrics,
  CustomerMetrics,
  InventoryItemStatus,
  CarrierPerformance,
} from '../types';
import { formatTokyoDateKey, getTokyoParts, createTokyoDate } from '../domain/analytics-period';

const PAID_ORDER_STATUSES = ['PAID', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED', 'COMPLETED'];
const LOW_STOCK_THRESHOLD = 5;

export class PrismaAnalyticsRepository implements AnalyticsRepository {
  /**
   * Helper to construct base order where clause respecting date range and filters.
   */
  private buildOrderWhere(dateRange: DateRange, filters: SanitizedAnalyticsFilters) {
    const where: any = {
      createdAt: {
        gte: dateRange.startDate,
        lte: dateRange.endDate,
      },
    };

    if (filters.status && filters.status !== 'ALL') {
      where.status = filters.status;
    }

    if (filters.categoryId) {
      where.items = {
        some: {
          product: {
            categoryId: filters.categoryId,
          },
        },
      };
    }

    if (filters.productId) {
      where.items = {
        some: {
          productId: filters.productId,
        },
      };
    }

    return where;
  }

  /**
   * 1. Sales Summary
   */
  async getSalesSummary(
    dateRange: DateRange,
    filters: SanitizedAnalyticsFilters
  ): Promise<SalesSummary> {
    const baseWhere = this.buildOrderWhere(dateRange, filters);

    // Total orders count in range
    const orderCount = await prisma.order.count({ where: baseWhere });

    // Cancelled orders count in range
    const cancelledOrderCount = await prisma.order.count({
      where: {
        ...baseWhere,
        status: 'CANCELLED',
      },
    });

    // Qualifying paid orders: status in PAID_ORDER_STATUSES or has a PAID payment record
    const paidOrderWhere: any = {
      ...baseWhere,
      OR: [
        { status: { in: PAID_ORDER_STATUSES } },
        { payments: { some: { status: 'PAID' } } },
      ],
      // Exclude orders that were cancelled without payment
      NOT: {
        AND: [
          { status: 'CANCELLED' },
          { payments: { none: { status: 'PAID' } } },
        ],
      },
    };

    const paidOrders = await prisma.order.findMany({
      where: paidOrderWhere,
      select: {
        id: true,
        subtotal: true,
        discountAmount: true,
        shippingPrice: true,
        total: true,
      },
    });

    const paidOrderCount = paidOrders.length;

    let grossMerchandiseSales = 0;
    let discountAmount = 0;
    let shippingRevenue = 0;

    for (const order of paidOrders) {
      grossMerchandiseSales += order.subtotal || 0;
      discountAmount += order.discountAmount || 0;
      shippingRevenue += order.shippingPrice || 0;
    }

    const netMerchandiseSales = Math.max(0, grossMerchandiseSales - discountAmount);

    // Successful refunds in range
    const successfulRefunds = await prisma.refund.findMany({
      where: {
        createdAt: {
          gte: dateRange.startDate,
          lte: dateRange.endDate,
        },
        status: 'SUCCEEDED',
      },
      select: { amount: true },
    });

    let refundAmount = 0;
    for (const ref of successfulRefunds) {
      refundAmount += ref.amount || 0;
    }

    const netRevenue = Math.max(0, netMerchandiseSales + shippingRevenue - refundAmount);

    // Returned orders count (orders with returns approved/completed)
    const returnedOrderCount = await prisma.return.count({
      where: {
        createdAt: {
          gte: dateRange.startDate,
          lte: dateRange.endDate,
        },
        status: { in: ['RETURN_APPROVED', 'RETURN_IN_TRANSIT', 'RETURN_RECEIVED', 'COMPLETED'] },
      },
    });

    const averageOrderValue =
      paidOrderCount > 0 ? Math.round(netRevenue / paidOrderCount) : 0;

    return {
      grossMerchandiseSales,
      discountAmount,
      netMerchandiseSales,
      shippingRevenue,
      refundAmount,
      netRevenue,
      orderCount,
      paidOrderCount,
      cancelledOrderCount,
      returnedOrderCount,
      averageOrderValue,
    };
  }

  /**
   * 2. Sales Series over Time (Asia/Tokyo calendar days)
   */
  async getSalesSeries(
    dateRange: DateRange,
    filters: SanitizedAnalyticsFilters
  ): Promise<SalesSeriesPoint[]> {
    const baseWhere = this.buildOrderWhere(dateRange, filters);

    // Query paid orders with createdAt, subtotal, discount, shipping
    const paidOrders = await prisma.order.findMany({
      where: {
        ...baseWhere,
        OR: [
          { status: { in: PAID_ORDER_STATUSES } },
          { payments: { some: { status: 'PAID' } } },
        ],
        NOT: {
          AND: [
            { status: 'CANCELLED' },
            { payments: { none: { status: 'PAID' } } },
          ],
        },
      },
      select: {
        createdAt: true,
        subtotal: true,
        discountAmount: true,
        shippingPrice: true,
      },
    });

    // Query refunds in range
    const refunds = await prisma.refund.findMany({
      where: {
        createdAt: {
          gte: dateRange.startDate,
          lte: dateRange.endDate,
        },
        status: 'SUCCEEDED',
      },
      select: {
        createdAt: true,
        amount: true,
      },
    });

    // Build day map
    const dayMap = new Map<string, { gross: number; discount: number; shipping: number; refunds: number; count: number }>();

    // Seed all days between startDate and endDate
    let curr = new Date(dateRange.startDate);
    while (curr <= dateRange.endDate) {
      const key = formatTokyoDateKey(curr);
      if (!dayMap.has(key)) {
        dayMap.set(key, { gross: 0, discount: 0, shipping: 0, refunds: 0, count: 0 });
      }
      // advance 1 day
      curr = new Date(curr.getTime() + 24 * 60 * 60 * 1000);
    }

    // Accumulate orders
    for (const ord of paidOrders) {
      const key = formatTokyoDateKey(ord.createdAt);
      const entry = dayMap.get(key) || { gross: 0, discount: 0, shipping: 0, refunds: 0, count: 0 };
      entry.gross += ord.subtotal || 0;
      entry.discount += ord.discountAmount || 0;
      entry.shipping += ord.shippingPrice || 0;
      entry.count += 1;
      dayMap.set(key, entry);
    }

    // Accumulate refunds
    for (const ref of refunds) {
      const key = formatTokyoDateKey(ref.createdAt);
      const entry = dayMap.get(key) || { gross: 0, discount: 0, shipping: 0, refunds: 0, count: 0 };
      entry.refunds += ref.amount || 0;
      dayMap.set(key, entry);
    }

    // Format results sorted by date key
    const sortedKeys = Array.from(dayMap.keys()).sort();
    return sortedKeys.map((key) => {
      const val = dayMap.get(key)!;
      const netMerch = Math.max(0, val.gross - val.discount);
      const netRev = Math.max(0, netMerch + val.shipping - val.refunds);
      return {
        date: key,
        grossSales: val.gross,
        netRevenue: netRev,
        orderCount: val.count,
      };
    });
  }

  /**
   * 3. Order Metrics & Funnel
   */
  async getOrderMetrics(
    dateRange: DateRange,
    filters: SanitizedAnalyticsFilters
  ): Promise<OrderMetrics> {
    const baseWhere = this.buildOrderWhere(dateRange, filters);

    // Group by status
    const grouped = await prisma.order.groupBy({
      by: ['status'],
      where: baseWhere,
      _count: { id: true },
    });

    const statusCounts: Record<string, number> = {
      PENDING_PAYMENT: 0,
      PAID: 0,
      PROCESSING: 0,
      PACKED: 0,
      SHIPPED: 0,
      DELIVERED: 0,
      COMPLETED: 0,
      CANCELLED: 0,
    };

    let total = 0;
    for (const g of grouped) {
      const count = g._count.id || 0;
      total += count;
      statusCounts[g.status] = count;
    }

    const funnelStages = [
      { stage: 'PENDING_PAYMENT', label: 'Payment Pending', count: statusCounts.PENDING_PAYMENT },
      { stage: 'PAID', label: 'Paid', count: statusCounts.PAID },
      { stage: 'PROCESSING', label: 'Processing', count: statusCounts.PROCESSING },
      { stage: 'PACKED', label: 'Packed', count: statusCounts.PACKED },
      { stage: 'SHIPPED', label: 'Shipped', count: statusCounts.SHIPPED },
      { stage: 'DELIVERED', label: 'Delivered', count: statusCounts.DELIVERED },
      { stage: 'COMPLETED', label: 'Completed', count: statusCounts.COMPLETED },
    ];

    return {
      total,
      pendingPayment: statusCounts.PENDING_PAYMENT,
      paid: statusCounts.PAID,
      processing: statusCounts.PROCESSING,
      packed: statusCounts.PACKED,
      shipped: statusCounts.SHIPPED,
      delivered: statusCounts.DELIVERED,
      completed: statusCounts.COMPLETED,
      cancelled: statusCounts.CANCELLED,
      statusFunnel: funnelStages,
    };
  }

  /**
   * 4. Product Analytics (Top Products using historical OrderItem snapshots)
   */
  async getProductAnalytics(
    dateRange: DateRange,
    filters: SanitizedAnalyticsFilters
  ): Promise<ProductAnalytics[]> {
    const orderWhere = this.buildOrderWhere(dateRange, filters);

    // Qualifying paid orders filter
    const itemWhere: any = {
      order: {
        ...orderWhere,
        OR: [
          { status: { in: PAID_ORDER_STATUSES } },
          { payments: { some: { status: 'PAID' } } },
        ],
        NOT: {
          AND: [
            { status: 'CANCELLED' },
            { payments: { none: { status: 'PAID' } } },
          ],
        },
      },
    };

    if (filters.productId) {
      itemWhere.productId = filters.productId;
    }

    if (filters.categoryId) {
      itemWhere.product = {
        categoryId: filters.categoryId,
      };
    }

    const orderItems = await prisma.orderItem.findMany({
      where: itemWhere,
      select: {
        productId: true,
        productName: true,
        quantity: true,
        subtotal: true,
        discountAllocation: true,
        product: {
          select: {
            sku: true,
            category: { select: { name: true } },
            inventory: { select: { availableQty: true } },
          },
        },
      },
    });

    // Also query returned items in range
    const returnItems = await prisma.returnItem.findMany({
      where: {
        return: {
          createdAt: {
            gte: dateRange.startDate,
            lte: dateRange.endDate,
          },
          status: { in: ['RETURN_APPROVED', 'RETURN_IN_TRANSIT', 'RETURN_RECEIVED', 'COMPLETED'] },
        },
      },
      select: {
        productId: true,
        quantity: true,
        orderItem: {
          select: { productPrice: true },
        },
      },
    });

    const returnMap = new Map<string, { units: number; amount: number }>();
    for (const ri of returnItems) {
      const existing = returnMap.get(ri.productId) || { units: 0, amount: 0 };
      existing.units += ri.quantity;
      existing.amount += ri.quantity * (ri.orderItem?.productPrice || 0);
      returnMap.set(ri.productId, existing);
    }

    // Aggregate by product
    const productMap = new Map<
      string,
      {
        name: string;
        sku: string;
        categoryName: string;
        unitsSold: number;
        grossSales: number;
        discountAllocation: number;
        currentStock: number;
      }
    >();

    for (const item of orderItems) {
      const existing = productMap.get(item.productId) || {
        name: item.productName,
        sku: item.product?.sku || item.productId,
        categoryName: item.product?.category?.name || 'Uncategorized',
        unitsSold: 0,
        grossSales: 0,
        discountAllocation: 0,
        currentStock: item.product?.inventory?.availableQty ?? 0,
      };

      existing.unitsSold += item.quantity;
      existing.grossSales += item.subtotal;
      existing.discountAllocation += item.discountAllocation || 0;
      productMap.set(item.productId, existing);
    }

    const result: ProductAnalytics[] = [];

    for (const [productId, data] of productMap.entries()) {
      const returns = returnMap.get(productId) || { units: 0, amount: 0 };
      const netSales = Math.max(0, data.grossSales - data.discountAllocation);
      const refundRate =
        data.unitsSold > 0 ? Number(((returns.units / data.unitsSold) * 100).toFixed(1)) : 0;

      result.push({
        productId,
        productName: data.name,
        sku: data.sku,
        categoryName: data.categoryName,
        unitsSold: data.unitsSold,
        grossSales: data.grossSales,
        discountAllocation: data.discountAllocation,
        netSales,
        refundedUnits: returns.units,
        refundAmount: returns.amount,
        currentStock: data.currentStock,
        refundRate,
      });
    }

    // Sort by netSales descending, slice to limit
    result.sort((a, b) => b.netSales - a.netSales);
    return result.slice(0, filters.limit);
  }

  /**
   * 5. Category Performance
   */
  async getCategoryAnalytics(
    dateRange: DateRange,
    filters: SanitizedAnalyticsFilters
  ): Promise<CategoryAnalytics[]> {
    const orderWhere = this.buildOrderWhere(dateRange, filters);

    const qualifyingItems = await prisma.orderItem.findMany({
      where: {
        order: {
          ...orderWhere,
          OR: [
            { status: { in: PAID_ORDER_STATUSES } },
            { payments: { some: { status: 'PAID' } } },
          ],
          NOT: {
            AND: [
              { status: 'CANCELLED' },
              { payments: { none: { status: 'PAID' } } },
            ],
          },
        },
      },
      select: {
        orderId: true,
        quantity: true,
        subtotal: true,
        discountAllocation: true,
        product: {
          select: {
            categoryId: true,
            category: { select: { id: true, name: true } },
          },
        },
      },
    });

    const categoryMap = new Map<
      string,
      {
        name: string;
        orders: Set<string>;
        units: number;
        gross: number;
        discount: number;
        refund: number;
      }
    >();

    for (const item of qualifyingItems) {
      const catId = item.product?.categoryId || 'unknown';
      const catName = item.product?.category?.name || 'Uncategorized';

      const entry = categoryMap.get(catId) || {
        name: catName,
        orders: new Set<string>(),
        units: 0,
        gross: 0,
        discount: 0,
        refund: 0,
      };

      entry.orders.add(item.orderId);
      entry.units += item.quantity;
      entry.gross += item.subtotal;
      entry.discount += item.discountAllocation || 0;
      categoryMap.set(catId, entry);
    }

    const result: CategoryAnalytics[] = [];
    for (const [categoryId, val] of categoryMap.entries()) {
      result.push({
        categoryId,
        categoryName: val.name,
        orderCount: val.orders.size,
        unitsSold: val.units,
        grossSales: val.gross,
        discountAmount: val.discount,
        netSales: Math.max(0, val.gross - val.discount),
        refundAmount: val.refund,
      });
    }

    result.sort((a, b) => b.netSales - a.netSales);
    return result;
  }

  /**
   * 6. Inventory Operational Metrics
   */
  async getInventoryMetrics(): Promise<InventoryMetrics> {
    const inventories = await prisma.inventory.findMany({
      include: {
        product: {
          select: {
            id: true,
            sku: true,
            translations: {
              where: { locale: 'en' },
              select: { name: true },
            },
          },
        },
      },
    });

    let availableStock = 0;
    let reservedStock = 0;
    let lowStockProducts = 0;
    let outOfStockProducts = 0;
    let healthyProducts = 0;

    const items: InventoryItemStatus[] = [];

    for (const inv of inventories) {
      availableStock += inv.availableQty;
      reservedStock += inv.reservedQty;

      let status: 'LOW_STOCK' | 'OUT_OF_STOCK' | 'HEALTHY' = 'HEALTHY';
      if (inv.availableQty === 0) {
        status = 'OUT_OF_STOCK';
        outOfStockProducts += 1;
      } else if (inv.availableQty <= LOW_STOCK_THRESHOLD) {
        status = 'LOW_STOCK';
        lowStockProducts += 1;
      } else {
        healthyProducts += 1;
      }

      items.push({
        id: inv.id,
        sku: inv.product.sku || inv.productId,
        name: inv.product.translations[0]?.name || inv.product.sku || inv.productId,
        availableQty: inv.availableQty,
        reservedQty: inv.reservedQty,
        status,
      });
    }

    // Sort items: OUT_OF_STOCK first, then LOW_STOCK, then HEALTHY
    items.sort((a, b) => {
      const order = { OUT_OF_STOCK: 0, LOW_STOCK: 1, HEALTHY: 2 };
      return order[a.status] - order[b.status];
    });

    return {
      availableStock,
      reservedStock,
      lowStockProducts,
      outOfStockProducts,
      healthyProducts,
      lowStockThreshold: LOW_STOCK_THRESHOLD,
      items,
    };
  }

  /**
   * 7. Promotion & Coupon Analytics
   */
  async getPromotionMetrics(
    dateRange: DateRange,
    filters: SanitizedAnalyticsFilters
  ): Promise<PromotionAnalytics[]> {
    const usages = await prisma.promotionUsage.findMany({
      where: {
        usedAt: {
          gte: dateRange.startDate,
          lte: dateRange.endDate,
        },
      },
      include: {
        promotion: true,
      },
    });

    const promoMap = new Map<
      string,
      {
        code: string;
        name: string;
        count: number;
        totalDiscount: number;
        orders: Set<string>;
        remaining: number | null;
        isActive: boolean;
      }
    >();

    for (const u of usages) {
      const code = u.promotion.code;
      const entry = promoMap.get(code) || {
        code,
        name: u.promotion.name,
        count: 0,
        totalDiscount: 0,
        orders: new Set<string>(),
        remaining:
          u.promotion.usageLimit != null
            ? Math.max(0, u.promotion.usageLimit - u.promotion.usageCount)
            : null,
        isActive: u.promotion.isActive,
      };

      entry.count += 1;
      entry.totalDiscount += u.discountAmount;
      entry.orders.add(u.orderId);
      promoMap.set(code, entry);
    }

    const result: PromotionAnalytics[] = [];
    for (const item of promoMap.values()) {
      result.push({
        code: item.code,
        name: item.name,
        timesUsed: item.count,
        totalDiscount: item.totalDiscount,
        orderCount: item.orders.size,
        averageDiscount: item.count > 0 ? Math.round(item.totalDiscount / item.count) : 0,
        remainingUsage: item.remaining,
        isActive: item.isActive,
      });
    }

    result.sort((a, b) => b.totalDiscount - a.totalDiscount);
    return result;
  }

  /**
   * 8. Return Metrics
   */
  async getReturnMetrics(
    dateRange: DateRange,
    filters: SanitizedAnalyticsFilters
  ): Promise<ReturnMetrics> {
    const returns = await prisma.return.findMany({
      where: {
        createdAt: {
          gte: dateRange.startDate,
          lte: dateRange.endDate,
        },
      },
      include: {
        items: true,
        refunds: {
          where: { status: 'SUCCEEDED' },
          select: { amount: true },
        },
      },
    });

    let requests = 0;
    let approved = 0;
    let rejected = 0;
    let inTransit = 0;
    let received = 0;
    let completed = 0;
    let cancelled = 0;
    let returnedUnits = 0;
    let refundAmount = 0;

    for (const ret of returns) {
      requests += 1;
      switch (ret.status) {
        case 'RETURN_APPROVED':
          approved += 1;
          break;
        case 'RETURN_REJECTED':
          rejected += 1;
          break;
        case 'RETURN_IN_TRANSIT':
          inTransit += 1;
          break;
        case 'RETURN_RECEIVED':
          received += 1;
          break;
        case 'COMPLETED':
          completed += 1;
          break;
        case 'RETURN_CANCELLED':
          cancelled += 1;
          break;
      }

      if (ret.status !== 'RETURN_REJECTED' && ret.status !== 'RETURN_CANCELLED') {
        for (const it of ret.items) {
          returnedUnits += it.quantity;
        }
      }

      for (const rf of ret.refunds) {
        refundAmount += rf.amount;
      }
    }

    // Delivered & completed orders in range
    const deliveredCount = await prisma.order.count({
      where: {
        createdAt: {
          gte: dateRange.startDate,
          lte: dateRange.endDate,
        },
        status: { in: ['DELIVERED', 'COMPLETED'] },
      },
    });

    const returnRate =
      deliveredCount > 0 ? Number(((requests / deliveredCount) * 100).toFixed(1)) : 0;

    return {
      requests,
      approved,
      rejected,
      inTransit,
      received,
      completed,
      cancelled,
      returnedUnits,
      refundAmount,
      returnRate,
    };
  }

  /**
   * 9. Refund Metrics
   */
  async getRefundMetrics(
    dateRange: DateRange,
    filters: SanitizedAnalyticsFilters
  ): Promise<RefundMetrics> {
    const refunds = await prisma.refund.findMany({
      where: {
        createdAt: {
          gte: dateRange.startDate,
          lte: dateRange.endDate,
        },
      },
      select: {
        status: true,
        amount: true,
      },
    });

    let totalRefunds = refunds.length;
    let succeededRefunds = 0;
    let failedRefunds = 0;
    let pendingRefunds = 0;
    let refundAmount = 0;

    for (const r of refunds) {
      if (r.status === 'SUCCEEDED') {
        succeededRefunds += 1;
        refundAmount += r.amount;
      } else if (r.status === 'FAILED') {
        failedRefunds += 1;
      } else {
        pendingRefunds += 1;
      }
    }

    // Total gross sales in range for rate calculation
    const sales = await this.getSalesSummary(dateRange, filters);
    const refundRate =
      sales.grossMerchandiseSales > 0
        ? Number(((refundAmount / sales.grossMerchandiseSales) * 100).toFixed(1))
        : 0;

    return {
      totalRefunds,
      succeededRefunds,
      failedRefunds,
      pendingRefunds,
      refundAmount,
      refundRate,
    };
  }

  /**
   * 10. Cancellation Metrics
   */
  async getCancellationMetrics(
    dateRange: DateRange,
    filters: SanitizedAnalyticsFilters
  ): Promise<CancellationMetrics> {
    const cancellations = await prisma.cancellation.findMany({
      where: {
        createdAt: {
          gte: dateRange.startDate,
          lte: dateRange.endDate,
        },
      },
      select: {
        status: true,
        reason: true,
        actorType: true,
      },
    });

    let total = cancellations.length;
    let direct = 0;
    let requested = 0;
    let approved = 0;
    let rejected = 0;

    const reasonMap = new Map<string, number>();

    for (const c of cancellations) {
      if (c.actorType === 'ADMIN' || c.actorType === 'SYSTEM') {
        direct += 1;
      } else if (c.status === 'REQUESTED') {
        requested += 1;
      } else if (c.status === 'APPROVED' || c.status === 'CANCELLED') {
        approved += 1;
      } else if (c.status === 'REJECTED') {
        rejected += 1;
      }

      const rCount = reasonMap.get(c.reason) || 0;
      reasonMap.set(c.reason, rCount + 1);
    }

    const allOrdersCount = await prisma.order.count({
      where: this.buildOrderWhere(dateRange, filters),
    });

    const cancellationRate =
      allOrdersCount > 0 ? Number(((total / allOrdersCount) * 100).toFixed(1)) : 0;

    const reasons = Array.from(reasonMap.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count);

    return {
      total,
      direct,
      requested,
      approved,
      rejected,
      cancellationRate,
      reasons,
    };
  }

  /**
   * 11. Fulfillment & Carrier Metrics
   */
  async getFulfillmentMetrics(
    dateRange: DateRange,
    filters: SanitizedAnalyticsFilters
  ): Promise<FulfillmentMetrics> {
    const shipments = await prisma.shipment.findMany({
      where: {
        createdAt: {
          gte: dateRange.startDate,
          lte: dateRange.endDate,
        },
      },
      include: {
        order: {
          select: {
            createdAt: true,
            statusHistory: {
              where: { toStatus: 'PAID' },
              select: { createdAt: true },
              take: 1,
            },
          },
        },
      },
    });

    let shippedCount = 0;
    let deliveredCount = 0;
    let failureCount = 0;

    let totalShipHours = 0;
    let shipHoursCount = 0;

    let totalDeliveryHours = 0;
    let deliveryHoursCount = 0;

    const carrierMap = new Map<
      string,
      {
        shipments: number;
        delivered: number;
        failed: number;
        returned: number;
        totalDeliveryMs: number;
        deliveryCount: number;
      }
    >();

    for (const sh of shipments) {
      const carrier = sh.carrierName || sh.provider || 'Standard Delivery';
      const cEntry = carrierMap.get(carrier) || {
        shipments: 0,
        delivered: 0,
        failed: 0,
        returned: 0,
        totalDeliveryMs: 0,
        deliveryCount: 0,
      };
      cEntry.shipments += 1;

      if (sh.shippedAt) {
        shippedCount += 1;
        const paidAt = sh.order.statusHistory[0]?.createdAt || sh.order.createdAt;
        const diffMs = sh.shippedAt.getTime() - paidAt.getTime();
        if (diffMs >= 0) {
          totalShipHours += diffMs / (1000 * 60 * 60);
          shipHoursCount += 1;
        }
      }

      if (sh.deliveredAt) {
        deliveredCount += 1;
        cEntry.delivered += 1;

        if (sh.shippedAt) {
          const diffMs = sh.deliveredAt.getTime() - sh.shippedAt.getTime();
          if (diffMs >= 0) {
            totalDeliveryHours += diffMs / (1000 * 60 * 60);
            deliveryHoursCount += 1;

            cEntry.totalDeliveryMs += diffMs;
            cEntry.deliveryCount += 1;
          }
        }
      }

      if (sh.status === 'FAILED') {
        failureCount += 1;
        cEntry.failed += 1;
      } else if (sh.status === 'RETURNED') {
        cEntry.returned += 1;
      }

      carrierMap.set(carrier, cEntry);
    }

    const avgTimeToShipHours =
      shipHoursCount > 0 ? Number((totalShipHours / shipHoursCount).toFixed(1)) : null;

    const avgTimeToDeliveryHours =
      deliveryHoursCount > 0 ? Number((totalDeliveryHours / deliveryHoursCount).toFixed(1)) : null;

    const carrierPerformance: CarrierPerformance[] = [];
    for (const [carrier, d] of carrierMap.entries()) {
      const avgDays =
        d.deliveryCount > 0
          ? Number((d.totalDeliveryMs / (d.deliveryCount * 24 * 60 * 60 * 1000)).toFixed(1))
          : null;

      carrierPerformance.push({
        carrier,
        shipments: d.shipments,
        delivered: d.delivered,
        failed: d.failed,
        returned: d.returned,
        avgDeliveryDays: avgDays,
      });
    }

    return {
      shippedCount,
      deliveredCount,
      failureCount,
      avgTimeToShipHours,
      avgTimeToDeliveryHours,
      carrierPerformance,
    };
  }

  /**
   * 12. Privacy-Preserving Customer Metrics
   */
  async getCustomerMetrics(
    dateRange: DateRange,
    filters: SanitizedAnalyticsFilters
  ): Promise<CustomerMetrics> {
    const totalCustomers = await prisma.user.count({
      where: { role: 'CUSTOMER' },
    });

    const baseWhere = this.buildOrderWhere(dateRange, filters);

    // Orders placed in range with userId
    const ordersInRange = await prisma.order.findMany({
      where: {
        ...baseWhere,
        userId: { not: null },
      },
      select: {
        id: true,
        userId: true,
        total: true,
        status: true,
      },
    });

    const userOrderCounts = new Map<string, number>();
    let totalRevenue = 0;

    for (const ord of ordersInRange) {
      if (ord.userId) {
        userOrderCounts.set(ord.userId, (userOrderCounts.get(ord.userId) || 0) + 1);
        if (PAID_ORDER_STATUSES.includes(ord.status)) {
          totalRevenue += ord.total;
        }
      }
    }

    const customersWithOrders = userOrderCounts.size;

    // For all customers who ordered in range, check if this was their very first order ever
    let newCustomers = 0;
    let repeatCustomers = 0;

    for (const userId of userOrderCounts.keys()) {
      // Find earlier order
      const earlierOrder = await prisma.order.findFirst({
        where: {
          userId,
          createdAt: { lt: dateRange.startDate },
        },
        select: { id: true },
      });

      if (!earlierOrder) {
        newCustomers += 1;
      }

      // Check total lifetime order count
      const lifetimeCount = await prisma.order.count({
        where: { userId },
      });

      if (lifetimeCount > 1) {
        repeatCustomers += 1;
      }
    }

    const ordersPerCustomer =
      customersWithOrders > 0
        ? Number((ordersInRange.length / customersWithOrders).toFixed(1))
        : 0;

    const repeatPurchaseRate =
      customersWithOrders > 0
        ? Number(((repeatCustomers / customersWithOrders) * 100).toFixed(1))
        : 0;

    const averageCustomerOrderValue =
      customersWithOrders > 0 ? Math.round(totalRevenue / customersWithOrders) : 0;

    return {
      totalCustomers,
      customersWithOrders,
      newCustomers,
      repeatCustomers,
      ordersPerCustomer,
      repeatPurchaseRate,
      averageCustomerOrderValue,
    };
  }
}

export const prismaAnalyticsRepository = new PrismaAnalyticsRepository();
