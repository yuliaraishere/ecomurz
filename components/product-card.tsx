'use client';

import Image from 'next/image';
import { Link } from '@/i18n/routing';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { LocalizedProduct } from '@/features/catalog';
import { rupiah } from '@/lib/marketplace';
import { Button } from '@/components/ui/button';
import { useCart } from '@/features/cart';

export function ProductCard({ product }: { product: LocalizedProduct }) {
  const { addToCart } = useCart();
  const t = useTranslations('Product');
  const tCat = useTranslations('Categories');
  const categoryLabel = tCat.has(product.category.toLowerCase())
    ? tCat(product.category.toLowerCase())
    : product.category;

  return (
    <article className="group flex flex-col">
      <Link href={`/products/${product.id}`} className="relative aspect-[4/5] overflow-hidden rounded-[1.5rem] bg-muted focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20">
        <Image src={product.image} alt={product.name} fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" className="object-cover transition duration-500 group-hover:scale-[1.035]" />
        <span className="absolute left-3 top-3 rounded-full bg-background/90 px-2.5 py-1 text-[11px] font-semibold backdrop-blur">{categoryLabel}</span>
      </Link>
      <div className="mt-4 flex flex-1 items-start justify-between gap-3">
        <div>
          <Link href={`/products/${product.id}`} className="font-heading font-semibold tracking-tight hover:underline">{product.name}</Link>
          <p className="mt-1 text-sm font-semibold">{rupiah(product.price)}</p>
          <p className="mt-1 text-xs text-muted-foreground">★ {product.rating} · {t('reviews', { count: product.reviews })}</p>
        </div>
        <Button onClick={() => addToCart(product.id)} size="icon" className="mt-0.5 rounded-full" aria-label={`${t('addToCart')} (${product.name})`}><Plus /></Button>
      </div>
    </article>
  );
}
