import { requireAdmin } from '@/features/auth/services/require-admin';
import { adminOrderRepository } from '@/features/orders/repositories/admin-order-repository';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import {
  CreditCard,
  CheckCircle,
  Box,
  Truck,
  PackageCheck,
  CheckCheck,
  AlertTriangle,
  PackageX,
  ArrowRight,
  Eye,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Enforce server-authoritative admin access
  await requireAdmin();

  const t = await getTranslations('Admin');
  const metrics = await adminOrderRepository.getOperationalMetrics();
  const recentOrders = await adminOrderRepository.listOrders({ page: 1, pageSize: 5 });

  const metricCards = [
    {
      label: t('metrics.pendingPayment'),
      value: metrics.pendingPayment,
      color: 'text-amber-600 bg-amber-500/10 border-amber-500/20',
      icon: CreditCard,
      href: '/admin/orders?status=PENDING_PAYMENT',
    },
    {
      label: t('metrics.paid'),
      value: metrics.paid,
      color: 'text-blue-600 bg-blue-500/10 border-blue-500/20',
      icon: CheckCircle,
      href: '/admin/orders?status=PAID',
    },
    {
      label: t('metrics.processing'),
      value: metrics.processing,
      color: 'text-indigo-600 bg-indigo-500/10 border-indigo-500/20',
      icon: Box,
      href: '/admin/orders?status=PROCESSING',
    },
    {
      label: t('metrics.packed'),
      value: metrics.packed,
      color: 'text-purple-600 bg-purple-500/10 border-purple-500/20',
      icon: Box,
      href: '/admin/orders?status=PACKED',
    },
    {
      label: t('metrics.shipped'),
      value: metrics.shipped,
      color: 'text-cyan-600 bg-cyan-500/10 border-cyan-500/20',
      icon: Truck,
      href: '/admin/orders?status=SHIPPED',
    },
    {
      label: t('metrics.delivered'),
      value: metrics.delivered,
      color: 'text-teal-600 bg-teal-500/10 border-teal-500/20',
      icon: PackageCheck,
      href: '/admin/orders?status=DELIVERED',
    },
    {
      label: t('metrics.completed'),
      value: metrics.completed,
      color: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20',
      icon: CheckCheck,
      href: '/admin/orders?status=COMPLETED',
    },
    {
      label: t('metrics.lowStock'),
      value: metrics.lowStockCount,
      color: 'text-orange-600 bg-orange-500/10 border-orange-500/20',
      icon: AlertTriangle,
      href: '/admin/inventory?filter=low_stock',
    },
    {
      label: t('metrics.outOfStock'),
      value: metrics.outOfStockCount,
      color: 'text-rose-600 bg-rose-500/10 border-rose-500/20',
      icon: PackageX,
      href: '/admin/inventory?filter=out_of_stock',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {t('operationalOverview')}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t('operationalSubtitle')}
        </p>
      </div>

      {/* Operational Summary Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 gap-4">
        {metricCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              href={card.href}
              className="group relative rounded-xl border border-border bg-card p-4 transition-all hover:shadow-md hover:border-primary/40 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                  {card.label}
                </span>
                <div className={`p-2 rounded-lg border ${card.color}`}>
                  <Icon className="size-4" />
                </div>
              </div>

              <div className="mt-4 flex items-baseline justify-between">
                <span className="text-2xl font-bold text-foreground font-mono">
                  {card.value}
                </span>
                <span className="text-xs text-muted-foreground group-hover:text-primary flex items-center transition-colors">
                  View <ArrowRight className="size-3 ml-1" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Recent Orders Section */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Recent Orders</h2>
            <p className="text-xs text-muted-foreground">Latest incoming orders requiring operational fulfillment</p>
          </div>
          <Button render={<Link href="/admin/orders" />} variant="outline" size="sm" className="text-xs">
            View All ({metrics.totalOrders})
          </Button>
        </div>

        {recentOrders.orders.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No orders found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border font-medium">
                <tr>
                  <th className="px-6 py-3">Order Number</th>
                  <th className="px-6 py-3">Customer</th>
                  <th className="px-6 py-3">Total</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Tracking</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentOrders.orders.map((order) => (
                  <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-3.5 font-mono font-medium text-foreground">
                      <Link href={`/admin/orders/${order.id}`} className="hover:text-primary underline">
                        {order.id}
                      </Link>
                    </td>
                    <td className="px-6 py-3.5 text-foreground">
                      <div>{order.address.name}</div>
                      <div className="text-muted-foreground text-[11px] font-mono">{order.address.phone}</div>
                    </td>
                    <td className="px-6 py-3.5 font-mono font-semibold text-foreground">
                      ¥{order.total.toLocaleString()}
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted text-foreground border border-border">
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 font-mono text-muted-foreground">
                      {order.trackingNumber || '—'}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <Button
                        render={<Link href={`/admin/orders/${order.id}`} />}
                        variant="ghost"
                        size="sm"
                        className="text-xs text-primary hover:text-primary/80"
                      >
                        <Eye className="size-3.5 mr-1" />
                        Details
                      </Button>
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
