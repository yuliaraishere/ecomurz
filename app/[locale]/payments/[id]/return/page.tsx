import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { SiteHeader } from '@/components/site-header';
import { getCurrentUser } from '@/features/auth/services/current-user';
import { getPaymentOrderDetailsAction } from '@/features/payments';
import { paymentService } from '@/features/payments/services/payment-service';
import { PaymentReturnView } from '@/components/payments/payment-return-view';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/routing';
import { ReceiptText } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function PaymentReturnPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ session_id?: string; provider?: string }>;
}) {
  const { locale, id } = await params;
  const { session_id, provider } = await searchParams;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/${locale}/login?redirectTo=/${locale}/payments/${id}/return`);
  }

  // Authoritative server-side status reconciliation with gateway
  await paymentService
    .reconcilePayment({
      orderPublicId: id,
      providerPaymentId: session_id,
      providerName: provider,
    })
    .catch((err) => {
      console.error('Error during return payment reconciliation:', err);
    });

  const details = await getPaymentOrderDetailsAction(id);

  if (!details) {
    return (
      <main className="min-h-screen bg-background">
        <SiteHeader />
        <div className="mx-auto max-w-xl px-5 py-20 text-center">
          <ReceiptText className="mx-auto size-12 text-muted-foreground" />
          <h1 className="mt-5 font-heading text-3xl font-semibold">Order Not Found</h1>
          <p className="mt-2 text-muted-foreground">
            The requested order could not be located or belongs to another user.
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
        <PaymentReturnView order={details.order} payment={details.payment} locale={locale} />
      </div>
    </main>
  );
}
