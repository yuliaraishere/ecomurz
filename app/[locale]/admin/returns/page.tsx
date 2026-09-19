import { Filter, RotateCcw } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { requireAdmin } from '@/features/auth/services/require-admin';
import { returnRepository } from '@/features/returns/repositories/prisma-return-repository';
import type { ReturnStatus } from '@/features/returns/types';
import { Link } from '@/i18n/routing';

export const dynamic = 'force-dynamic';

interface AdminReturnsPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string; page?: string }>;
}

const RETURN_STATUSES: ReturnStatus[] = [
  'RETURN_REQUESTED',
  'RETURN_APPROVED',
  'RETURN_IN_TRANSIT',
  'RETURN_RECEIVED',
  'COMPLETED',
  'RETURN_REJECTED',
  'RETURN_CANCELLED',
];

function isReturnStatus(value: string): value is ReturnStatus {
  return RETURN_STATUSES.includes(value as ReturnStatus);
}

function filterUrl(status: ReturnStatus | 'ALL', page?: number) {
  const query = new URLSearchParams();
  if (status !== 'ALL') query.set('status', status);
  if (page && page > 1) query.set('page', String(page));
  const suffix = query.toString();
  return suffix ? `/admin/returns?${suffix}` : '/admin/returns';
}

export default async function AdminReturnsPage({ params, searchParams }: AdminReturnsPageProps) {
  const { locale } = await params;
  await requireAdmin();

  const query = await searchParams;
  const status = query.status && isReturnStatus(query.status) ? query.status : 'ALL';
  const requestedPage = Number.parseInt(query.page ?? '1', 10);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const [t, result] = await Promise.all([
    getTranslations('Admin.returns'),
    returnRepository.getAllReturns({ status, page, pageSize: 20 }),
  ]);
  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' });

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
          <RotateCcw className="size-5" />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <Filter className="size-3" /> {t('filterStatus')}
          </span>
          {(['ALL', ...RETURN_STATUSES] as const).map((value) => (
            <Link
              key={value}
              href={filterUrl(value)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                status === value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {value === 'ALL' ? t('all') : t(`statuses.${value}`)}
            </Link>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        {result.returns.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">{t('empty')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-xs">
              <thead className="border-b bg-muted/40 uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">{t('returnNumber')}</th>
                  <th className="px-5 py-3">{t('orderNumber')}</th>
                  <th className="px-5 py-3">{t('customer')}</th>
                  <th className="px-5 py-3">{t('reason')}</th>
                  <th className="px-5 py-3">{t('items')}</th>
                  <th className="px-5 py-3">{t('status')}</th>
                  <th className="px-5 py-3">{t('requestedAt')}</th>
                  <th className="px-5 py-3 text-right">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {result.returns.map((returnRecord) => (
                  <tr key={returnRecord.id} className="align-top transition-colors hover:bg-muted/20">
                    <td className="px-5 py-4 font-mono font-medium">
                      #{returnRecord.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="px-5 py-4 font-mono">{returnRecord.order.publicId}</td>
                    <td className="px-5 py-4">{returnRecord.order.recipientName}</td>
                    <td className="max-w-52 px-5 py-4">
                      <p className="line-clamp-2">{returnRecord.reason}</p>
                    </td>
                    <td className="px-5 py-4">
                      <ul className="space-y-1">
                        {returnRecord.items.map((item) => (
                          <li key={item.id}>
                            {item.orderItem.productName} × {item.quantity}
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant="outline">{t(`statuses.${returnRecord.status}`)}</Badge>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-muted-foreground">
                      {dateFormatter.format(returnRecord.requestedAt)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Button
                        render={<Link href={`/admin/orders/${returnRecord.order.id}`} />}
                        variant="outline"
                        size="sm"
                      >
                        {t('reviewOrder')}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{t('resultCount', { count: result.total })}</span>
        {result.totalPages > 1 && (
          <nav className="flex items-center gap-2" aria-label={t('paginationLabel')}>
            <span>{t('pageCount', { page: result.page, totalPages: result.totalPages })}</span>
            <Button
              render={result.page > 1 ? <Link href={filterUrl(status, result.page - 1)} /> : undefined}
              disabled={result.page <= 1}
              variant="outline"
              size="sm"
            >
              {t('previous')}
            </Button>
            <Button
              render={result.page < result.totalPages ? <Link href={filterUrl(status, result.page + 1)} /> : undefined}
              disabled={result.page >= result.totalPages}
              variant="outline"
              size="sm"
            >
              {t('next')}
            </Button>
          </nav>
        )}
      </div>
    </div>
  );
}
