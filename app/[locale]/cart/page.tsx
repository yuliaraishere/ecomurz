'use client';

import Image from 'next/image';
import { Link } from '@/i18n/routing';
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { SiteHeader } from '@/components/site-header';
import { useCart } from '@/features/cart';
import { rupiah } from '@/lib/marketplace';
import { Button } from '@/components/ui/button';

export default function CartPage() {
  const t = useTranslations('Cart');
  const { cart, hydrated, getProduct, updateQuantity, removeFromCart, removeStaleItems } = useCart();
  const lines = cart.flatMap((item) => {
    const product = getProduct(item.productId);
    return product ? [{ ...item, product }] : [];
  });
  const subtotal = lines.reduce((sum, line) => sum + line.product.price * line.quantity, 0);
  const totalItemCount = lines.reduce((sum, line) => sum + line.quantity, 0);

  const hasStaleItems = cart.length > 0 && lines.length < cart.length;

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[.18em] text-primary">{t('tag')}</p>
            <h1 className="mt-1 font-heading text-4xl font-semibold tracking-[-.05em]">{t('title')}</h1>
          </div>
          {hasStaleItems && (
            <Button
              onClick={removeStaleItems}
              variant="outline"
              size="sm"
              className="rounded-full text-xs text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="size-3.5" />
              {t('clearStaleItems')}
            </Button>
          )}
        </div>
        {!hydrated ? (
          <div className="h-60 animate-pulse rounded-[2rem] bg-muted" />
        ) : lines.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed bg-card px-6 py-20 text-center">
            <span className="mx-auto grid size-16 place-items-center rounded-full bg-muted">
              <ShoppingBag className="size-7 text-muted-foreground" />
            </span>
            <h2 className="mt-5 font-heading text-2xl font-semibold">{t('emptyTitle')}</h2>
            <p className="mt-2 text-muted-foreground">{t('emptySubtitle')}</p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button render={<Link href="/" />} className="h-11 rounded-full px-5">
                {t('startShopping')} <ArrowRight />
              </Button>
              {hasStaleItems && (
                <Button
                  onClick={removeStaleItems}
                  variant="outline"
                  className="h-11 rounded-full px-5"
                >
                  <Trash2 className="size-4" />
                  {t('clearStaleItems')}
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
            <section className="space-y-4">
              {lines.map((line) => (
                <article
                  key={line.productId}
                  className="flex gap-4 rounded-[1.5rem] bg-card p-4 ring-1 ring-foreground/8 sm:gap-6 sm:p-5"
                >
                  <Link
                    href={`/products/${line.product.id}`}
                    className="relative size-28 shrink-0 overflow-hidden rounded-2xl bg-muted sm:size-36"
                  >
                    <Image
                      src={line.product.image}
                      alt={line.product.name}
                      fill
                      sizes="144px"
                      className="object-cover"
                    />
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-[.13em] text-muted-foreground">
                          {line.product.category}
                        </p>
                        <Link
                          href={`/products/${line.product.id}`}
                          className="mt-1 block font-heading text-lg font-semibold hover:underline"
                        >
                          {line.product.name}
                        </Link>
                        <p className="mt-1 text-sm font-semibold">{rupiah(line.product.price)}</p>
                      </div>
                      <Button
                        onClick={() => removeFromCart(line.productId)}
                        variant="ghost"
                        size="icon"
                        aria-label={t('removeItem', { name: line.product.name })}
                        className="rounded-full text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 />
                      </Button>
                    </div>
                    <div className="mt-auto flex w-32 items-center justify-between rounded-full border p-1">
                      <Button
                        onClick={() => updateQuantity(line.productId, line.quantity - 1)}
                        variant="ghost"
                        size="icon-sm"
                        className="rounded-full"
                        aria-label={t('decreaseQuantity')}
                      >
                        <Minus />
                      </Button>
                      <span className="text-sm font-semibold">{line.quantity}</span>
                      <Button
                        onClick={() => updateQuantity(line.productId, line.quantity + 1)}
                        variant="ghost"
                        size="icon-sm"
                        className="rounded-full"
                        aria-label={t('increaseQuantity')}
                      >
                        <Plus />
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </section>
            <aside className="h-fit rounded-[1.5rem] bg-[#19352f] p-6 text-[#f7f4e9] lg:sticky lg:top-28">
              <h2 className="font-heading text-xl font-semibold">{t('summaryTitle')}</h2>
              <div className="mt-6 space-y-3 text-sm text-[#d7e0d4]">
                <div className="flex justify-between">
                  <span>{t('subtotal', { count: totalItemCount })}</span>
                  <span>{rupiah(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('shipping')}</span>
                  <span>{t('shippingCalculatedAtCheckout')}</span>
                </div>
              </div>
              <div className="my-5 h-px bg-white/15" />
              <div className="flex items-end justify-between">
                <span className="text-sm">{t('total')}</span>
                <span className="font-heading text-2xl font-semibold">{rupiah(subtotal)}</span>
              </div>
              <Button
                render={<Link href="/checkout" />}
                className="mt-6 h-12 w-full rounded-full bg-[#f3c969] text-[#19352f] hover:bg-[#ffda7f]"
              >
                {t('proceedToCheckout')} <ArrowRight />
              </Button>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
