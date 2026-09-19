import { AppProviders } from '@/components/providers';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { getCatalogProducts, isSupportedLocale } from '@/features/catalog';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!isSupportedLocale(locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const [messages, products] = await Promise.all([
    getMessages(),
    getCatalogProducts(locale),
  ]);

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <AppProviders products={products}>{children}</AppProviders>
    </NextIntlClientProvider>
  );
}
