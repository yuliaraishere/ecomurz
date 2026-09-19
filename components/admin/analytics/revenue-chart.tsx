'use client';

import { useTranslations } from 'next-intl';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import type { SalesSeriesPoint } from '@/features/analytics/types';

interface RevenueChartProps {
  data: SalesSeriesPoint[];
}

export function RevenueChart({ data }: RevenueChartProps) {
  const t = useTranslations('Analytics.charts');

  const isEmpty = !data || data.length === 0 || data.every((d) => d.grossSales === 0 && d.netRevenue === 0);

  // Shorten date for X-axis (MM/DD)
  const chartData = data.map((d) => {
    const parts = d.date.split('-');
    const label = parts.length === 3 ? `${parts[1]}/${parts[2]}` : d.date;
    return {
      ...d,
      shortDate: label,
    };
  });

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-foreground text-sm">{t('revenueOverTime')}</h3>
          <p className="text-xs text-muted-foreground">{t('revenueSubtitle')}</p>
        </div>
      </div>

      {isEmpty ? (
        <div className="h-64 flex flex-col items-center justify-center text-muted-foreground text-xs">
          <p>{t('noSalesData')}</p>
        </div>
      ) : (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorGross" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
              <XAxis dataKey="shortDate" stroke="#888888" fontSize={11} tickLine={false} />
              <YAxis
                stroke="#888888"
                fontSize={11}
                tickLine={false}
                tickFormatter={(val) => `¥${Number(val).toLocaleString('ja-JP')}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderColor: '#e5e7eb',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(value: any, name: any) => [
                  `¥${Number(value).toLocaleString('ja-JP')}`,
                  name === 'netRevenue' ? t('netRevenue') : t('grossSales'),
                ]}
                labelFormatter={(label, payload) => {
                  const fullDate = payload?.[0]?.payload?.date || label;
                  return `${fullDate} (JST)`;
                }}
              />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                wrapperStyle={{ fontSize: '12px', paddingBottom: '10px' }}
                formatter={(val) => (val === 'netRevenue' ? t('netRevenue') : t('grossSales'))}
              />
              <Area
                type="monotone"
                dataKey="grossSales"
                stroke="#3b82f6"
                fillOpacity={1}
                fill="url(#colorGross)"
                name="grossSales"
              />
              <Area
                type="monotone"
                dataKey="netRevenue"
                stroke="#10b981"
                fillOpacity={1}
                fill="url(#colorNet)"
                name="netRevenue"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
