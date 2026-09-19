'use server';

import { requireAdmin } from '@/features/auth/services/require-admin';
import { analyticsService } from '../services/analytics-service';
import type { AnalyticsFilterInput } from '../domain/analytics-filters';
import type { AnalyticsDashboardData } from '../types';

/**
 * Server Action to fetch analytics dashboard data.
 * Protected by server-authoritative requireAdmin() check.
 */
export async function getAnalyticsDataAction(
  input: AnalyticsFilterInput = {}
): Promise<{ success: boolean; data?: AnalyticsDashboardData; error?: string }> {
  try {
    await requireAdmin();
    const data = await analyticsService.getDashboardData(input);
    return { success: true, data };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || 'Failed to fetch analytics data',
    };
  }
}
