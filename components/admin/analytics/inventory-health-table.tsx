import { getTranslations } from 'next-intl/server';
import type { InventoryMetrics } from '@/features/analytics/types';
import { AlertTriangle, Boxes, PackageX, CheckCircle2 } from 'lucide-react';

interface InventoryHealthTableProps {
  inventory: InventoryMetrics;
}

export async function InventoryHealthTable({ inventory }: InventoryHealthTableProps) {
  const t = await getTranslations('Analytics.inventory');

  const alertItems = inventory.items.filter((i) => i.status !== 'HEALTHY').slice(0, 10);

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="p-5 border-b border-border flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold text-foreground text-sm">{t('title')}</h3>
          <p className="text-xs text-muted-foreground">{t('subtitle')}</p>
        </div>

        {/* Status KPI Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/60 text-xs text-muted-foreground font-mono">
            <Boxes className="size-3.5 text-primary" />
            <span>{t('available')}: {inventory.availableStock}</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 text-xs text-amber-700 font-mono">
            <AlertTriangle className="size-3.5" />
            <span>{t('lowStock')}: {inventory.lowStockProducts}</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-500/10 text-xs text-rose-700 font-mono">
            <PackageX className="size-3.5" />
            <span>{t('outOfStock')}: {inventory.outOfStockProducts}</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-muted/50 text-muted-foreground uppercase tracking-wider text-[11px] border-b border-border">
            <tr>
              <th className="py-3 px-4 font-medium">{t('product')}</th>
              <th className="py-3 px-4 font-medium">{t('sku')}</th>
              <th className="py-3 px-4 font-medium text-right">{t('availableStock')}</th>
              <th className="py-3 px-4 font-medium text-right">{t('reservedHolds')}</th>
              <th className="py-3 px-4 font-medium text-right">{t('status')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {alertItems.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-1">
                    <CheckCircle2 className="size-5 text-emerald-600" />
                    <span>{t('allHealthy')}</span>
                  </div>
                </td>
              </tr>
            ) : (
              alertItems.map((item) => (
                <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-4 font-medium text-foreground max-w-[200px] truncate">
                    {item.name}
                  </td>
                  <td className="py-3 px-4 font-mono text-muted-foreground">{item.sku}</td>
                  <td className="py-3 px-4 text-right font-mono font-semibold text-foreground">
                    {item.availableQty}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                    {item.reservedQty}
                  </td>
                  <td className="py-3 px-4 text-right font-mono">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                        item.status === 'OUT_OF_STOCK'
                          ? 'bg-rose-500/15 text-rose-700'
                          : 'bg-amber-500/15 text-amber-700'
                      }`}
                    >
                      {item.status === 'OUT_OF_STOCK' ? t('outOfStock') : t('lowStock')}
                    </span>
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
