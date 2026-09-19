import { requireAdmin } from '@/features/auth/services/require-admin';
import { adminPromotionService } from '@/features/promotions';
import { prisma } from '@/lib/prisma';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Tag, Sparkles, CheckCircle2, XCircle, Clock, Percent } from 'lucide-react';
import { rupiah } from '@/lib/marketplace';
import { AdminPromotionControls } from '@/components/admin/admin-promotion-controls';
import { AdminPromotionToggle } from '@/components/admin/admin-promotion-toggle';

export const dynamic = 'force-dynamic';

interface AdminPromotionsPageProps {
  params: Promise<{ locale: string }>;
}

export default async function AdminPromotionsPage({ params }: AdminPromotionsPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Authoritative admin access check
  await requireAdmin();

  const [promotions, categories, products] = await Promise.all([
    adminPromotionService.listPromotions(),
    prisma.category.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.product.findMany({
      select: {
        id: true,
        translations: {
          where: { locale },
          select: { name: true },
        },
      },
      orderBy: { id: 'asc' },
    }),
  ]);

  const productOptions = products.map((p) => ({
    id: p.id,
    name: p.translations[0]?.name || p.id,
  }));

  const now = new Date();
  const activeCount = promotions.filter(
    (p) => p.isActive && now >= p.startsAt && now <= p.expiresAt
  ).length;
  const totalUsages = promotions.reduce((sum, p) => sum + p.usageCount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Tag className="size-6 text-primary" />
          Promotions & Coupons
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage promotional campaigns, discount vouchers, and usage rules across the marketplace.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Total Promotions</span>
            <Tag className="size-4" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-foreground">
            {promotions.length}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Currently Active</span>
            <Sparkles className="size-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {activeCount}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Total Redemptions</span>
            <CheckCircle2 className="size-4 text-primary" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-foreground">
            {totalUsages}
          </div>
        </div>
      </div>

      {/* Controls Bar & Create Modal */}
      <AdminPromotionControls
        promotions={promotions}
        categories={categories}
        products={productOptions}
      />

      {/* Promotions Table */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Code & Name</th>
                <th className="px-4 py-3">Discount</th>
                <th className="px-4 py-3">Scope</th>
                <th className="px-4 py-3">Usages</th>
                <th className="px-4 py-3">Validity</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {promotions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground text-sm">
                    No promotions created yet. Click "Create Promotion" to get started.
                  </td>
                </tr>
              ) : (
                promotions.map((promo) => {
                  const isExpired = now > promo.expiresAt;
                  const isUpcoming = now < promo.startsAt;
                  const isLive = promo.isActive && !isExpired && !isUpcoming;

                  return (
                    <tr key={promo.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-mono font-bold text-foreground text-sm flex items-center gap-1.5">
                          <Tag className="size-3.5 text-primary" />
                          {promo.code}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">{promo.name}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                          {promo.type === 'PERCENTAGE' ? `${promo.value}% OFF` : `-${rupiah(promo.value)}`}
                        </span>
                        {promo.maxDiscountAmount && (
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            Max {rupiah(promo.maxDiscountAmount)}
                          </div>
                        )}
                        {promo.minOrderAmount > 0 && (
                          <div className="text-[11px] text-muted-foreground">
                            Min {rupiah(promo.minOrderAmount)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <span className="font-medium text-foreground">{promo.scope}</span>
                        {promo.scope === 'CATEGORY' && promo.targetCategoryId && (
                          <div className="text-[11px] text-muted-foreground truncate max-w-[120px]">
                            {categories.find((c) => c.id === promo.targetCategoryId)?.name || promo.targetCategoryId}
                          </div>
                        )}
                        {promo.scope === 'PRODUCT' && promo.targetProductId && (
                          <div className="text-[11px] text-muted-foreground truncate max-w-[120px]">
                            {productOptions.find((p) => p.id === promo.targetProductId)?.name || promo.targetProductId}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono">
                        <span className="font-semibold text-foreground">{promo.usageCount}</span>
                        <span className="text-muted-foreground">
                          {' / '}
                          {promo.usageLimit !== null ? promo.usageLimit : '∞'}
                        </span>
                        {promo.perUserLimit && (
                          <div className="text-[11px] text-muted-foreground">
                            ({promo.perUserLimit}/user)
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        <div>{promo.startsAt.toLocaleDateString(locale)}</div>
                        <div>→ {promo.expiresAt.toLocaleDateString(locale)}</div>
                      </td>
                      <td className="px-4 py-3">
                        {isExpired ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">
                            <XCircle className="size-3" /> Expired
                          </span>
                        ) : isUpcoming ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                            <Clock className="size-3" /> Scheduled
                          </span>
                        ) : promo.isActive ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="size-3" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <AdminPromotionToggle
                          promotionId={promo.id}
                          isActive={promo.isActive}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
