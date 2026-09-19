'use client';

import { useTranslations } from 'next-intl';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import type { OrderMetrics } from '@/features/analytics/types';

interface OrderFunnelChartProps {
  orderMetrics: OrderMetrics;
}

const STAGE_COLORS = [
  '#f59e0b', // PENDING_PAYMENT (amber)
  '#3b82f6', // PAID (blue)
  '#6366f1', // PROCESSING (indigo)
  '#a855f7', // PACKED (purple)
  '#06b6d4', // SHIPPED (cyan)
  '#14b8a6', // DELIVERED (teal)
  '#10b981', // COMPLETED (emerald)
];

export function OrderFunnelChart({ orderMetrics }: OrderFunnelChartProps) {
  const t = useTranslations('Analytics.charts');

  const funnelData = orderMetrics.statusFunnel.map((item, idx) => ({
    ...item,
    color: STAGE_COLORS[idx % STAGE_COLORS.length],
  }));

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-foreground text-sm">{t('orderFunnel')}</h3>
          <p className="text-xs text-muted-foreground">{t('orderFunnelSubtitle')}</p>
        </div>
        <div className="text-xs font-mono bg-muted/60 px-2.5 py-1 rounded-md text-muted-foreground">
          {t('totalOrders')}: {orderMetrics.total}
        </div>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={funnelData} layout="vertical" margin={{ top: 5, right: 20, left: 35, bottom: 5 }}>
            <XAxis type="number" fontSize={11} stroke="#888888" allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="label"
              fontSize={11}
              stroke="#888888"
              tickLine={false}
              width={90}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                borderColor: '#e5e7eb',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(value: any) => [`${value} orders`, 'Volume']}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {funnelData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Operational summary pill row */}
      <div className="mt-4 pt-3 border-t border-border flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <div>
          <span className="font-medium text-foreground">{t('completed')}:</span> {orderMetrics.completed}
        </div>
        <div>
          <span className="font-medium text-foreground">{t('cancelled')}:</span> {orderMetrics.cancelled}
        </div>
      </div>
    </div>
  );
}
