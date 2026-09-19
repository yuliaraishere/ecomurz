import { getTranslations } from 'next-intl/server';
import type { CustomerMetrics } from '@/features/analytics/types';
import { Users, UserCheck, UserPlus, Repeat, Coins } from 'lucide-react';

interface CustomerMetricsCardProps {
  customer: CustomerMetrics;
}

export async function CustomerMetricsCard({ customer }: CustomerMetricsCardProps) {
  const t = await getTranslations('Analytics.customers');

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-foreground text-sm">{t('title')}</h3>
          <p className="text-xs text-muted-foreground">{t('subtitle')}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-lg border border-border bg-muted/20 p-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="size-3.5 text-primary" />
            <span>{t('totalRegistered')}</span>
          </div>
          <div className="text-lg font-bold font-mono mt-1 text-foreground">
            {customer.totalCustomers}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-muted/20 p-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <UserCheck className="size-3.5 text-emerald-600" />
            <span>{t('activeBuyers')}</span>
          </div>
          <div className="text-lg font-bold font-mono mt-1 text-foreground">
            {customer.customersWithOrders}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-muted/20 p-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <UserPlus className="size-3.5 text-blue-600" />
            <span>{t('newBuyers')}</span>
          </div>
          <div className="text-lg font-bold font-mono mt-1 text-foreground">
            {customer.newCustomers}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-muted/20 p-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Repeat className="size-3.5 text-indigo-600" />
            <span>{t('repeatRate')}</span>
          </div>
          <div className="text-lg font-bold font-mono mt-1 text-foreground">
            {customer.repeatPurchaseRate}%
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {customer.repeatCustomers} {t('repeatCustomers')}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-muted/20 p-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="size-3.5 text-purple-600" />
            <span>{t('ordersPerCustomer')}</span>
          </div>
          <div className="text-lg font-bold font-mono mt-1 text-foreground">
            {customer.ordersPerCustomer}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-muted/20 p-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Coins className="size-3.5 text-amber-600" />
            <span>{t('avgCustomerValue')}</span>
          </div>
          <div className="text-lg font-bold font-mono mt-1 text-foreground">
            ¥{customer.averageCustomerOrderValue.toLocaleString('ja-JP')}
          </div>
        </div>
      </div>
    </div>
  );
}
