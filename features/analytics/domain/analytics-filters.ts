/**
 * Analytics Filters Domain
 * Validates, normalizes, and sanitizes reporting query filters.
 */

import { AnalyticsPeriod, SUPPORTED_PERIODS } from './analytics-period';

export interface AnalyticsFilterInput {
  period?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  status?: string | null;
  categoryId?: string | null;
  productId?: string | null;
  carrier?: string | null;
  limit?: number | string | null;
}

export interface SanitizedAnalyticsFilters {
  period: AnalyticsPeriod;
  startDate?: string;
  endDate?: string;
  status?: string;
  categoryId?: string;
  productId?: string;
  carrier?: string;
  limit: number;
}

const VALID_STATUSES = new Set([
  'ALL',
  'PENDING_PAYMENT',
  'PAID',
  'PROCESSING',
  'PACKED',
  'SHIPPED',
  'DELIVERED',
  'COMPLETED',
  'CANCELLED',
]);

/**
 * Sanitizes and bounds filter inputs from client / query string.
 */
export function sanitizeAnalyticsFilters(
  input: AnalyticsFilterInput = {}
): SanitizedAnalyticsFilters {
  let period: AnalyticsPeriod = 'LAST_30_DAYS';
  if (input.period && SUPPORTED_PERIODS.includes(input.period.toUpperCase() as AnalyticsPeriod)) {
    period = input.period.toUpperCase() as AnalyticsPeriod;
  }

  let status: string | undefined = undefined;
  if (input.status) {
    const upperStatus = input.status.trim().toUpperCase();
    if (upperStatus !== 'ALL' && VALID_STATUSES.has(upperStatus)) {
      status = upperStatus;
    }
  }

  const categoryId = input.categoryId?.trim() || undefined;
  const productId = input.productId?.trim() || undefined;
  const carrier = input.carrier?.trim() || undefined;

  let limit = 10;
  if (input.limit) {
    const parsedLimit = typeof input.limit === 'number' ? input.limit : parseInt(input.limit, 10);
    if (!isNaN(parsedLimit) && parsedLimit > 0) {
      limit = Math.min(parsedLimit, 100);
    }
  }

  return {
    period,
    startDate: input.startDate?.trim() || undefined,
    endDate: input.endDate?.trim() || undefined,
    status,
    categoryId,
    productId,
    carrier,
    limit,
  };
}
