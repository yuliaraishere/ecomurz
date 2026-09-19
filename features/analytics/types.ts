/**
 * Analytics Domain Types & DTOs
 * Authoritative read-only types for reporting and admin dashboard.
 * Currency: Strictly integer JPY.
 * Timezone: Asia/Tokyo.
 */

import type { AnalyticsPeriod, DateRange } from './domain/analytics-period';
import type { SanitizedAnalyticsFilters } from './domain/analytics-filters';

export type { AnalyticsPeriod, DateRange, SanitizedAnalyticsFilters };

export interface SalesSummary {
  grossMerchandiseSales: number; // Sum of order subtotal for paid orders (JPY)
  discountAmount: number; // Sum of order discounts for paid orders (JPY)
  netMerchandiseSales: number; // grossMerchandiseSales - discountAmount (JPY)
  shippingRevenue: number; // Sum of shipping prices for paid orders (JPY)
  refundAmount: number; // Sum of successful refunds (JPY)
  netRevenue: number; // (netMerchandiseSales + shippingRevenue) - refundAmount (JPY)
  orderCount: number; // All orders created in range
  paidOrderCount: number; // Successfully paid orders
  cancelledOrderCount: number; // Cancelled orders
  returnedOrderCount: number; // Completed/approved returns
  averageOrderValue: number; // netRevenue / paidOrderCount (JPY integer)
}

export interface SalesSeriesPoint {
  date: string; // YYYY-MM-DD JST
  grossSales: number; // JPY
  netRevenue: number; // JPY
  orderCount: number;
}

export interface OrderStatusFunnelItem {
  stage: string;
  count: number;
  label: string;
}

export interface OrderMetrics {
  total: number;
  pendingPayment: number;
  paid: number;
  processing: number;
  packed: number;
  shipped: number;
  delivered: number;
  completed: number;
  cancelled: number;
  statusFunnel: OrderStatusFunnelItem[];
}

export interface ProductAnalytics {
  productId: string;
  productName: string;
  sku: string;
  categoryName: string;
  unitsSold: number;
  grossSales: number; // JPY from OrderItem snapshots
  discountAllocation: number; // JPY
  netSales: number; // grossSales - discountAllocation (JPY)
  refundedUnits: number;
  refundAmount: number; // JPY
  currentStock: number;
  refundRate: number; // % (0-100)
}

export interface CategoryAnalytics {
  categoryId: string;
  categoryName: string;
  orderCount: number;
  unitsSold: number;
  grossSales: number; // JPY
  discountAmount: number; // JPY
  netSales: number; // JPY
  refundAmount: number; // JPY
}

export interface InventoryItemStatus {
  id: string;
  sku: string;
  name: string;
  availableQty: number;
  reservedQty: number;
  status: 'LOW_STOCK' | 'OUT_OF_STOCK' | 'HEALTHY';
}

export interface InventoryMetrics {
  availableStock: number;
  reservedStock: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  healthyProducts: number;
  lowStockThreshold: number; // Constant: 5
  items: InventoryItemStatus[];
}

export interface PromotionAnalytics {
  code: string;
  name: string;
  timesUsed: number;
  totalDiscount: number; // JPY
  orderCount: number;
  averageDiscount: number; // JPY
  remainingUsage: number | null;
  isActive: boolean;
}

export interface ReturnMetrics {
  requests: number;
  approved: number;
  rejected: number;
  inTransit: number;
  received: number;
  completed: number;
  cancelled: number;
  returnedUnits: number;
  refundAmount: number; // JPY
  returnRate: number; // % (0-100) relative to delivered/completed orders
}

export interface RefundMetrics {
  totalRefunds: number;
  succeededRefunds: number;
  failedRefunds: number;
  pendingRefunds: number;
  refundAmount: number; // JPY
  refundRate: number; // % (0-100) relative to paid order revenue
}

export interface CancellationMetrics {
  total: number;
  direct: number;
  requested: number;
  approved: number;
  rejected: number;
  cancellationRate: number; // % (0-100) relative to all orders
  reasons: Array<{ reason: string; count: number }>;
}

export interface CarrierPerformance {
  carrier: string;
  shipments: number;
  delivered: number;
  failed: number;
  returned: number;
  avgDeliveryDays: number | null;
}

export interface FulfillmentMetrics {
  shippedCount: number;
  deliveredCount: number;
  failureCount: number;
  avgTimeToShipHours: number | null;
  avgTimeToDeliveryHours: number | null;
  carrierPerformance: CarrierPerformance[];
}

export interface CustomerMetrics {
  totalCustomers: number;
  customersWithOrders: number;
  newCustomers: number; // Customer whose first order was in range
  repeatCustomers: number; // Customers with >1 order
  ordersPerCustomer: number;
  repeatPurchaseRate: number; // % (0-100)
  averageCustomerOrderValue: number; // JPY
}

export interface AnalyticsDashboardData {
  period: AnalyticsPeriod;
  dateRange: {
    startDate: string; // ISO
    endDate: string; // ISO
  };
  filters: SanitizedAnalyticsFilters;
  salesSummary: SalesSummary;
  salesSeries: SalesSeriesPoint[];
  orderMetrics: OrderMetrics;
  topProducts: ProductAnalytics[];
  categoryPerformance: CategoryAnalytics[];
  inventoryMetrics: InventoryMetrics;
  promotionMetrics: PromotionAnalytics[];
  returnMetrics: ReturnMetrics;
  refundMetrics: RefundMetrics;
  cancellationMetrics: CancellationMetrics;
  fulfillmentMetrics: FulfillmentMetrics;
  customerMetrics: CustomerMetrics;
}
