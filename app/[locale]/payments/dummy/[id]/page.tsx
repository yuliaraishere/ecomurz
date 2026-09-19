import { redirect, notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { SiteHeader } from '@/components/site-header';
import { getCurrentUser } from '@/features/auth/services/current-user';
import { getPaymentOrderDetailsAction } from '@/features/payments';
import { DummyPaymentView } from '@/components/payments/dummy-payment-view';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/routing';
import { ReceiptText } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function DummyPaymentPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/${locale}/login?redirectTo=/${locale}/payments/dummy/${id}`);
  }

  const details = await getPaymentOrderDetailsAction(id);

  if (!details || !details.payment) {
    return (
      <main className="min-h-screen bg-background">
        <SiteHeader />
        <div className="mx-auto max-w-xl px-5 py-20 text-center">
          <ReceiptText className="mx-auto size-12 text-muted-foreground" />
          <h1 className="mt-5 font-heading text-3xl font-semibold">Payment Not Found</h1>
          <p className="mt-2 text-muted-foreground">
            The requested payment session does not exist or belongs to another user.
          </p>
          <Button render={<Link href="/transactions" />} className="mt-6 rounded-full">
            View My Orders
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-12">
        <DummyPaymentView order={details.order} payment={details.payment} />
      </div>
    </main>
  );
}
