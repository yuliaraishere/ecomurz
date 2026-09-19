import { getTranslations } from 'next-intl/server';
import {
  Coins,
  ShoppingBag,
  TrendingUp,
  RotateCcw,
  Receipt,
} from 'lucide-react';
import type { SalesSummary, ReturnMetrics, RefundMetrics } from '@/features/analytics/types';

interface KpiSummaryCardsProps {
  salesSummary: SalesSummary;
  returnMetrics: ReturnMetrics;
  refundMetrics: RefundMetrics;
}

export async function KpiSummaryCards({
  salesSummary,
  returnMetrics,
  refundMetrics,
}: KpiSummaryCardsProps) {
  const t = await getTranslations('Analytics.kpi');

  const cards = [
    {
      title: t('netRevenue'),
      value: `¥${salesSummary.netRevenue.toLocaleString('ja-JP')}`,
      detail: `${t('gross')}: ¥${salesSummary.grossMerchandiseSales.toLocaleString('ja-JP')}`,
      icon: Coins,
      color: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20',
    },
    {
      title: t('orders'),
      value: salesSummary.paidOrderCount.toString(),
      detail: `${t('totalCreated')}: ${salesSummary.orderCount}`,
      icon: ShoppingBag,
      color: 'text-blue-600 bg-blue-500/10 border-blue-500/20',
    },
    {
      title: t('averageOrderValue'),
      value: `¥${salesSummary.averageOrderValue.toLocaleString('ja-JP')}`,
      detail: t('perPaidOrder'),
      icon: TrendingUp,
      color: 'text-indigo-600 bg-indigo-500/10 border-indigo-500/20',
    },
    {
      title: t('refunds'),
      value: `¥${salesSummary.refundAmount.toLocaleString('ja-JP')}`,
      detail: `${refundMetrics.succeededRefunds} ${t('successfulRefunds')}`,
      icon: Receipt,
      color: 'text-amber-600 bg-amber-500/10 border-amber-500/20',
    },
    {
      title: t('returnRate'),
      value: `${returnMetrics.returnRate}%`,
      detail: `${returnMetrics.returnedUnits} ${t('unitsReturned')}`,
      icon: RotateCcw,
      color: 'text-rose-600 bg-rose-500/10 border-rose-500/20',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {card.title}
              </span>
              <div className={`p-2 rounded-lg border ${card.color}`}>
                <Icon className="size-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold tracking-tight text-foreground font-mono">
                {card.value}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {card.detail}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
