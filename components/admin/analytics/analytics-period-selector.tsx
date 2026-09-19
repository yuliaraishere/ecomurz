'use client';

import { useTranslations } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/routing';
import { useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, Download, RefreshCw } from 'lucide-react';
import type { AnalyticsPeriod } from '@/features/analytics/types';

interface PeriodSelectorProps {
  currentPeriod: AnalyticsPeriod;
  startDate?: string;
  endDate?: string;
}

export function AnalyticsPeriodSelector({
  currentPeriod,
  startDate = '',
  endDate = '',
}: PeriodSelectorProps) {
  const t = useTranslations('Analytics');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [customStart, setCustomStart] = useState(startDate);
  const [customEnd, setCustomEnd] = useState(endDate);
  const [showCustom, setShowCustom] = useState(currentPeriod === 'CUSTOM');

  const periods: Array<{ key: AnalyticsPeriod; label: string }> = [
    { key: 'TODAY', label: t('periods.today') },
    { key: 'YESTERDAY', label: t('periods.yesterday') },
    { key: 'LAST_7_DAYS', label: t('periods.last7Days') },
    { key: 'LAST_30_DAYS', label: t('periods.last30Days') },
    { key: 'THIS_MONTH', label: t('periods.thisMonth') },
    { key: 'LAST_MONTH', label: t('periods.lastMonth') },
    { key: 'THIS_YEAR', label: t('periods.thisYear') },
    { key: 'CUSTOM', label: t('periods.custom') },
  ];

  const handlePeriodChange = (period: AnalyticsPeriod) => {
    if (period === 'CUSTOM') {
      setShowCustom(true);
      return;
    }

    setShowCustom(false);
    const params = new URLSearchParams(searchParams.toString());
    params.set('period', period);
    params.delete('startDate');
    params.delete('endDate');

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customStart || !customEnd) return;

    const params = new URLSearchParams(searchParams.toString());
    params.set('period', 'CUSTOM');
    params.set('startDate', customStart);
    params.set('endDate', customEnd);

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const exportTypes = [
    { type: 'sales', label: t('exports.sales') },
    { type: 'products', label: t('exports.products') },
    { type: 'orders', label: t('exports.orders') },
    { type: 'refunds', label: t('exports.refunds') },
    { type: 'inventory', label: t('exports.inventory') },
    { type: 'promotions', label: t('exports.promotions') },
  ];

  const getExportUrl = (type: string) => {
    const params = new URLSearchParams(searchParams.toString());
    return `/api/admin/analytics/export/${type}?${params.toString()}`;
  };

  return (
    <div className="flex flex-col gap-4 bg-card border border-border rounded-xl p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Period Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {periods.map((p) => {
            const isSelected = currentPeriod === p.key;
            return (
              <Button
                key={p.key}
                variant={isSelected ? 'default' : 'outline'}
                size="sm"
                onClick={() => handlePeriodChange(p.key)}
                disabled={isPending}
                className="h-8 text-xs font-medium"
              >
                {p.label}
              </Button>
            );
          })}
        </div>

        {/* CSV Export Dropdown / Buttons */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <Download className="size-3.5" />
            {t('exportCsv')}:
          </span>
          <div className="flex flex-wrap gap-1">
            {exportTypes.map((exp) => (
              <a
                key={exp.type}
                href={getExportUrl(exp.type)}
                download
                className="inline-flex items-center justify-center rounded-md border border-border bg-background px-2 py-1 text-xs font-medium hover:bg-muted transition-colors"
              >
                {exp.label}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Custom Date Inputs */}
      {showCustom && (
        <form
          onSubmit={handleCustomSubmit}
          className="flex flex-wrap items-center gap-3 pt-3 border-t border-border"
        >
          <div className="flex items-center gap-2">
            <Calendar className="size-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{t('dateFrom')}:</span>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-2.5 py-1 text-xs border border-border rounded-md bg-background"
              required
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{t('dateTo')}:</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-2.5 py-1 text-xs border border-border rounded-md bg-background"
              required
            />
          </div>

          <Button type="submit" size="sm" disabled={isPending} className="h-7 text-xs">
            {isPending && <RefreshCw className="size-3 animate-spin mr-1" />}
            {t('apply')}
          </Button>
        </form>
      )}
    </div>
  );
}
