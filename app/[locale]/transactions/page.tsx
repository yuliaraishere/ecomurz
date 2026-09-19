'use client';

import Image from 'next/image';
import { Link } from '@/i18n/routing';
import { ArrowRight, Clock3, History, ShoppingBag } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { SiteHeader } from '@/components/site-header';
import { useOrders } from '@/features/orders';
import { getProductByIdSync } from '@/features/catalog';
import { rupiah } from '@/lib/marketplace';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function TransactionsPage() {
  const t = useTranslations('Transactions');
  const tFulfillment = useTranslations('Fulfillment');
  const locale = useLocale();
  const { transactions, hydrated } = useOrders();

  const dateLabel = (value: string) =>
    new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeStyle: 'short' }).format(new Date(value));

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'PAID':
      case 'COMPLETED':
      case 'DELIVERED':
        return 'default';
      case 'CANCELLED':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[.18em] text-primary">{t('tag')}</p>
          <h1 className="mt-1 font-heading text-4xl font-semibold tracking-[-.05em]">{t('title')}</h1>
          <p className="mt-3 text-muted-foreground">{t('subtitle')}</p>
        </div>

        {!hydrated ? (
          <div className="mt-8 h-52 animate-pulse rounded-[2rem] bg-muted" />
        ) : transactions.length === 0 ? (
          <div className="mt-8 rounded-[2rem] border border-dashed bg-card px-6 py-20 text-center">
            <History className="mx-auto size-11 text-muted-foreground" />
            <h2 className="mt-5 font-heading text-2xl font-semibold">{t('emptyTitle')}</h2>
            <p className="mt-2 text-muted-foreground">{t('emptySubtitle')}</p>
            <Button render={<Link href="/" />} className="mt-6 rounded-full">
              {t('startShopping')} <ShoppingBag />
            </Button>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {transactions.map((transaction) => {
              const firstItem = transaction.items[0];
              const firstProductImage =
                firstItem?.productImage ??
                getProductByIdSync(firstItem?.productId, locale)?.image;
              const itemCount = transaction.items.reduce((sum, item) => sum + item.quantity, 0);
              return (
                <article
                  key={transaction.id}
                  className="group flex flex-col gap-5 rounded-[1.5rem] bg-card p-5 ring-1 ring-foreground/8 transition hover:ring-primary/30 sm:flex-row sm:items-center"
                >
                  <div className="relative size-20 shrink-0 overflow-hidden rounded-2xl bg-muted">
                    {firstProductImage && (
                      <Image src={firstProductImage} alt="" fill sizes="80px" className="object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-mono text-sm font-semibold">{transaction.id}</p>
                      <Badge variant={getStatusVariant(transaction.status)}>
                        {tFulfillment(`statuses.${transaction.status}` as any) || transaction.status}
                      </Badge>
                      {transaction.source === 'legacy' && (
                        <Badge variant="outline" className="text-[11px] text-muted-foreground border-dashed">
                          Lokal
                        </Badge>
                      )}
                      {transaction.trackingNumber && (
                        <Badge variant="outline" className="text-[11px] font-mono border-primary/30 text-primary">
                          Resi: {transaction.trackingNumber}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Clock3 className="size-3.5" />
                      {dateLabel(transaction.createdAt)}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t('itemsCount', { count: itemCount })} · {transaction.shipping.name} · {transaction.payment}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-4 sm:block sm:text-right">
                    <p className="font-heading text-xl font-semibold">{rupiah(transaction.total)}</p>
                    <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
                      {transaction.status === 'PENDING_PAYMENT' && (
                        <Button
                          render={<Link href={`/payments/dummy/${transaction.id}`} />}
                          size="sm"
                          className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs px-3"
                        >
                          Bayar
                        </Button>
                      )}
                      <Button
                        render={<Link href={`/transactions/${transaction.id}`} />}
                        variant="ghost"
                        size="sm"
                        className="rounded-full"
                      >
                        {t('viewDetail')} <ArrowRight />
                      </Button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
