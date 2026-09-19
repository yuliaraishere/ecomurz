import { Suspense } from 'react';
import { HomeCatalog } from '@/components/home-catalog';
import { getCatalogProducts, type LocalizedProduct } from '@/features/catalog';
import { searchCatalogProducts, getSearchConfig, isAlgoliaSearchConfigured } from '@/features/search';
import { setRequestLocale } from 'next-intl/server';

export default async function Home({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ q?: string; category?: string }>;
}) {
  const { locale } = await params;
  const sp = searchParams ? await searchParams : undefined;
  setRequestLocale(locale);

  let products: LocalizedProduct[];
  let activeProvider: 'algolia' | 'mock' = 'mock';

  if (sp?.q?.trim()) {
    const searchRes = await searchCatalogProducts({
      query: sp.q.trim(),
      category: sp.category,
      locale,
    });
    products = searchRes.products;
    activeProvider = searchRes.provider;
  } else {
    products = await getCatalogProducts(locale);
    const config = getSearchConfig();
    activeProvider = config.provider === 'algolia' && isAlgoliaSearchConfigured() ? 'algolia' : 'mock';
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <HomeCatalog initialProducts={products} activeSearchProvider={activeProvider} />
    </Suspense>
  );
}

