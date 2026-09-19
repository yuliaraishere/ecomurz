import { requireAdmin } from '@/features/auth/services/require-admin';
import { adminOrderRepository } from '@/features/orders/repositories/admin-order-repository';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import {
  Search,
  Filter,
  Eye,
  ChevronLeft,
  ChevronRight,
  Package,
  Calendar,
  CreditCard,
  Truck,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

interface AdminOrdersPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    q?: string;
    status?: string;
    paymentStatus?: string;
    dateRange?: 'all' | 'today' | 'last7days' | 'last30days';
    page?: string;
  }>;
}

export default async function AdminOrdersPage({
  params,
  searchParams,
}: AdminOrdersPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Authoritative admin verification
  await requireAdmin();

  const sp = await searchParams;
  const t = await getTranslations('Admin.orderList');

  const query = sp.q || '';
  const status = sp.status || 'ALL';
  const paymentStatus = sp.paymentStatus || 'ALL';
  const dateRange = sp.dateRange || 'all';
  const page = parseInt(sp.page || '1', 10) || 1;

  const orderData = await adminOrderRepository.listOrders({
    page,
    pageSize: 15,
    query,
    status,
    paymentStatus,
    dateRange,
  });

  const statuses = [
    { value: 'ALL', label: t('all') },
    { value: 'PENDING_PAYMENT', label: 'Pending Payment' },
    { value: 'PAID', label: 'Paid' },
    { value: 'PROCESSING', label: 'Processing' },
    { value: 'PACKED', label: 'Packed' },
    { value: 'SHIPPED', label: 'Shipped' },
    { value: 'DELIVERED', label: 'Delivered' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'CANCELLED', label: 'Cancelled' },
  ];

  const dateRanges = [
    { value: 'all', label: t('all') },
    { value: 'today', label: t('today') },
    { value: 'last7days', label: t('last7Days') },
    { value: 'last30days', label: t('last30Days') },
  ];

  // Helper to build URL with preserved query parameters
  const getFilterUrl = (overrides: Record<string, string | number>) => {
    const nextParams = new URLSearchParams();
    if (query) nextParams.set('q', query);
    if (status !== 'ALL') nextParams.set('status', status);
    if (paymentStatus !== 'ALL') nextParams.set('paymentStatus', paymentStatus);
    if (dateRange !== 'all') nextParams.set('dateRange', dateRange);
    nextParams.set('page', '1');

    for (const [key, val] of Object.entries(overrides)) {
      if (val === 'ALL' || val === 'all' || val === '') {
        nextParams.delete(key);
      } else {
        nextParams.set(key, String(val));
      }
    }
    return `/admin/orders?${nextParams.toString()}`;
  };

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

      {/* Filter and Search Controls */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-4 shadow-sm">
        {/* Search Input Form */}
        <form method="GET" action="/admin/orders" className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder={t('searchPlaceholder')}
              className="w-full rounded-lg border border-input bg-background pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            {status !== 'ALL' && <input type="hidden" name="status" value={status} />}
            {dateRange !== 'all' && <input type="hidden" name="dateRange" value={dateRange} />}
          </div>
          <Button type="submit" size="sm" className="rounded-lg">
            Search
          </Button>
          {(query || status !== 'ALL' || dateRange !== 'all') && (
            <Button
              render={<Link href="/admin/orders" />}
              variant="outline"
              size="sm"
              className="rounded-lg text-xs"
            >
              Reset
            </Button>
          )}
        </form>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1 mr-1">
            <Filter className="size-3" /> Status:
          </span>
          {statuses.map((st) => (
            <Link
              key={st.value}
              href={getFilterUrl({ status: st.value })}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                status === st.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/70 text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {st.label}
            </Link>
          ))}
        </div>

        {/* Date Filter */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1 mr-1">
            <Calendar className="size-3" /> Date:
          </span>
          {dateRanges.map((dr) => (
            <Link
              key={dr.value}
              href={getFilterUrl({ dateRange: dr.value })}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                dateRange === dr.value
                  ? 'bg-foreground text-background font-semibold'
                  : 'bg-muted/50 text-muted-foreground hover:text-foreground'
              }`}
            >
              {dr.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Orders Table / Cards */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        {orderData.orders.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Package className="mx-auto size-10 text-muted-foreground/50" />
            <p className="text-sm font-medium text-foreground">{t('noOrdersFound')}</p>
            <Button render={<Link href="/admin/orders" />} variant="outline" size="sm">
              Clear Filters
            </Button>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border font-medium">
                  <tr>
                    <th className="px-5 py-3">{t('orderNumber')}</th>
                    <th className="px-5 py-3">{t('date')}</th>
                    <th className="px-5 py-3">{t('customer')}</th>
                    <th className="px-5 py-3">{t('total')}</th>
                    <th className="px-5 py-3">{t('fulfillmentStatus')}</th>
                    <th className="px-5 py-3">{t('shippingMethod')}</th>
                    <th className="px-5 py-3">{t('tracking')}</th>
                    <th className="px-5 py-3 text-right">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {orderData.orders.map((order) => (
                    <tr key={order.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-3.5 font-mono font-medium text-foreground">
                        <Link href={`/admin/orders/${order.id}`} className="hover:text-primary underline">
                          {order.id}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3.5 text-foreground">
                        <div className="font-medium">{order.address.name}</div>
                        <div className="text-[11px] text-muted-foreground font-mono">{order.address.phone}</div>
                      </td>
                      <td className="px-5 py-3.5 font-mono font-semibold text-foreground">
                        ¥{order.total.toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted text-foreground border border-border">
                          {order.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground">
                        {order.shipping.name}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-muted-foreground">
                        {order.trackingNumber || '—'}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Button
                          render={<Link href={`/admin/orders/${order.id}`} />}
                          variant="ghost"
                          size="sm"
                          className="text-xs text-primary hover:text-primary/80"
                        >
                          <Eye className="size-3.5 mr-1" />
                          {t('viewDetails')}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="block md:hidden divide-y divide-border">
              {orderData.orders.map((order) => (
                <div key={order.id} className="p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-semibold text-sm text-foreground">
                      {order.id}
                    </span>
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-muted border border-border">
                      {order.status}
                    </span>
                  </div>

                  <div className="text-xs text-foreground">
                    <span className="font-medium">{order.address.name}</span>
                    <span className="text-muted-foreground font-mono ml-2">({order.address.phone})</span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                    <span>¥{order.total.toLocaleString()}</span>
                    <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                  </div>

                  {order.trackingNumber && (
                    <div className="text-xs font-mono text-muted-foreground">
                      Tracking: {order.trackingNumber}
                    </div>
                  )}

                  <div className="pt-2">
                    <Button
                      render={<Link href={`/admin/orders/${order.id}`} />}
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                    >
                      <Eye className="size-3.5 mr-1" />
                      {t('viewDetails')}
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            <div className="px-6 py-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
              <span className="text-muted-foreground">
                {t('pageInfo', {
                  page: orderData.page,
                  totalPages: orderData.totalPages,
                  total: orderData.total,
                })}
              </span>

              <div className="flex items-center gap-2">
                <Button
                  render={
                    <Link
                      href={getFilterUrl({ page: Math.max(1, orderData.page - 1) })}
                    />
                  }
                  variant="outline"
                  size="sm"
                  disabled={orderData.page <= 1}
                  className="text-xs"
                >
                  <ChevronLeft className="size-3.5 mr-1" />
                  {t('prev')}
                </Button>

                <Button
                  render={
                    <Link
                      href={getFilterUrl({
                        page: Math.min(orderData.totalPages, orderData.page + 1),
                      })}
                    />
                  }
                  variant="outline"
                  size="sm"
                  disabled={orderData.page >= orderData.totalPages}
                  className="text-xs"
                >
                  {t('next')}
                  <ChevronRight className="size-3.5 ml-1" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
