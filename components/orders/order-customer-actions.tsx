'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  customerCancelOrderAction,
  customerConfirmDeliveryAction,
} from '@/features/orders/actions/order-fulfillment-actions';
import { retryOrderPaymentAction } from '@/features/payments/actions/payment-actions';
import {
  customerMarkReturnInTransitAction,
  customerCancelReturnAction,
} from '@/features/returns/actions/return-actions';
import { CancellationDialog } from '@/components/cancellations/cancellation-dialog';
import { ReturnRequestModal } from '@/components/returns/return-request-modal';
import type { Transaction, TransactionStatus } from '@/features/orders/types';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  HelpCircle,
  Loader2,
  Package,
  RotateCcw,
  Truck,
  XCircle,
} from 'lucide-react';

interface OrderCustomerActionsProps {
  orderPublicId: string;
  status: TransactionStatus;
  order?: Transaction;
  onStatusUpdated?: (newStatus: TransactionStatus) => void;
}

export function OrderCustomerActions({
  orderPublicId,
  status,
  order,
  onStatusUpdated,
}: OrderCustomerActionsProps) {
  const tFulfillment = useTranslations('Fulfillment');
  const tCancellation = useTranslations('Cancellation');
  const tReturn = useTranslations('Return');
  const locale = useLocale();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handlePayNow = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await retryOrderPaymentAction(orderPublicId, locale);
      if (res.success && res.paymentUrl) {
        if (res.paymentUrl.startsWith('http')) {
          window.location.href = res.paymentUrl;
        } else {
          const sanitized = res.paymentUrl.replace(/^\/(id|en|ja|tl|vi|th|hi|zh)(\/|$)/, '/');
          const target = sanitized.startsWith('/') ? sanitized : `/${sanitized}`;
          router.push(target);
        }
      } else {
        setErrorMsg((res as any).message || res.error || 'Failed to initiate payment');
      }
    } catch {
      setErrorMsg('System error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelDirect = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await customerCancelOrderAction(orderPublicId);
      if (res.success) {
        setShowConfirmCancel(false);
        onStatusUpdated?.('CANCELLED');
        window.location.reload();
      } else {
        setErrorMsg(res.error || 'Failed to cancel order');
      }
    } catch {
      setErrorMsg('System error');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelivery = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await customerConfirmDeliveryAction(orderPublicId);
      if (res.success) {
        onStatusUpdated?.('COMPLETED');
        window.location.reload();
      } else {
        setErrorMsg(res.error || 'Failed to complete order');
      }
    } catch {
      setErrorMsg('System error');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkReturnInTransit = async (returnId: string) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await customerMarkReturnInTransitAction({
        returnId,
        orderPublicId,
      });
      if (res.success) {
        window.location.reload();
      } else {
        setErrorMsg(res.error || 'Failed to update return');
      }
    } catch {
      setErrorMsg('System error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelReturn = async (returnId: string) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await customerCancelReturnAction({
        returnId,
        orderPublicId,
      });
      if (res.success) {
        window.location.reload();
      } else {
        setErrorMsg(res.error || 'Failed to cancel return');
      }
    } catch {
      setErrorMsg('System error');
    } finally {
      setLoading(false);
    }
  };

  const cancellation = order?.cancellation;
  const returns = order?.returns || [];
  const refunds = order?.refunds || [];

  return (
    <div className="space-y-4 mt-4">
      {/* 1. UNPAID STATE (PENDING_PAYMENT) */}
      {status === 'PENDING_PAYMENT' && (
        <div className="space-y-3">
          <Button
            type="button"
            disabled={loading}
            onClick={handlePayNow}
            className="w-full rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm"
          >
            {loading ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
            Bayar Sekarang / Pay Now
          </Button>

          {!showConfirmCancel ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowConfirmCancel(true)}
              className="w-full rounded-full text-destructive hover:bg-destructive/10 border-destructive/30 text-xs"
            >
              <XCircle className="size-3.5 mr-1" />
              {tFulfillment('cancelOrder')}
            </Button>
          ) : (
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs">
              <p className="font-medium text-destructive mb-3">{tFulfillment('confirmCancelPrompt')}</p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  disabled={loading}
                  onClick={handleCancelDirect}
                  className="flex-1 rounded-full text-xs"
                >
                  {loading && <Loader2 className="size-3 animate-spin mr-1" />}
                  {tFulfillment('confirmCancel')}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={loading}
                  onClick={() => setShowConfirmCancel(false)}
                  className="rounded-full text-xs"
                >
                  Batal / Back
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. PAID PRE-SHIPMENT STATES (PAID, PROCESSING, PACKED) */}
      {(status === 'PAID' || status === 'PROCESSING' || status === 'PACKED') && (
        <div className="space-y-3">
          {cancellation ? (
            <div className="rounded-xl border p-3 text-xs space-y-1.5 bg-muted/30">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <Clock className="size-3.5 text-amber-500" />
                  {tCancellation('status')}:
                </span>
                <Badge
                  variant="outline"
                  className={
                    cancellation.status === 'REQUESTED'
                      ? 'bg-amber-50 text-amber-700 border-amber-300'
                      : cancellation.status === 'REJECTED'
                      ? 'bg-rose-50 text-rose-700 border-rose-300'
                      : 'bg-muted text-muted-foreground'
                  }
                >
                  {cancellation.status}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                <span className="font-medium">{tCancellation('reason')}:</span> {cancellation.reason}
              </p>
              {cancellation.status === 'REQUESTED' && (
                <p className="text-[11px] text-amber-600 italic">
                  {tCancellation('pendingReviewNotice')}
                </p>
              )}
              {cancellation.status === 'REJECTED' && cancellation.adminNote && (
                <p className="text-[11px] text-rose-600">
                  <span className="font-medium">{tCancellation('adminNote')}:</span> {cancellation.adminNote}
                </p>
              )}
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCancelDialog(true)}
              className="w-full rounded-full text-destructive hover:bg-destructive/10 border-destructive/30 text-xs"
            >
              <RotateCcw className="size-3.5 mr-1" />
              {tCancellation('requestCancellation')}
            </Button>
          )}
        </div>
      )}

      {/* 3. SHIPPED STATE */}
      {status === 'SHIPPED' && (
        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 text-xs text-blue-900 space-y-1">
          <p className="font-medium flex items-center gap-1.5">
            <Truck className="size-3.5 text-blue-600" />
            {tCancellation('shippedNoticeTitle')}
          </p>
          <p className="text-[11px] text-blue-700">
            {tCancellation('shippedNoticeBody')}
          </p>
        </div>
      )}

      {/* 4. DELIVERED STATE */}
      {status === 'DELIVERED' && (
        <div className="space-y-3">
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs space-y-3">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="size-4 text-primary shrink-0 mt-0.5" />
              <p className="font-medium text-foreground">{tFulfillment('deliveredNotice')}</p>
            </div>
            <Button
              type="button"
              disabled={loading}
              onClick={handleConfirmDelivery}
              className="w-full rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs shadow-sm"
            >
              {loading && <Loader2 className="size-3 animate-spin mr-1" />}
              {tFulfillment('confirmDelivery')}
            </Button>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => setShowReturnModal(true)}
            className="w-full rounded-full border-muted-foreground/30 hover:bg-muted/50 text-xs font-medium"
          >
            <RotateCcw className="size-3.5 mr-1" />
            {tReturn('requestReturn')}
          </Button>
        </div>
      )}

      {/* 5. ACTIVE OR HISTORICAL RETURNS LIST */}
      {returns.length > 0 && (
        <div className="rounded-xl border p-3 text-xs space-y-3 bg-muted/20">
          <h4 className="font-semibold text-foreground flex items-center gap-1.5">
            <RotateCcw className="size-3.5 text-primary" />
            {tReturn('returnsHistory')}
          </h4>
          <div className="space-y-2">
            {returns.map((ret) => (
              <div key={ret.id} className="p-2.5 rounded-lg border bg-background space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] text-muted-foreground">
                    #{ret.id.slice(-6).toUpperCase()}
                  </span>
                  <Badge
                    variant="outline"
                    className={
                      ret.status === 'COMPLETED'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : ret.status === 'RETURN_APPROVED'
                        ? 'bg-blue-50 text-blue-700 border-blue-300'
                        : ret.status === 'RETURN_IN_TRANSIT'
                        ? 'bg-amber-50 text-amber-700 border-amber-300'
                        : ret.status === 'RETURN_REJECTED'
                        ? 'bg-rose-50 text-rose-700 border-rose-300'
                        : 'bg-muted text-muted-foreground'
                    }
                  >
                    {ret.status}
                  </Badge>
                </div>
                <p className="text-muted-foreground">
                  <span className="font-medium">{tReturn('reason')}:</span> {ret.reason}
                </p>

                {/* Items in this return */}
                {ret.items && ret.items.length > 0 && (
                  <div className="text-[11px] text-muted-foreground pl-2 border-l-2 border-primary/20 space-y-0.5">
                    {ret.items.map((it) => (
                      <p key={it.id}>
                        • {order?.items.find((oi) => oi.orderItemId === it.orderItemId)?.productName || it.productId} (x{it.quantity})
                      </p>
                    ))}
                  </div>
                )}

                {/* Actions for return */}
                {ret.status === 'RETURN_APPROVED' && (
                  <div className="pt-1 flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleMarkReturnInTransit(ret.id)}
                      disabled={loading}
                      className="rounded-full text-[11px] h-7 bg-primary"
                    >
                      <Truck className="size-3 mr-1" />
                      {tReturn('markInTransit')}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleCancelReturn(ret.id)}
                      disabled={loading}
                      className="rounded-full text-[11px] h-7 text-muted-foreground"
                    >
                      {tReturn('cancelReturn')}
                    </Button>
                  </div>
                )}

                {ret.status === 'RETURN_REQUESTED' && (
                  <div className="pt-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleCancelReturn(ret.id)}
                      disabled={loading}
                      className="rounded-full text-[11px] h-7 text-muted-foreground"
                    >
                      {tReturn('cancelReturn')}
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. REFUNDS ISSUED LIST */}
      {refunds.length > 0 && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3 text-xs space-y-2">
          <div className="flex items-center gap-1.5 text-emerald-800 font-semibold">
            <CheckCircle2 className="size-4 text-emerald-600" />
            <span>{tCancellation('refundsIssuedTitle')}</span>
          </div>
          <div className="space-y-1.5">
            {refunds.map((rf) => (
              <div key={rf.id} className="flex justify-between items-center bg-white/70 p-2 rounded border border-emerald-100 text-[11px]">
                <div>
                  <p className="font-semibold text-foreground">
                    ¥{rf.amount.toLocaleString()} ({rf.status})
                  </p>
                  <p className="text-muted-foreground">{rf.reason}</p>
                </div>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {new Date(rf.createdAt).toLocaleDateString(locale)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Message */}
      {errorMsg && (
        <p className="text-xs text-destructive text-center mt-2 flex items-center justify-center gap-1">
          <AlertCircle className="size-3" /> {errorMsg}
        </p>
      )}

      {/* Cancellation Dialog */}
      <CancellationDialog
        orderPublicId={orderPublicId}
        isOpen={showCancelDialog}
        onClose={() => setShowCancelDialog(false)}
      />

      {/* Return Request Modal */}
      {order && (
        <ReturnRequestModal
          orderPublicId={orderPublicId}
          items={order.items}
          existingReturns={returns}
          isOpen={showReturnModal}
          onClose={() => setShowReturnModal(false)}
        />
      )}
    </div>
  );
}
