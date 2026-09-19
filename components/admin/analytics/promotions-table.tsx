import { getTranslations } from 'next-intl/server';
import type { PromotionAnalytics } from '@/features/analytics/types';

interface PromotionsTableProps {
  promotions: PromotionAnalytics[];
}

export async function PromotionsTable({ promotions }: PromotionsTableProps) {
  const t = await getTranslations('Analytics.promotions');

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="p-5 border-b border-border">
        <h3 className="font-semibold text-foreground text-sm">{t('title')}</h3>
        <p className="text-xs text-muted-foreground">{t('subtitle')}</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-muted/50 text-muted-foreground uppercase tracking-wider text-[11px] border-b border-border">
            <tr>
              <th className="py-3 px-4 font-medium">{t('couponCode')}</th>
              <th className="py-3 px-4 font-medium">{t('promotionName')}</th>
              <th className="py-3 px-4 font-medium text-right">{t('timesUsed')}</th>
              <th className="py-3 px-4 font-medium text-right">{t('orders')}</th>
              <th className="py-3 px-4 font-medium text-right">{t('totalDiscount')}</th>
              <th className="py-3 px-4 font-medium text-right">{t('avgDiscount')}</th>
              <th className="py-3 px-4 font-medium text-right">{t('remaining')}</th>
              <th className="py-3 px-4 font-medium text-right">{t('status')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {promotions.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-muted-foreground">
                  {t('noPromotionsData')}
                </td>
              </tr>
            ) : (
              promotions.map((p) => (
                <tr key={p.code} className="hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-foreground">{p.code}</td>
                  <td className="py-3 px-4 font-medium text-muted-foreground">{p.name}</td>
                  <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                    {p.timesUsed}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                    {p.orderCount}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-semibold text-rose-600">
                    -¥{p.totalDiscount.toLocaleString('ja-JP')}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                    ¥{p.averageDiscount.toLocaleString('ja-JP')}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                    {p.remainingUsage != null ? p.remainingUsage : '∞'}
                  </td>
                  <td className="py-3 px-4 text-right font-mono">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${
                        p.isActive
                          ? 'bg-emerald-500/15 text-emerald-700'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {p.isActive ? t('active') : t('inactive')}
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
