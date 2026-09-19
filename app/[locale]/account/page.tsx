import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { SiteHeader } from '@/components/site-header';
import { getCurrentUser } from '@/features/auth/services/current-user';
import { AccountView } from '@/components/auth/account-view';
import { routing } from '@/i18n/routing';

export const dynamic = 'force-dynamic';

export default async function AccountPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();

  if (!user) {
    redirect(`/${locale}/login?redirectTo=/${locale}/account`);
  }

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-12">
        <AccountView initialUser={user} />
      </div>
    </main>
  );
}
