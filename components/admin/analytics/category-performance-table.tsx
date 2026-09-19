import { getTranslations } from 'next-intl/server';
import type { CategoryAnalytics } from '@/features/analytics/types';

interface CategoryPerformanceTableProps {
  categories: CategoryAnalytics[];
}

export async function CategoryPerformanceTable({ categories }: CategoryPerformanceTableProps) {
  const t = await getTranslations('Analytics.tables');

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="p-5 border-b border-border">
        <h3 className="font-semibold text-foreground text-sm">{t('categoryPerformanceTitle')}</h3>
        <p className="text-xs text-muted-foreground">{t('categoryPerformanceSubtitle')}</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-muted/50 text-muted-foreground uppercase tracking-wider text-[11px] border-b border-border">
            <tr>
              <th className="py-3 px-4 font-medium">{t('category')}</th>
              <th className="py-3 px-4 font-medium text-right">{t('orders')}</th>
              <th className="py-3 px-4 font-medium text-right">{t('unitsSold')}</th>
              <th className="py-3 px-4 font-medium text-right">{t('grossSales')}</th>
              <th className="py-3 px-4 font-medium text-right">{t('discounts')}</th>
              <th className="py-3 px-4 font-medium text-right">{t('netSales')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {categories.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-muted-foreground">
                  {t('noCategoryData')}
                </td>
              </tr>
            ) : (
              categories.map((c) => (
                <tr key={c.categoryId} className="hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-4 font-medium text-foreground">{c.categoryName}</td>
                  <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                    {c.orderCount}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                    {c.unitsSold}
                  </td>
                  <td className="py-3 px-4 text-right font-mono">
                    ¥{c.grossSales.toLocaleString('ja-JP')}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-rose-600">
                    {c.discountAmount > 0 ? `-¥${c.discountAmount.toLocaleString('ja-JP')}` : '¥0'}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-semibold text-foreground">
                    ¥{c.netSales.toLocaleString('ja-JP')}
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
