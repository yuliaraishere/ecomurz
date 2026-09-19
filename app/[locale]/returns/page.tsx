import { ArrowLeft, PackageOpen, RotateCcw } from 'lucide-react';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { SiteHeader } from '@/components/site-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getCurrentUser } from '@/features/auth/services/current-user';
import { returnRepository } from '@/features/returns/repositories/prisma-return-repository';
import type { ReturnStatus } from '@/features/returns/types';
import { Link } from '@/i18n/routing';

export const dynamic = 'force-dynamic';

interface ReturnsPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
}

const STATUS_STYLES: Record<ReturnStatus, string> = {
  RETURN_REQUESTED: 'border-amber-300 bg-amber-50 text-amber-700',
  RETURN_APPROVED: 'border-blue-300 bg-blue-50 text-blue-700',
  RETURN_IN_TRANSIT: 'border-violet-300 bg-violet-50 text-violet-700',
  RETURN_RECEIVED: 'border-cyan-300 bg-cyan-50 text-cyan-700',
  COMPLETED: 'border-emerald-300 bg-emerald-50 text-emerald-700',
  RETURN_REJECTED: 'border-rose-300 bg-rose-50 text-rose-700',
  RETURN_CANCELLED: 'border-border bg-muted text-muted-foreground',
};

export default async function ReturnsPage({ params, searchParams }: ReturnsPageProps) {
  const { locale } = await params;
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/${locale}/login?redirectTo=/${locale}/returns`);
  }

  const requestedPage = Number.parseInt((await searchParams).page ?? '1', 10);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const [t, result] = await Promise.all([
    getTranslations('Return'),
    returnRepository.getReturnsByUserId(user.id, { page, pageSize: 10 }),
  ]);
  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' });

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-12">
        <Button render={<Link href="/transactions" />} variant="ghost" className="-ml-2 mb-6 rounded-full">
          <ArrowLeft /> {t('page.backToOrders')}
        </Button>

        <div className="flex items-start gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
            <RotateCcw className="size-6" />
          </span>
          <div>
            <h1 className="font-heading text-4xl font-semibold tracking-[-0.05em]">{t('page.title')}</h1>
            <p className="mt-2 text-muted-foreground">{t('page.subtitle')}</p>
          </div>
        </div>

        {result.returns.length === 0 ? (
          <section className="mt-8 rounded-[2rem] border border-dashed bg-card px-6 py-20 text-center">
            <PackageOpen className="mx-auto size-11 text-muted-foreground" />
            <h2 className="mt-5 font-heading text-2xl font-semibold">{t('page.emptyTitle')}</h2>
            <p className="mt-2 text-muted-foreground">{t('page.emptySubtitle')}</p>
          </section>
        ) : (
          <div className="mt-8 space-y-4">
            {result.returns.map((returnRecord) => (
              <article key={returnRecord.id} className="rounded-[1.5rem] bg-card p-6 ring-1 ring-foreground/8">
                <div className="flex flex-col justify-between gap-4 border-b pb-4 sm:flex-row sm:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-semibold">
                        {t('page.returnNumber', { id: returnRecord.id.slice(0, 8).toUpperCase() })}
                      </span>
                      <Badge variant="outline" className={STATUS_STYLES[returnRecord.status]}>
                        {t(`statuses.${returnRecord.status}`)}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {t('page.requestedAt', { date: dateFormatter.format(returnRecord.requestedAt) })}
                    </p>
                  </div>
                  <Button
                    render={<Link href={`/transactions/${returnRecord.order.publicId}`} />}
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                  >
                    {t('page.viewOrder')}
                  </Button>
                </div>

                <div className="mt-4 grid gap-5 text-sm md:grid-cols-2">
                  <div>
                    <p className="font-medium text-muted-foreground">{t('reason')}</p>
                    <p className="mt-1">{returnRecord.reason}</p>
                    {returnRecord.customerNote && (
                      <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{returnRecord.customerNote}</p>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">{t('page.items')}</p>
                    <ul className="mt-1 space-y-1">
                      {returnRecord.items.map((item) => (
                        <li key={item.id} className="flex justify-between gap-4">
                          <span>{item.orderItem.productName}</span>
                          <span className="shrink-0 font-mono">× {item.quantity}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {result.totalPages > 1 && (
          <nav className="mt-6 flex items-center justify-between" aria-label={t('page.paginationLabel')}>
            <p className="text-sm text-muted-foreground">
              {t('page.pageCount', { page: result.page, totalPages: result.totalPages })}
            </p>
            <div className="flex gap-2">
              <Button
                render={result.page > 1 ? <Link href={`/returns?page=${result.page - 1}`} /> : undefined}
                disabled={result.page <= 1}
                variant="outline"
                size="sm"
              >
                {t('page.previous')}
              </Button>
              <Button
                render={result.page < result.totalPages ? <Link href={`/returns?page=${result.page + 1}`} /> : undefined}
                disabled={result.page >= result.totalPages}
                variant="outline"
                size="sm"
              >
                {t('page.next')}
              </Button>
            </div>
          </nav>
        )}
      </div>
    </main>
  );
}
