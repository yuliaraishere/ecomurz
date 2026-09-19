'use client';

import { useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { usePathname, useRouter } from '@/i18n/routing';

export type SetFilterOptions = {
  replace?: boolean;
};

export function useCatalogFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const query = searchParams.get('q') ?? '';
  const category = searchParams.get('category') ?? 'Semua';

  const setQuery = useCallback(
    (newQuery: string, options: SetFilterOptions = {}) => {
      const params = new URLSearchParams(searchParams.toString());
      const trimmed = newQuery.trim();

      if (trimmed) {
        params.set('q', trimmed);
      } else {
        params.delete('q');
      }

      const queryString = params.toString();
      const targetUrl = queryString ? `/?${queryString}` : '/';

      if (options.replace) {
        router.replace(targetUrl, { scroll: false });
      } else {
        router.push(targetUrl, { scroll: false });
      }
    },
    [searchParams, router]
  );

  const setCategory = useCallback(
    (newCategory: string, options: SetFilterOptions = {}) => {
      const params = new URLSearchParams(searchParams.toString());
      const trimmed = newCategory.trim();

      if (trimmed && trimmed.toLowerCase() !== 'semua') {
        params.set('category', trimmed);
      } else {
        params.delete('category');
      }

      const queryString = params.toString();
      const targetUrl = queryString ? `/?${queryString}` : '/';

      if (options.replace) {
        router.replace(targetUrl, { scroll: false });
      } else {
        router.push(targetUrl, { scroll: false });
      }
    },
    [searchParams, router]
  );

  const clearFilters = useCallback(() => {
    router.push('/');
  }, [router]);

  const clearQuery = useCallback(() => {
    setQuery('');
  }, [setQuery]);

  const clearCategory = useCallback(() => {
    setCategory('Semua');
  }, [setCategory]);

  return {
    query,
    category,
    setQuery,
    setCategory,
    clearFilters,
    clearQuery,
    clearCategory,
    isHome: pathname === '/',
  };
}
