import { requireAdmin } from '@/features/auth/services/require-admin';
import { adminOrderRepository } from '@/features/orders/repositories/admin-order-repository';
import { AdminFulfillmentControls } from '@/components/admin/admin-fulfillment-controls';
import { AdminShipmentControls } from '@/components/admin/admin-shipment-controls';
import { AdminCancellationRefundControls } from '@/components/admin/admin-cancellation-refund-controls';
import { OrderLifecycleTimeline } from '@/components/orders/order-lifecycle-timeline';
import { OrderStatusHistory } from '@/components/orders/order-status-history';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  User,
  MapPin,
  CreditCard,
  Boxes,
  History,
  Package,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import Image from 'next/image';

export const dynamic = 'force-dynamic';

interface AdminOrderDetailPageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function AdminOrderDetailPage({
  params,
}: AdminOrderDetailPageProps) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  // Authoritative admin access enforcement
  await requireAdmin();

  const t = await getTranslations('Admin.orderDetail');
  const order = await adminOrderRepository.getOrderForAdmin(id);

  if (!order) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <Button
          render={<Link href="/admin/orders" />}
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground hover:text-foreground -ml-2"
        >
          <ArrowLeft className="size-3.5 mr-1.5" />
          {t('backToOrders')}
        </Button>

        <span className="text-xs font-mono text-muted-foreground">
          Internal ID: {order.internalId}
        </span>
      </div>

      {/* Header Banner */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground font-mono">
                {order.id}
              </h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                {order.status}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
              <Calendar className="size-3.5" />
              Placed on {new Date(order.createdAt).toLocaleString()}
            </p>
          </div>

          <div className="text-right sm:text-right">
            <div className="text-xs text-muted-foreground">Total Order Amount</div>
            <div className="text-2xl font-bold font-mono text-foreground">
              ¥{order.total.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Visual Lifecycle Progress Timeline */}
        <div className="mt-6 pt-6 border-t border-border">
          <OrderLifecycleTimeline status={order.status} />
        </div>
      </div>

      {/* Main Grid: Details + Fulfillment Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Customer, Items, Payment, Inventory, History */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer & Delivery Address Card */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <User className="size-4 text-primary" />
              {t('customerSection')}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-muted-foreground block">Customer Name</span>
                <span className="font-medium text-foreground text-sm">{order.address.name}</span>
                <span className="text-muted-foreground font-mono block mt-0.5">{order.address.phone}</span>
                {order.userAccount && (
                  <div className="mt-2 text-[11px] text-muted-foreground">
                    User Account: <span className="font-mono">{order.userAccount.id}</span> ({order.userAccount.role})
                  </div>
                )}
              </div>

              <div>
                <span className="text-muted-foreground block flex items-center gap-1">
                  <MapPin className="size-3" /> Shipping Address
                </span>
                <p className="font-medium text-foreground mt-0.5 whitespace-pre-line">
                  {order.address.address}, {order.address.city} {order.address.postalCode}
                </p>
                <div className="mt-2 text-muted-foreground">
                  Method: <span className="font-medium text-foreground">{order.shipping.name}</span> (ETA: {order.shipping.eta})
                </div>
              </div>
            </div>
          </div>

          {/* Purchased Items (Historical Snapshot) */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Package className="size-4 text-primary" />
              {t('itemsSection')}
            </h2>

            <div className="divide-y divide-border text-xs">
              {order.items.map((item, idx) => (
                <div key={idx} className="py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="relative size-12 rounded-lg bg-muted overflow-hidden shrink-0 border border-border">
                      <Image
                        src={item.productImage || '/products/chicken.jpg'}
                        alt={item.productName || 'Product'}
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    </div>
                    <div>
                      <div className="font-medium text-foreground">{item.productName || item.productId}</div>
                      <div className="text-muted-foreground font-mono text-[11px]">
                        ID: {item.productId}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-mono text-foreground font-medium">
                      ¥{(item.subtotal ?? (item.productPrice ?? 0) * item.quantity).toLocaleString()}
                    </div>
                    <div className="text-muted-foreground text-[11px] font-mono">
                      {item.quantity} × ¥{(item.productPrice ?? 0).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Financial Summary */}
            <div className="pt-3 border-t border-border space-y-1.5 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="font-mono">¥{order.subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Shipping ({order.shipping.name})</span>
                <span className="font-mono">¥{order.shipping.price.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-foreground font-bold text-sm pt-1 border-t border-border">
                <span>Total</span>
                <span className="font-mono">¥{order.total.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Payment Record Card */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <CreditCard className="size-4 text-primary" />
              {t('paymentSection')}
            </h2>

            {order.payments.length === 0 ? (
              <p className="text-xs text-muted-foreground">No payment records found.</p>
            ) : (
              <div className="space-y-3">
                {order.payments.map((p) => (
                  <div
                    key={p.id}
                    className="p-3.5 rounded-lg border border-border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium uppercase text-foreground">{p.provider} Provider</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-primary/10 text-primary">
                          {p.status}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-muted-foreground mt-1">
                        Ref: {p.providerPaymentId || p.id}
                      </div>
                    </div>

                    <div className="sm:text-right">
                      <div className="font-mono font-bold text-foreground">
                        ¥{p.amount.toLocaleString()} {p.currency}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Created: {new Date(p.createdAt).toLocaleString()}
                      </div>
                      {p.paidAt && (
                        <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                          Paid: {new Date(p.paidAt).toLocaleString()}
                        </div>
                      )}
                      {p.failedAt && (
                        <div className="text-[10px] text-rose-600 dark:text-rose-400 font-medium">
                          Failed: {new Date(p.failedAt).toLocaleString()}
                        </div>
                      )}
                      {p.expiredAt && (
                        <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                          Expired: {new Date(p.expiredAt).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Inventory Reservations Card */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Boxes className="size-4 text-primary" />
              {t('inventorySection')}
            </h2>

            {order.reservations.length === 0 ? (
              <p className="text-xs text-muted-foreground">No inventory reservations found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 text-muted-foreground text-[10px] uppercase font-medium border-b border-border">
                    <tr>
                      <th className="px-3 py-2">Product ID</th>
                      <th className="px-3 py-2">Quantity</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Expires At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border font-mono">
                    {order.reservations.map((res) => (
                      <tr key={res.id}>
                        <td className="px-3 py-2 text-foreground">{res.productId}</td>
                        <td className="px-3 py-2 text-foreground font-semibold">{res.quantity}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                              res.status === 'ACTIVE'
                                ? 'bg-amber-500/10 text-amber-700'
                                : res.status === 'CONSUMED'
                                ? 'bg-emerald-500/10 text-emerald-700'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {res.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground text-[11px]">
                          {new Date(res.expiresAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Status History Audit Trail Log */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <History className="size-4 text-primary" />
              {t('historySection')}
            </h2>

            <OrderStatusHistory history={order.statusHistory || []} />
          </div>
        </div>

        {/* Right 1 Col: Operational Fulfillment Actions */}
        <div className="space-y-6">
          <AdminShipmentControls
            orderPublicId={order.id}
            orderStatus={order.status}
            shipment={order.shipment}
          />
          <AdminFulfillmentControls
            orderPublicId={order.id}
            status={order.status}
            currentTrackingNumber={order.trackingNumber}
          />
          <AdminCancellationRefundControls order={order} />
        </div>
      </div>
    </div>
  );
}
