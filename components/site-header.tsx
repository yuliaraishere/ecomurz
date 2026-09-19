'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/routing';
import { History, Search, ShoppingBag, Sparkles } from 'lucide-react';
import { Suspense, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCart } from '@/features/cart';
import { useCatalogFilters } from '@/features/catalog';
import { LanguageSelector } from '@/components/language-selector';
import { UserNav } from '@/components/auth/user-nav';

function HeaderSearchForm() {
  const t = useTranslations('Navigation');
  const { query, setQuery } = useCatalogFilters();
  const [localQuery, setLocalQuery] = useState(query);

  useEffect(() => {
    setLocalQuery(query);
  }, [query]);

  useEffect(() => {
    if (localQuery === query) return;
    const timer = setTimeout(() => {
      setQuery(localQuery, { replace: true });
    }, 300);
    return () => clearTimeout(timer);
  }, [localQuery, query, setQuery]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setQuery(localQuery, { replace: false });
  };

  return (
    <form onSubmit={handleSubmit} className="relative mx-auto hidden w-full max-w-xl md:block">
      <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={localQuery}
        onChange={(event) => setLocalQuery(event.target.value)}
        className="h-11 rounded-full border-0 bg-muted pl-11 pr-4 shadow-none focus-visible:ring-primary/20"
        placeholder={t('searchPlaceholder')}
        aria-label={t('searchAria')}
      />
    </form>
  );
}

export function SiteHeader() {
  const t = useTranslations('Navigation');
  const { itemCount } = useCart();
  const pathname = usePathname();
  const count = itemCount;

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center gap-3 px-5 sm:gap-5 sm:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label={t('home')}>
          <span className="grid size-10 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm"><Sparkles className="size-5" /></span>
          <span className="font-heading text-xl font-bold tracking-[-0.04em]">rupa</span>
        </Link>
        <Suspense fallback={<div className="relative mx-auto hidden w-full max-w-xl md:block h-11" />}>
          <HeaderSearchForm />
        </Suspense>
        <nav className="ml-auto flex items-center gap-2" aria-label={t('mainNavAria')}>
          <LanguageSelector />
          <UserNav />
          <Button render={<Link href="/transactions" />} variant={pathname.startsWith('/transactions') ? 'secondary' : 'ghost'} size="icon-lg" className="rounded-full" aria-label={t('transactions')}><History /></Button>
          <Button render={<Link href="/cart" />} variant={pathname === '/cart' ? 'secondary' : 'ghost'} className="relative h-11 gap-2 rounded-full px-3 sm:px-4">
            <ShoppingBag className="size-5" /><span className="hidden sm:inline">{t('cart')}</span>
            {count > 0 && <span className="grid size-5 place-items-center rounded-full bg-primary text-[11px] text-primary-foreground">{count}</span>}
          </Button>
        </nav>
      </div>
    </header>
  );
}
