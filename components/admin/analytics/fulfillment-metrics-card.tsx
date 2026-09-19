import { getTranslations } from 'next-intl/server';
import type { FulfillmentMetrics } from '@/features/analytics/types';
import { Truck, Clock, AlertOctagon, CheckCircle2 } from 'lucide-react';

interface FulfillmentMetricsCardProps {
  fulfillment: FulfillmentMetrics;
}

export async function FulfillmentMetricsCard({ fulfillment }: FulfillmentMetricsCardProps) {
  const t = await getTranslations('Analytics.fulfillment');

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-foreground text-sm">{t('title')}</h3>
          <p className="text-xs text-muted-foreground">{t('subtitle')}</p>
        </div>
      </div>

      {/* KPI stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="rounded-lg border border-border bg-muted/20 p-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Truck className="size-3.5 text-primary" />
            <span>{t('shipped')}</span>
          </div>
          <div className="text-lg font-bold font-mono mt-1 text-foreground">
            {fulfillment.shippedCount}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-muted/20 p-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CheckCircle2 className="size-3.5 text-emerald-600" />
            <span>{t('delivered')}</span>
          </div>
          <div className="text-lg font-bold font-mono mt-1 text-foreground">
            {fulfillment.deliveredCount}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-muted/20 p-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="size-3.5 text-indigo-600" />
            <span>{t('avgTimeToShip')}</span>
          </div>
          <div className="text-lg font-bold font-mono mt-1 text-foreground">
            {fulfillment.avgTimeToShipHours != null ? `${fulfillment.avgTimeToShipHours}h` : '—'}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-muted/20 p-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <AlertOctagon className="size-3.5 text-rose-600" />
            <span>{t('deliveryFailures')}</span>
          </div>
          <div className="text-lg font-bold font-mono mt-1 text-foreground">
            {fulfillment.failureCount}
          </div>
        </div>
      </div>

      {/* Carrier Performance Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-muted/50 text-muted-foreground uppercase tracking-wider text-[11px] border-b border-border">
            <tr>
              <th className="py-2.5 px-3 font-medium">{t('carrier')}</th>
              <th className="py-2.5 px-3 font-medium text-right">{t('shipments')}</th>
              <th className="py-2.5 px-3 font-medium text-right">{t('carrierDelivered')}</th>
              <th className="py-2.5 px-3 font-medium text-right">{t('carrierFailed')}</th>
              <th className="py-2.5 px-3 font-medium text-right">{t('avgDuration')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {fulfillment.carrierPerformance.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-4 text-center text-muted-foreground">
                  {t('noCarrierData')}
                </td>
              </tr>
            ) : (
              fulfillment.carrierPerformance.map((c) => (
                <tr key={c.carrier} className="hover:bg-muted/30 transition-colors">
                  <td className="py-2 px-3 font-medium text-foreground">{c.carrier}</td>
                  <td className="py-2 px-3 text-right font-mono text-muted-foreground">{c.shipments}</td>
                  <td className="py-2 px-3 text-right font-mono text-emerald-600">{c.delivered}</td>
                  <td className="py-2 px-3 text-right font-mono text-rose-600">{c.failed}</td>
                  <td className="py-2 px-3 text-right font-mono text-muted-foreground">
                    {c.avgDeliveryDays != null ? `${c.avgDeliveryDays} days` : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
