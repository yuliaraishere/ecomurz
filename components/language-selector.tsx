'use client';

import { Suspense } from 'react';
import { Globe } from 'lucide-react';
import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/routing';
import { useSearchParams } from 'next/navigation';
import {
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from '@/features/catalog/domain/locale';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';

export const LOCALE_LABELS: Record<
  SupportedLocale,
  { native: string; english: string }
> = {
  id: { native: 'Bahasa Indonesia', english: 'Indonesian' },
  en: { native: 'English', english: 'English' },
  ja: { native: '日本語', english: 'Japanese' },
  tl: { native: 'Tagalog', english: 'Tagalog' },
  vi: { native: 'Tiếng Việt', english: 'Vietnamese' },
  th: { native: 'ไทย', english: 'Thai' },
  hi: { native: 'हिन्दी', english: 'Hindi' },
  zh: { native: '中文', english: 'Chinese' },
};

function LanguageSelectorContent() {
  const currentLocale = useLocale() as SupportedLocale;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleLocaleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextLocale = event.target.value as SupportedLocale;
    const query = searchParams.toString();
    const targetUrl = query ? `${pathname}?${query}` : pathname;
    router.replace(targetUrl, { locale: nextLocale });
  };

  return (
    <div className="flex items-center gap-1.5" aria-label="Language selector">
      <Globe className="size-4 text-muted-foreground shrink-0" aria-hidden="true" />
      <NativeSelect
        value={currentLocale}
        onChange={handleLocaleChange}
        size="sm"
        aria-label="Pilih bahasa / Select language"
        className="rounded-full bg-card shadow-none text-xs"
      >
        {SUPPORTED_LOCALES.map((locale) => (
          <NativeSelectOption key={locale} value={locale}>
            {LOCALE_LABELS[locale]?.native ?? locale}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </div>
  );
}

export function LanguageSelector() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center gap-1.5" aria-label="Language selector">
          <Globe className="size-4 text-muted-foreground shrink-0" aria-hidden="true" />
          <div className="h-8 w-24 rounded-full bg-muted/60 animate-pulse" />
        </div>
      }
    >
      <LanguageSelectorContent />
    </Suspense>
  );
}
