import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { ProductDetail } from '@/components/product-detail';
import { getProductById, catalogRepository } from '@/features/catalog';
import { routing } from '@/i18n/routing';

export async function generateStaticParams() {
  const products = await catalogRepository.getProducts();
  return routing.locales.flatMap((locale) =>
    products.map((product) => ({
      locale,
      id: product.id,
    }))
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}): Promise<Metadata> {
  const { id, locale } = await params;
  const product = await getProductById(id, locale);
  if (!product) return {};
  return {
    title: `${product.name} — Rupa`,
    description: product.description,
    openGraph: {
      title: `${product.name} — Rupa`,
      description: product.description,
      images: [product.image],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${product.name} — Rupa`,
      description: product.description,
      images: [product.image],
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;
  setRequestLocale(locale);
  const product = await getProductById(id, locale);
  if (!product) notFound();
  return <ProductDetail product={product} />;
}
