'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/routing';
import {
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  RefreshCw,
  ShoppingBag,
  Receipt,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatPrice } from '@/lib/marketplace';
import { retryOrderPaymentAction } from '@/features/payments/actions/payment-actions';

interface PaymentReturnViewProps {
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
    paidAt?: string | null;
    failedAt?: string | null;
    expiredAt?: string | null;
  } | null;
  locale: string;
}

export function PaymentReturnView({ order, payment, locale }: PaymentReturnViewProps) {
  const router = useRouter();
  const [retrying, setRetrying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isPaid = payment?.status === 'PAID' || order.status === 'PAID';
  const isFailed = payment?.status === 'FAILED';
  const isExpired = payment?.status === 'EXPIRED';

  const handleRetry = async () => {
    setRetrying(true);
    setErrorMsg(null);
    try {
      const result = await retryOrderPaymentAction(order.id, locale);
      if (result.success && result.paymentUrl) {
        if (result.paymentUrl.startsWith('http')) {
          window.location.href = result.paymentUrl;
        } else {
          const sanitized = result.paymentUrl.replace(/^\/(id|en|ja|tl|vi|th|hi|zh)(\/|$)/, '/');
          const target = sanitized.startsWith('/') ? sanitized : `/${sanitized}`;
          router.push(target);
        }
      } else {
        setErrorMsg((result as any).message || result.error || 'Failed to retry payment');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unexpected error while retrying payment');
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl py-8">
      <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm sm:p-8">
        {/* Header Icon & Title */}
        <div className="text-center">
          {isPaid ? (
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-10" />
            </div>
          ) : isExpired ? (
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Clock className="size-10" />
            </div>
          ) : (
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <XCircle className="size-10" />
            </div>
          )}

          <h1 className="mt-4 font-heading text-2xl font-bold tracking-tight sm:text-3xl">
            {isPaid
              ? 'Pembayaran Berhasil'
              : isExpired
                ? 'Sesi Pembayaran Kedaluwarsa'
                : 'Pembayaran Belum Berhasil'}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {isPaid
              ? 'Terima kasih! Pembayaran pesanan Anda telah diverifikasi oleh gateway pembayaran kami.'
              : isExpired
                ? 'Waktu pembayaran telah habis. Anda dapat membuat sesi baru untuk melanjutkan pesanan ini.'
                : 'Transaksi tidak dapat diselesaikan atau dibatalkan. Silakan coba lagi.'}
          </p>
        </div>

        {errorMsg && (
          <div className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-center text-sm font-medium text-rose-600 dark:text-rose-400">
            {errorMsg}
          </div>
        )}

        {/* Payment & Order Summary Card */}
        <div className="mt-8 divide-y divide-border/60 rounded-xl border border-border/60 bg-muted/30">
          <div className="flex items-center justify-between px-4 py-3 sm:px-6">
            <span className="text-sm text-muted-foreground">ID Pesanan</span>
            <span className="font-mono text-sm font-semibold">{order.id}</span>
          </div>

          <div className="flex items-center justify-between px-4 py-3 sm:px-6">
            <span className="text-sm text-muted-foreground">Total Pembayaran</span>
            <span className="font-heading text-base font-bold text-foreground">
              {formatPrice(order.total)}
            </span>
          </div>

          <div className="flex items-center justify-between px-4 py-3 sm:px-6">
            <span className="text-sm text-muted-foreground">Gateway / Penyedia</span>
            <span className="inline-flex items-center gap-1.5 text-sm font-medium capitalize">
              <Badge variant="outline" className="text-xs uppercase tracking-wider">
                {payment?.provider || 'Unknown'}
              </Badge>
            </span>
          </div>

          {payment?.providerPaymentId && (
            <div className="flex items-center justify-between px-4 py-3 sm:px-6">
              <span className="text-sm text-muted-foreground">Ref. Transaksi Gateway</span>
              <span className="font-mono text-xs text-muted-foreground">
                {payment.providerPaymentId}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between px-4 py-3 sm:px-6">
            <span className="text-sm text-muted-foreground">Status Pembayaran</span>
            <Badge
              variant={isPaid ? 'default' : 'destructive'}
              className={
                isPaid
                  ? 'bg-emerald-600 text-white hover:bg-emerald-600'
                  : isExpired
                    ? 'bg-amber-600 text-white hover:bg-amber-600'
                    : ''
              }
            >
              {payment?.status || order.status}
            </Badge>
          </div>

          {payment?.paidAt && (
            <div className="flex items-center justify-between px-4 py-3 sm:px-6">
              <span className="text-sm text-muted-foreground">Waktu Selesai</span>
              <span className="text-xs text-muted-foreground">
                {new Date(payment.paidAt).toLocaleString(locale === 'ja' ? 'ja-JP' : 'id-ID')}
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          {isPaid ? (
            <>
              <Button
                render={<Link href={`/transactions/${order.id}`} />}
                className="w-full sm:flex-1 rounded-full bg-emerald-600 text-white hover:bg-emerald-700"
              >
                <Receipt className="mr-2 size-4" />
                Lihat Timeline Pesanan
              </Button>
              <Button
                render={<Link href="/" />}
                variant="outline"
                className="w-full sm:flex-1 rounded-full"
              >
                <ShoppingBag className="mr-2 size-4" />
                Lanjut Belanja
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={handleRetry}
                disabled={retrying}
                className="w-full sm:flex-1 rounded-full"
              >
                {retrying ? (
                  <RefreshCw className="mr-2 size-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 size-4" />
                )}
                Coba Bayar Lagi
              </Button>
              <Button
                render={<Link href="/transactions" />}
                variant="outline"
                className="w-full sm:flex-1 rounded-full"
              >
                Kembali ke Pesanan Saya
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
