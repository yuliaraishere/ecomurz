'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Search, SlidersHorizontal } from 'lucide-react';
import type { LocalizedProduct } from '@/features/catalog';
import {
  filterProducts,
  getCatalogCategories,
  getCatalogProductsSync,
  useCatalogFilters,
} from '@/features/catalog';
import { useTranslations, useLocale } from 'next-intl';
import { searchProductsAction } from '@/features/search';
import { SiteHeader } from '@/components/site-header';
import { ProductCard } from '@/components/product-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface HomeCatalogProps {
  initialProducts?: LocalizedProduct[];
  activeSearchProvider?: 'algolia' | 'mock';
}

export function HomeCatalog({ initialProducts, activeSearchProvider = 'mock' }: HomeCatalogProps = {}) {
  const t = useTranslations('Catalog');
  const tCat = useTranslations('Categories');
  const locale = useLocale();
  const products = useMemo(
    () => initialProducts ?? getCatalogProductsSync(locale),
    [initialProducts, locale]
  );
  const categories = useMemo(() => getCatalogCategories(products), [products]);
  const { query, category, setQuery, setCategory, clearFilters } = useCatalogFilters();
  const [mobileQuery, setMobileQuery] = useState(query);
  const [serverSearchResults, setServerSearchResults] = useState<LocalizedProduct[] | null>(null);
  const [searchProvider, setSearchProvider] = useState<'algolia' | 'mock'>(activeSearchProvider);

  useEffect(() => {
    setMobileQuery(query);
  }, [query]);

  useEffect(() => {
    if (mobileQuery === query) return;
    const timer = setTimeout(() => {
      setQuery(mobileQuery, { replace: true });
    }, 300);
    return () => clearTimeout(timer);
  }, [mobileQuery, query, setQuery]);

  // Execute server-authoritative search across active provider (Algolia / Mock)
  useEffect(() => {
    if (!query || !query.trim()) {
      setServerSearchResults(null);
      return;
    }

    let isMounted = true;
    const trimmed = query.trim();

    searchProductsAction({ query: trimmed, category, locale })
      .then((res) => {
        if (isMounted) {
          setServerSearchResults(res.products);
          setSearchProvider(res.provider);
        }
      })
      .catch((err) => {
        console.warn('[HomeCatalog] Search provider error, using local fallback:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [query, category, locale]);

  const handleMobileSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setQuery(mobileQuery, { replace: false });
  };

  const isCategoryActive = (item: string) => {
    if (item === 'Semua') {
      return !category || category.toLowerCase() === 'semua';
    }
    return category.toLowerCase() === item.toLowerCase();
  };

  const handleCategoryClick = (item: string) => {
    if (item === 'Semua' || isCategoryActive(item)) {
      setCategory('Semua');
    } else {
      setCategory(item);
    }
  };

  const filtered = serverSearchResults ?? filterProducts({ products, params: { query, category } });

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <section className="mx-auto max-w-7xl px-5 pb-16 pt-8 sm:px-8 sm:pt-12">
        <div className="hero-grid overflow-hidden rounded-[2rem] bg-[#19352f] px-6 py-10 text-[#f7f4e9] shadow-[0_24px_80px_-32px_rgba(25,53,47,.45)] sm:px-12 sm:py-14">
          <div className="relative z-10 max-w-2xl">
            <Badge className="mb-5 border border-white/15 bg-white/10 text-[#f7f4e9]">
              {t('badge')}
            </Badge>
            <h1
              className="font-heading text-4xl font-semibold leading-[1.05] tracking-[-0.055em] sm:text-6xl"
              dangerouslySetInnerHTML={{ __html: t.raw('heroTitle') }}
            />
            <p className="mt-5 max-w-lg text-base leading-7 text-[#d7e0d4] sm:text-lg">
              {t('heroSubtitle')}
            </p>
            <Button
              onClick={() => document.getElementById('katalog')?.scrollIntoView({ behavior: 'smooth' })}
              className="mt-7 h-11 rounded-full bg-[#f3c969] px-5 text-[#19352f] hover:bg-[#ffda7f]"
            >
              {t('heroCta')} <ArrowRight />
            </Button>
          </div>
          <div className="hero-orbit" aria-hidden="true"><span /><span /><span /></div>
        </div>
        <div id="katalog" className="scroll-mt-28 pt-12">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">{t('catalogSubtitle')}</p>
              <h2 className="mt-1 font-heading text-3xl font-semibold tracking-[-0.04em]">{t('catalogTitle')}</h2>
            </div>
            <form onSubmit={handleMobileSubmit} className="relative md:hidden">
              <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={mobileQuery}
                onChange={(event) => setMobileQuery(event.target.value)}
                className="h-11 rounded-full bg-card pl-11"
                placeholder={t('searchPlaceholderMobile')}
                aria-label={t('searchAriaMobile')}
              />
            </form>
          </div>
          <div className="mt-6 flex gap-2 overflow-x-auto pb-2" aria-label={t('filterCategoryAria')}>
            {categories.map((item) => {
              const label =
                item === 'Semua'
                  ? t('allCategories')
                  : tCat.has(item.toLowerCase())
                    ? tCat(item.toLowerCase())
                    : item;
              return (
                <Button
                  key={item}
                  onClick={() => handleCategoryClick(item)}
                  variant={isCategoryActive(item) ? 'default' : 'outline'}
                  className="rounded-full px-4"
                >
                  {label}
                </Button>
              );
            })}
          </div>
          {query && (
            <div className="mt-5 flex items-center justify-between gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="size-4" /> {t('searchResults', { query, count: filtered.length })}
              </div>
              {searchProvider === 'algolia' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                  ⚡ Algolia
                </span>
              )}
            </div>
          )}
          {filtered.length > 0 ? (
            <div className="mt-7 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
              {filtered.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-[1.5rem] border border-dashed bg-card px-6 py-16 text-center">
              <Search className="mx-auto size-8 text-muted-foreground" />
              <h3 className="mt-4 font-heading text-xl font-semibold">{t('noProductsFound')}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{t('noProductsSubtitle')}</p>
              <Button onClick={() => clearFilters()} variant="outline" className="mt-5 rounded-full">
                {t('resetSearch')}
              </Button>
            </div>
          )}
        </div>
      </section>
      <footer className="border-t">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>{t('footerCopyright')}</p>
          <p>{t('footerTagline')}</p>
        </div>
      </footer>
    </main>
  );
}
