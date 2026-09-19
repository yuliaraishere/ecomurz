import { requireAdmin } from '@/features/auth/services/require-admin';
import { analyticsService } from '@/features/analytics/services/analytics-service';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { AnalyticsPeriodSelector } from '@/components/admin/analytics/analytics-period-selector';
import { KpiSummaryCards } from '@/components/admin/analytics/kpi-summary-cards';
import { RevenueChart } from '@/components/admin/analytics/revenue-chart';
import { OrderFunnelChart } from '@/components/admin/analytics/order-funnel-chart';
import { TopProductsTable } from '@/components/admin/analytics/top-products-table';
import { CategoryPerformanceTable } from '@/components/admin/analytics/category-performance-table';
import { InventoryHealthTable } from '@/components/admin/analytics/inventory-health-table';
import { PromotionsTable } from '@/components/admin/analytics/promotions-table';
import { FulfillmentMetricsCard } from '@/components/admin/analytics/fulfillment-metrics-card';
import { CustomerMetricsCard } from '@/components/admin/analytics/customer-metrics-card';
import { BarChart3 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminAnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    period?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
    categoryId?: string;
    productId?: string;
  }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // 1. Enforce strict server-authoritative admin access
  await requireAdmin();

  const t = await getTranslations('Analytics');
  const filters = await searchParams;

  // 2. Fetch aggregated dashboard data
  const data = await analyticsService.getDashboardData(filters);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <BarChart3 className="size-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground font-serif">
              {t('title')}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{t('subtitle')}</p>
        </div>
      </div>

      {/* Period & Filter Controls */}
      <AnalyticsPeriodSelector
        currentPeriod={data.period}
        startDate={filters.startDate}
        endDate={filters.endDate}
      />

      {/* Top Level KPI Cards */}
      <KpiSummaryCards
        salesSummary={data.salesSummary}
        returnMetrics={data.returnMetrics}
        refundMetrics={data.refundMetrics}
      />

      {/* Charts Section: Revenue Area Chart & Order Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RevenueChart data={data.salesSeries} />
        </div>
        <div className="lg:col-span-1">
          <OrderFunnelChart orderMetrics={data.orderMetrics} />
        </div>
      </div>

      {/* Top Products Performance Table */}
      <TopProductsTable products={data.topProducts} />

      {/* Categories & Inventory Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CategoryPerformanceTable categories={data.categoryPerformance} />
        <InventoryHealthTable inventory={data.inventoryMetrics} />
      </div>

      {/* Promotions & Fulfillment Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PromotionsTable promotions={data.promotionMetrics} />
        <FulfillmentMetricsCard fulfillment={data.fulfillmentMetrics} />
      </div>

      {/* Privacy-Preserving Customer Analytics */}
      <CustomerMetricsCard customer={data.customerMetrics} />
    </div>
  );
}
