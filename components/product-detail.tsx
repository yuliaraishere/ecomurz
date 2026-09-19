'use client';

import Image from 'next/image';
import { Link } from '@/i18n/routing';
import { Check, ChevronLeft, Minus, Plus, ShieldCheck, ShoppingBag, Truck } from 'lucide-react';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { LocalizedProduct } from '@/features/catalog';
import { rupiah } from '@/lib/marketplace';
import { SiteHeader } from '@/components/site-header';
import { useCart } from '@/features/cart';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export function ProductDetail({ product }: { product: LocalizedProduct }) {
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const { addToCart } = useCart();
  const t = useTranslations('Product');
  const tCat = useTranslations('Categories');
  const categoryLabel = tCat.has(product.category.toLowerCase())
    ? tCat(product.category.toLowerCase())
    : product.category;

  const add = () => {
    addToCart(product.id, quantity);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
  };

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-5 py-7 sm:px-8 sm:py-12">
        <Button render={<Link href="/" />} variant="ghost" className="mb-6 rounded-full">
          <ChevronLeft /> {t('backToCatalog')}
        </Button>
        <div className="grid gap-8 lg:grid-cols-[1.1fr_.9fr] lg:gap-16">
          <div className="relative aspect-square overflow-hidden rounded-[2rem] bg-muted">
            <Image
              src={product.image}
              alt={product.name}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 55vw"
              className="object-cover"
            />
          </div>
          <section className="flex flex-col justify-center">
            <Badge variant="secondary" className="mb-4">{categoryLabel}</Badge>
            <h1 className="font-heading text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
              {product.name}
            </h1>
            <div className="mt-4 flex items-center gap-3">
              <span className="text-[#9b6a00]">★ {product.rating}</span>
              <span className="text-sm text-muted-foreground">{t('reviews', { count: product.reviews })}</span>
              <span className="size-1 rounded-full bg-border" />
              <span className="text-sm text-muted-foreground">{t('stock', { count: product.stock })}</span>
            </div>
            <p className="mt-6 font-heading text-3xl font-semibold">{rupiah(product.price)}</p>
            <p className="mt-6 text-base leading-7 text-muted-foreground">{product.description}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <div className="flex h-12 items-center justify-between rounded-full border bg-card p-1 sm:w-36">
                <Button
                  onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                  variant="ghost"
                  size="icon"
                  className="rounded-full"
                  aria-label={t('decreaseQuantity')}
                >
                  <Minus />
                </Button>
                <span className="font-semibold">{quantity}</span>
                <Button
                  onClick={() => setQuantity((value) => Math.min(product.stock, value + 1))}
                  variant="ghost"
                  size="icon"
                  className="rounded-full"
                  aria-label={t('increaseQuantity')}
                >
                  <Plus />
                </Button>
              </div>
              <Button onClick={add} className="h-12 flex-1 rounded-full text-base">
                {added ? <><Check /> {t('added')}</> : <><ShoppingBag /> {t('addToCart')}</>}
              </Button>
            </div>
            <div className="mt-8 grid gap-3 rounded-[1.5rem] bg-card p-5 ring-1 ring-foreground/8 sm:grid-cols-2">
              <div className="flex gap-3">
                <Truck className="size-5 text-primary" />
                <div>
                  <p className="text-sm font-semibold">{t('fastShippingTitle')}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{t('fastShippingSubtitle')}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <ShieldCheck className="size-5 text-primary" />
                <div>
                  <p className="text-sm font-semibold">{t('safeShoppingTitle')}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{t('safeShoppingSubtitle')}</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
