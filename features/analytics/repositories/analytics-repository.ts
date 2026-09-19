/**
 * Analytics Repository Contract
 * Read-oriented aggregate queries over authoritative transactional data.
 */

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
} from '../types';

export interface AnalyticsRepository {
  getSalesSummary(dateRange: DateRange, filters: SanitizedAnalyticsFilters): Promise<SalesSummary>;
  getSalesSeries(dateRange: DateRange, filters: SanitizedAnalyticsFilters): Promise<SalesSeriesPoint[]>;
  getOrderMetrics(dateRange: DateRange, filters: SanitizedAnalyticsFilters): Promise<OrderMetrics>;
  getProductAnalytics(dateRange: DateRange, filters: SanitizedAnalyticsFilters): Promise<ProductAnalytics[]>;
  getCategoryAnalytics(dateRange: DateRange, filters: SanitizedAnalyticsFilters): Promise<CategoryAnalytics[]>;
  getInventoryMetrics(): Promise<InventoryMetrics>;
  getPromotionMetrics(dateRange: DateRange, filters: SanitizedAnalyticsFilters): Promise<PromotionAnalytics[]>;
  getReturnMetrics(dateRange: DateRange, filters: SanitizedAnalyticsFilters): Promise<ReturnMetrics>;
  getRefundMetrics(dateRange: DateRange, filters: SanitizedAnalyticsFilters): Promise<RefundMetrics>;
  getCancellationMetrics(dateRange: DateRange, filters: SanitizedAnalyticsFilters): Promise<CancellationMetrics>;
  getFulfillmentMetrics(dateRange: DateRange, filters: SanitizedAnalyticsFilters): Promise<FulfillmentMetrics>;
  getCustomerMetrics(dateRange: DateRange, filters: SanitizedAnalyticsFilters): Promise<CustomerMetrics>;
}
