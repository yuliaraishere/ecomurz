'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/routing';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  CreditCard,
  Loader2,
  Package,
  RefreshCw,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { rupiah } from '@/lib/marketplace';
import { simulateDummyPaymentAction } from '@/features/payments/actions/payment-actions';

interface DummyPaymentViewProps {
  order: {
    id: string;
    status: string;
    total: number;
    subtotal: number;
    shippingPrice: number;
    recipientName: string;
    recipientCity: string;
    createdAt: string;
    itemCount: number;
  };
  payment: {
    id: string;
    provider: string;
    providerPaymentId?: string | null;
    status: string;
    amount: number;
    currency: string;
  };
}

export function DummyPaymentView({ order, payment }: DummyPaymentViewProps) {
  const t = useTranslations('Payment');
  const router = useRouter();

  const [orderStatus, setOrderStatus] = useState(order.status);
  const [paymentStatus, setPaymentStatus] = useState(payment.status);
  const [processing, setProcessing] = useState<'SUCCESS' | 'FAILURE' | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSimulate = async (outcome: 'SUCCESS' | 'FAILURE') => {
    setProcessing(outcome);
    setErrorMsg(null);

    try {
      const result = await simulateDummyPaymentAction(order.id, outcome);

      if (result.success) {
        setPaymentStatus('PAID');
        setOrderStatus('PAID');
        window.setTimeout(() => {
          router.push(`/transactions/${order.id}`);
        }, 1200);
      } else {
        setPaymentStatus('FAILED');
        setOrderStatus('orderStatus' in result && result.orderStatus ? result.orderStatus : 'PENDING_PAYMENT');
        if (result.error) {
          setErrorMsg(result.error);
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Simulation error');
    } finally {
      setProcessing(null);
    }
  };

  const isPaid = paymentStatus === 'PAID';
  const isFailed = paymentStatus === 'FAILED';

  return (
    <div className="mx-auto max-w-xl rounded-[2rem] border bg-card p-6 shadow-sm sm:p-8">
      {/* Provider Sandbox Badge */}
      <div className="mb-6 flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-2">
          <div className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
            <CreditCard className="size-5" />
          </div>
          <div>
            <h2 className="font-heading text-lg font-bold">RUPA Dummy Payment Gateway</h2>
            <p className="text-xs text-muted-foreground">Architectural Simulation Environment</p>
          </div>
        </div>
        <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400">
          Sandbox Mode
        </Badge>
      </div>

      {/* State Feedback Banners */}
      {isPaid && (
        <Alert className="mb-6 border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300">
          <CheckCircle2 className="size-4 text-emerald-600" />
          <AlertTitle className="font-semibold">{t('paymentSuccessfulTitle')}</AlertTitle>
          <AlertDescription className="text-xs mt-1">
            {t('paymentSuccessfulDesc')}
          </AlertDescription>
        </Alert>
      )}

      {isFailed && (
        <Alert variant="destructive" className="mb-6">
          <XCircle className="size-4" />
          <AlertTitle className="font-semibold">{t('paymentFailedTitle')}</AlertTitle>
          <AlertDescription className="text-xs mt-1">
            {t('paymentFailedDesc')}
          </AlertDescription>
        </Alert>
      )}

      {errorMsg && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="size-4" />
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}

      {/* Order & Payment Details */}
      <div className="space-y-4 rounded-2xl bg-muted/50 p-5">
        <div className="flex justify-between items-center text-sm border-b pb-3">
          <span className="text-muted-foreground">{t('orderId')}</span>
          <span className="font-mono font-semibold">{order.id}</span>
        </div>

        <div className="flex justify-between items-center text-sm border-b pb-3">
          <span className="text-muted-foreground">{t('paymentRef')}</span>
          <span className="font-mono text-xs font-medium text-primary">
            {payment.providerPaymentId || 'DUMMY-PENDING'}
          </span>
        </div>

        <div className="flex justify-between items-center text-sm border-b pb-3">
          <span className="text-muted-foreground">{t('recipient')}</span>
          <span className="font-medium text-foreground">
            {order.recipientName} ({order.recipientCity})
          </span>
        </div>

        <div className="flex justify-between items-center text-sm border-b pb-3">
          <span className="text-muted-foreground">{t('orderStatus')}</span>
          <Badge variant={isPaid ? 'default' : isFailed ? 'destructive' : 'secondary'}>
            {orderStatus}
          </Badge>
        </div>

        <div className="flex justify-between items-center text-sm border-b pb-3">
          <span className="text-muted-foreground">{t('paymentStatus')}</span>
          <Badge variant={isPaid ? 'default' : isFailed ? 'destructive' : 'secondary'}>
            {paymentStatus}
          </Badge>
        </div>

        <div className="flex justify-between items-baseline pt-1">
          <span className="font-medium text-foreground">{t('amountDue')}</span>
          <span className="font-heading text-2xl font-bold text-foreground">
            {rupiah(payment.amount)}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-8 space-y-3">
        {isPaid ? (
          <Button
            render={<Link href={`/transactions/${order.id}`} />}
            className="h-12 w-full rounded-full gap-2 text-base font-semibold"
          >
            {t('viewOrder')} <ArrowRight className="size-4" />
          </Button>
        ) : (
          <>
            <Button
              onClick={() => handleSimulate('SUCCESS')}
              disabled={processing !== null}
              className="h-12 w-full rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-2 shadow-sm"
            >
              {processing === 'SUCCESS' ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>{t('simulatingSuccess')}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-4" />
                  <span>{t('simulateSuccess')}</span>
                </>
              )}
            </Button>

            <Button
              onClick={() => handleSimulate('FAILURE')}
              disabled={processing !== null}
              variant="outline"
              className="h-12 w-full rounded-full border-destructive/40 text-destructive hover:bg-destructive/10 font-semibold gap-2"
            >
              {processing === 'FAILURE' ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>{t('simulatingFailure')}</span>
                </>
              ) : (
                <>
                  <XCircle className="size-4" />
                  <span>{t('simulateFailure')}</span>
                </>
              )}
            </Button>

            <div className="pt-2 text-center">
              <Button
                render={<Link href="/transactions" />}
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                {t('returnToTransactions')}
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Architectural Notice */}
      <div className="mt-6 flex items-center gap-2 rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
        <ShieldAlert className="size-4 shrink-0 text-amber-500" />
        <span>{t('simulationNotice')}</span>
      </div>
    </div>
  );
}
