import { Suspense } from 'react';
import { setRequestLocale } from 'next-intl/server';
import { SiteHeader } from '@/components/site-header';
import { LoginForm } from '@/components/auth/login-form';
import { routing } from '@/i18n/routing';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
        <Suspense
          fallback={
            <div className="mx-auto h-96 max-w-md animate-pulse rounded-[2rem] bg-muted" />
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
