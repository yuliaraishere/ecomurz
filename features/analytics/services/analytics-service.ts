/**
 * Analytics Service
 * Orchestrates date range resolution, filter validation, and data aggregation.
 */

import { prismaAnalyticsRepository } from '../repositories/prisma-analytics-repository';
import type { AnalyticsRepository } from '../repositories/analytics-repository';
import { resolveDateRange } from '../domain/analytics-period';
import {
  sanitizeAnalyticsFilters,
  type AnalyticsFilterInput,
} from '../domain/analytics-filters';
import type { AnalyticsDashboardData } from '../types';

export class AnalyticsService {
  constructor(private readonly repository: AnalyticsRepository = prismaAnalyticsRepository) {}

  /**
   * Retrieves complete dashboard data for a given filter set.
   */
  async getDashboardData(input: AnalyticsFilterInput = {}): Promise<AnalyticsDashboardData> {
    const filters = sanitizeAnalyticsFilters(input);
    const dateRange = resolveDateRange(filters.period, filters.startDate, filters.endDate);

    const [
      salesSummary,
      salesSeries,
      orderMetrics,
      topProducts,
      categoryPerformance,
      inventoryMetrics,
      promotionMetrics,
      returnMetrics,
      refundMetrics,
      cancellationMetrics,
      fulfillmentMetrics,
      customerMetrics,
    ] = await Promise.all([
      this.repository.getSalesSummary(dateRange, filters),
      this.repository.getSalesSeries(dateRange, filters),
      this.repository.getOrderMetrics(dateRange, filters),
      this.repository.getProductAnalytics(dateRange, filters),
      this.repository.getCategoryAnalytics(dateRange, filters),
      this.repository.getInventoryMetrics(),
      this.repository.getPromotionMetrics(dateRange, filters),
      this.repository.getReturnMetrics(dateRange, filters),
      this.repository.getRefundMetrics(dateRange, filters),
      this.repository.getCancellationMetrics(dateRange, filters),
      this.repository.getFulfillmentMetrics(dateRange, filters),
      this.repository.getCustomerMetrics(dateRange, filters),
    ]);

    return {
      period: filters.period,
      dateRange: {
        startDate: dateRange.startDate.toISOString(),
        endDate: dateRange.endDate.toISOString(),
      },
      filters,
      salesSummary,
      salesSeries,
      orderMetrics,
      topProducts,
      categoryPerformance,
      inventoryMetrics,
      promotionMetrics,
      returnMetrics,
      refundMetrics,
      cancellationMetrics,
      fulfillmentMetrics,
      customerMetrics,
    };
  }
}

export const analyticsService = new AnalyticsService();
