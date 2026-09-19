import { getTranslations } from 'next-intl/server';
import type { ProductAnalytics } from '@/features/analytics/types';

interface TopProductsTableProps {
  products: ProductAnalytics[];
}

export async function TopProductsTable({ products }: TopProductsTableProps) {
  const t = await getTranslations('Analytics.tables');

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="p-5 border-b border-border">
        <h3 className="font-semibold text-foreground text-sm">{t('topProductsTitle')}</h3>
        <p className="text-xs text-muted-foreground">{t('topProductsSubtitle')}</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-muted/50 text-muted-foreground uppercase tracking-wider text-[11px] border-b border-border">
            <tr>
              <th className="py-3 px-4 font-medium">{t('product')}</th>
              <th className="py-3 px-4 font-medium">{t('sku')}</th>
              <th className="py-3 px-4 font-medium">{t('category')}</th>
              <th className="py-3 px-4 font-medium text-right">{t('unitsSold')}</th>
              <th className="py-3 px-4 font-medium text-right">{t('grossSales')}</th>
              <th className="py-3 px-4 font-medium text-right">{t('netSales')}</th>
              <th className="py-3 px-4 font-medium text-right">{t('refundRate')}</th>
              <th className="py-3 px-4 font-medium text-right">{t('stock')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {products.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-muted-foreground">
                  {t('noProductsData')}
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <tr key={p.productId} className="hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-4 font-medium text-foreground max-w-[200px] truncate">
                    {p.productName}
                  </td>
                  <td className="py-3 px-4 font-mono text-muted-foreground">{p.sku}</td>
                  <td className="py-3 px-4 text-muted-foreground">{p.categoryName}</td>
                  <td className="py-3 px-4 text-right font-mono">{p.unitsSold}</td>
                  <td className="py-3 px-4 text-right font-mono">
                    ¥{p.grossSales.toLocaleString('ja-JP')}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-semibold text-foreground">
                    ¥{p.netSales.toLocaleString('ja-JP')}
                  </td>
                  <td className="py-3 px-4 text-right font-mono">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[11px] ${
                        p.refundRate > 10
                          ? 'bg-rose-500/10 text-rose-600 font-medium'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {p.refundRate}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-medium ${
                        p.currentStock === 0
                          ? 'bg-rose-500/15 text-rose-700'
                          : p.currentStock <= 5
                          ? 'bg-amber-500/15 text-amber-700'
                          : 'bg-emerald-500/15 text-emerald-700'
                      }`}
                    >
                      {p.currentStock}
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
