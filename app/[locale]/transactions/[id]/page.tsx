'use client';

import Image from 'next/image';
import { Link } from '@/i18n/routing';
import { Check, ChevronLeft, Copy, MapPin, PackageCheck, ReceiptText, Truck } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { SiteHeader } from '@/components/site-header';
import { useOrders, getOrderAction, type Transaction } from '@/features/orders';
import { getProductByIdSync } from '@/features/catalog';
import { rupiah } from '@/lib/marketplace';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { OrderLifecycleTimeline } from '@/components/orders/order-lifecycle-timeline';
import { OrderStatusHistory } from '@/components/orders/order-status-history';
import { OrderCustomerActions } from '@/components/orders/order-customer-actions';
import { CustomerShipmentTracker } from '@/components/shipping/customer-shipment-tracker';

export default function TransactionDetailPage() {
  const t = useTranslations('Transactions');
  const locale = useLocale();
  const params = useParams<{ id: string }>();
  const { getTransactionById, hydrated, addTransaction } = useOrders();
  const [copied, setCopied] = useState(false);
  const [serverTransaction, setServerTransaction] = useState<Transaction | null>(null);
  const [loadingServer, setLoadingServer] = useState(false);

  const localTransaction = getTransactionById(params.id);
  const transaction = localTransaction ?? serverTransaction;

  useEffect(() => {
    if (hydrated && !localTransaction && params.id) {
      setLoadingServer(true);
      void getOrderAction(params.id)
        .then((order) => {
          if (order) {
            setServerTransaction(order);
            addTransaction(order);
          }
        })
        .finally(() => setLoadingServer(false));
    }
  }, [hydrated, localTransaction, params.id, addTransaction]);

  const dateLabel = (value: string) =>
    new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeStyle: 'short' }).format(new Date(value));

  if (!hydrated || (loadingServer && !transaction)) {
    return (
      <main className="min-h-screen bg-background">
        <SiteHeader />
        <div className="mx-auto mt-12 h-80 max-w-4xl animate-pulse rounded-[2rem] bg-muted" />
      </main>
    );
  }

  if (!transaction) {
    return (
      <main className="min-h-screen bg-background">
        <SiteHeader />
        <div className="mx-auto max-w-xl px-5 py-20 text-center">
          <ReceiptText className="mx-auto size-12 text-muted-foreground" />
          <h1 className="mt-5 font-heading text-3xl font-semibold">{t('notFoundTitle')}</h1>
          <p className="mt-2 text-muted-foreground">{t('notFoundSubtitle')}</p>
          <Button render={<Link href="/transactions" />} className="mt-6 rounded-full">
            {t('viewHistory')}
          </Button>
        </div>
      </main>
    );
  }

  const lines = transaction.items.map((item) => {
    if (item.productName && item.productPrice !== undefined && item.productImage) {
      return {
        ...item,
        product: {
          id: item.productId,
          name: item.productName,
          price: item.productPrice,
          image: item.productImage,
        },
      };
    }
    const product = getProductByIdSync(item.productId, locale);
    return {
      ...item,
      product: {
        id: item.productId,
        name: product?.name ?? item.productId,
        price: product?.price ?? 0,
        image: product?.image ?? 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=1200&q=85',
      },
    };
  });

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-10">
        <Button render={<Link href="/transactions" />} variant="ghost" className="mb-6 rounded-full">
          <ChevronLeft /> {t('backToHistory')}
        </Button>
        <section className="overflow-hidden rounded-[2rem] bg-card ring-1 ring-foreground/8">
          <div className="bg-[#19352f] px-6 py-8 text-[#f7f4e9] sm:px-9">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
              <div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-[#f3c969] text-[#19352f]">{transaction.status}</Badge>
                  <span className="text-sm text-[#b8c8bd]">{dateLabel(transaction.createdAt)}</span>
                </div>
                <h1 className="mt-4 font-heading text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                  {t('orderSuccessTitle')}
                </h1>
                <p className="mt-2 text-[#c6d2c9]">{t('orderSuccessSubtitle')}</p>
              </div>
              <span className="grid size-16 place-items-center rounded-full bg-white/10">
                <PackageCheck className="size-8" />
              </span>
            </div>
          </div>

          <div className="px-6 pt-6 sm:px-9 sm:pt-8">
            <OrderLifecycleTimeline
              status={transaction.status}
              shippedAt={transaction.shippedAt}
              deliveredAt={transaction.deliveredAt}
              completedAt={transaction.completedAt}
              cancelledAt={transaction.cancelledAt}
              trackingNumber={transaction.trackingNumber}
            />
          </div>

          <div className="grid gap-8 p-6 sm:p-9 lg:grid-cols-[1fr_300px]">
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[.16em] text-muted-foreground">
                    {t('orderIdLabel')}
                  </p>
                  <p className="mt-1 font-mono text-lg font-semibold">{transaction.id}</p>
                </div>
                <Button
                  onClick={() => {
                    void navigator.clipboard?.writeText(transaction.id);
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 1500);
                  }}
                  variant="outline"
                  size="icon"
                  className="rounded-full"
                  aria-label={t('copyOrderId')}
                >
                  {copied ? <Check /> : <Copy />}
                </Button>
              </div>

              <div className="my-7 h-px bg-border" />
              <h2 className="font-heading text-xl font-semibold">{t('productDetailTitle')}</h2>
              <div className="mt-4 space-y-4">
                {lines.map((line) => (
                  <div key={line.productId} className="flex gap-4">
                    <div className="relative size-20 shrink-0 overflow-hidden rounded-2xl bg-muted">
                      <Image
                        src={line.product.image}
                        alt={line.product.name}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{line.product.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {line.quantity} × {rupiah(line.product.price)}
                      </p>
                    </div>
                    <p className="text-sm font-semibold">{rupiah(line.product.price * line.quantity)}</p>
                  </div>
                ))}
              </div>

              <div className="my-7 h-px bg-border" />
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="flex gap-3">
                  <MapPin className="mt-0.5 size-5 shrink-0 text-primary" />
                  <div>
                    <h3 className="font-semibold">{t('deliveryAddress')}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {transaction.address.name}
                      <br />
                      {transaction.address.phone}
                      <br />
                      {transaction.address.address}
                      <br />
                      {transaction.address.city} {transaction.address.postalCode}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Truck className="mt-0.5 size-5 shrink-0 text-primary" />
                  <div>
                    <h3 className="font-semibold">{t('shippingDetails')}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {transaction.shipping.name}
                      <br />
                      {t('eta', { eta: transaction.shipping.eta })}
                    </p>
                    {transaction.trackingNumber && (
                      <div className="mt-3 rounded-lg bg-muted/70 p-2.5 text-xs">
                        <p className="text-muted-foreground">Nomor Resi / Tracking:</p>
                        <p className="font-mono font-semibold text-primary mt-0.5">
                          {transaction.trackingNumber}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Customer Courier & Shipment Tracking */}
              {(transaction.shipment || transaction.trackingNumber) && (
                <div className="my-6">
                  <CustomerShipmentTracker
                    shipment={transaction.shipment || null}
                    orderStatus={transaction.status}
                    trackingNumber={transaction.trackingNumber}
                  />
                </div>
              )}

              {/* Order Status History Audit Trail */}
              <OrderStatusHistory history={transaction.statusHistory} />
            </div>

            <aside className="h-fit rounded-[1.5rem] bg-muted/60 p-5">
              <h2 className="font-heading text-lg font-semibold">{t('paymentDetails')}</h2>
              <div className="mt-5 space-y-3 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>{t('subtotal')}</span>
                  <span>{rupiah(transaction.subtotal)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>{t('shippingCost')}</span>
                  <span>{rupiah(transaction.shipping.price)}</span>
                </div>
                <div className="h-px bg-border" />
                <div className="flex justify-between font-semibold">
                  <span>{t('total')}</span>
                  <span>{rupiah(transaction.total)}</span>
                </div>
              </div>
              <div className="mt-5 space-y-3 rounded-xl bg-card p-4">
                <div>
                  <p className="text-xs text-muted-foreground">{t('paymentMethod')}</p>
                  <p className="mt-1 font-semibold">{transaction.payment}</p>
                </div>
                {transaction.paymentStatus && (
                  <div className="border-t pt-2">
                    <p className="text-xs text-muted-foreground">Status Pembayaran</p>
                    <div className="mt-1">
                      <Badge variant={transaction.paymentStatus === 'PAID' ? 'default' : 'secondary'}>
                        {transaction.paymentStatus}
                      </Badge>
                    </div>
                  </div>
                )}
                {transaction.providerPaymentId && (
                  <div className="border-t pt-2">
                    <p className="text-xs text-muted-foreground">Referensi Pembayaran</p>
                    <p className="mt-1 font-mono text-xs font-medium text-primary">
                      {transaction.providerPaymentId}
                    </p>
                  </div>
                )}
              </div>

              {/* Customer Actions (Pay Now, Cancel, Confirm Delivery, Returns) */}
              <OrderCustomerActions
                orderPublicId={transaction.id}
                status={transaction.status}
                order={transaction}
                onStatusUpdated={(newStatus) => {
                  if (serverTransaction) {
                    setServerTransaction({ ...serverTransaction, status: newStatus });
                  }
                }}
              />
            </aside>
          </div>
        </section>

        <div className="mt-6 flex justify-center">
          <Button render={<Link href="/" />} variant="outline" className="rounded-full">
            {t('shopAgain')}
          </Button>
        </div>
      </div>
    </main>
  );
}
