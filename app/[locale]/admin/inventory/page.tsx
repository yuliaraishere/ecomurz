import { requireAdmin } from '@/features/auth/services/require-admin';
import { adminInventoryRepository } from '@/features/inventory/repositories/admin-inventory-repository';
import { LOW_STOCK_THRESHOLD } from '@/features/inventory/config';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import {
  Boxes,
  AlertTriangle,
  PackageX,
  Layers,
  CheckCircle2,
  Info,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

interface AdminInventoryPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    filter?: 'all' | 'low_stock' | 'out_of_stock';
  }>;
}

export default async function AdminInventoryPage({
  params,
  searchParams,
}: AdminInventoryPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Authoritative admin access check
  await requireAdmin();

  const sp = await searchParams;
  const t = await getTranslations('Admin.inventory');
  const filter = sp.filter || 'all';

  const inventoryData = await adminInventoryRepository.getInventoryOverview(locale, filter);
  const { summary, items } = inventoryData;

  const tabs = [
    {
      id: 'all',
      label: `${t('allProducts')} (${summary.totalItems})`,
      href: '/admin/inventory',
      active: filter === 'all',
    },
    {
      id: 'low_stock',
      label: `${t('lowStock')} (${summary.lowStockItems})`,
      href: '/admin/inventory?filter=low_stock',
      active: filter === 'low_stock',
    },
    {
      id: 'out_of_stock',
      label: `${t('outOfStock')} (${summary.outOfStockItems})`,
      href: '/admin/inventory?filter=out_of_stock',
      active: filter === 'out_of_stock',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {t('title')}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t('subtitle')}
        </p>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Total Products</span>
            <Boxes className="size-4" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-foreground">
            {summary.totalItems}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Available Units</span>
            <Layers className="size-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-foreground">
            {summary.totalAvailableUnits}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Reserved Units</span>
            <Layers className="size-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-foreground">
            {summary.totalReservedUnits}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Low / Out Stock</span>
            <AlertTriangle className="size-4 text-orange-600" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-foreground">
            {summary.lowStockItems + summary.outOfStockItems}
          </div>
        </div>
      </div>

      {/* Read-only Advisory Notice */}
      <div className="rounded-xl border border-border/80 bg-muted/30 p-3.5 flex items-start gap-2.5 text-xs text-muted-foreground">
        <Info className="size-4 text-primary shrink-0 mt-0.5" />
        <span>{t('readOnlyNotice')}</span>
      </div>

      {/* Filter Tabs & Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        {/* Tabs */}
        <div className="px-5 pt-4 border-b border-border flex gap-2">
          {tabs.map((tab) => (
            <Link
              key={tab.id}
              href={tab.href}
              className={`pb-3 px-3 text-xs font-medium border-b-2 transition-colors ${
                tab.active
                  ? 'border-primary text-primary font-semibold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        {/* Table / List */}
        {items.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            No products found for this inventory filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border font-medium">
                <tr>
                  <th className="px-5 py-3">{t('product')}</th>
                  <th className="px-5 py-3">{t('sku')}</th>
                  <th className="px-5 py-3">{t('catalogStock')}</th>
                  <th className="px-5 py-3">{t('available')}</th>
                  <th className="px-5 py-3">{t('reserved')}</th>
                  <th className="px-5 py-3">{t('activeReservations')}</th>
                  <th className="px-5 py-3 text-right">{t('status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-foreground">{item.productName}</div>
                      {item.categoryName && (
                        <div className="text-[11px] text-muted-foreground">{item.categoryName}</div>
                      )}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-muted-foreground">
                      {item.productId}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-muted-foreground">
                      {item.catalogStock}
                    </td>
                    <td className="px-5 py-3.5 font-mono font-bold text-foreground">
                      {item.availableQty}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-muted-foreground">
                      {item.reservedQty}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-muted-foreground">
                      {item.activeReservationsCount}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {item.isOutOfStock ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20">
                          <PackageX className="size-3" />
                          {t('outOfStockBadge')}
                        </span>
                      ) : item.isLowStock ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                          <AlertTriangle className="size-3" />
                          {t('lowStockBadge')} (≤ {LOW_STOCK_THRESHOLD})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                          <CheckCircle2 className="size-3" />
                          {t('inStock')}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
