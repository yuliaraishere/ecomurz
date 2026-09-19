'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  adminMarkProcessingAction,
  adminMarkPackedAction,
  adminMarkShippedAction,
  adminMarkDeliveredAction,
  adminCompleteOrderAction,
  adminCancelOrderAction,
} from '@/features/orders/actions/admin-order-actions';
import type { TransactionStatus } from '@/features/orders/types';
import {
  Loader2,
  CheckCircle2,
  Truck,
  Box,
  Check,
  XCircle,
  AlertCircle,
  Clock,
} from 'lucide-react';

interface AdminFulfillmentControlsProps {
  orderPublicId: string;
  status: TransactionStatus;
  currentTrackingNumber?: string | null;
}

export function AdminFulfillmentControls({
  orderPublicId,
  status,
  currentTrackingNumber,
}: AdminFulfillmentControlsProps) {
  const t = useTranslations('Admin.orderDetail');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [trackingNumber, setTrackingNumber] = useState(currentTrackingNumber || '');
  const [note, setNote] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const executeAction = async (actionFn: () => Promise<{ success: boolean; error?: string }>) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await actionFn();
      if (res.success) {
        window.location.reload();
      } else {
        setErrorMsg(res.error || 'Failed to execute transition');
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'System error');
    } finally {
      setLoading(false);
    }
  };

  const handleStartProcessing = () => {
    executeAction(() => adminMarkProcessingAction(orderPublicId, note || undefined));
  };

  const handleMarkPacked = () => {
    executeAction(() => adminMarkPackedAction(orderPublicId, note || undefined));
  };

  const handleMarkShipped = () => {
    executeAction(() =>
      adminMarkShippedAction(
        orderPublicId,
        trackingNumber.trim() || undefined,
        note || undefined
      )
    );
  };

  const handleMarkDelivered = () => {
    executeAction(() => adminMarkDeliveredAction(orderPublicId, note || undefined));
  };

  const handleCompleteOrder = () => {
    executeAction(() => adminCompleteOrderAction(orderPublicId, note || undefined));
  };

  const handleCancelOrder = () => {
    executeAction(() =>
      adminCancelOrderAction(orderPublicId, cancelReason.trim() || 'Admin cancelled order')
    );
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
          <Clock className="size-4 text-primary" />
          {t('actionsSection')}
        </h3>
        <span className="text-xs font-mono text-muted-foreground">
          Current: <strong className="text-foreground">{status}</strong>
        </span>
      </div>

      <p className="text-xs text-muted-foreground">{t('processingNotice')}</p>

      {/* Optional Note Field */}
      {status !== 'COMPLETED' && status !== 'CANCELLED' && (
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground">{t('note')}</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('enterNote')}
            disabled={loading}
            className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      )}

      {/* Action Buttons depending on valid status transitions */}
      <div className="pt-2">
        {status === 'PAID' && (
          <Button
            type="button"
            onClick={handleStartProcessing}
            disabled={loading}
            className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs shadow-sm"
          >
            {loading ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : <Box className="size-3.5 mr-1.5" />}
            {t('startProcessing')} (PAID → PROCESSING)
          </Button>
        )}

        {status === 'PROCESSING' && (
          <Button
            type="button"
            onClick={handleMarkPacked}
            disabled={loading}
            className="w-full rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium text-xs shadow-sm"
          >
            {loading ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : <Box className="size-3.5 mr-1.5" />}
            {t('markPacked')} (PROCESSING → PACKED)
          </Button>
        )}

        {status === 'PACKED' && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">{t('trackingNumber')}</label>
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder={t('enterTrackingNumber')}
                disabled={loading}
                className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <Button
              type="button"
              onClick={handleMarkShipped}
              disabled={loading}
              className="w-full rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-medium text-xs shadow-sm"
            >
              {loading ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : <Truck className="size-3.5 mr-1.5" />}
              {t('markShipped')} (PACKED → SHIPPED)
            </Button>
          </div>
        )}

        {status === 'SHIPPED' && (
          <Button
            type="button"
            onClick={handleMarkDelivered}
            disabled={loading}
            className="w-full rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-medium text-xs shadow-sm"
          >
            {loading ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : <CheckCircle2 className="size-3.5 mr-1.5" />}
            {t('markDelivered')} (SHIPPED → DELIVERED)
          </Button>
        )}

        {status === 'DELIVERED' && (
          <Button
            type="button"
            onClick={handleCompleteOrder}
            disabled={loading}
            className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shadow-sm"
          >
            {loading ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : <Check className="size-3.5 mr-1.5" />}
            {t('completeOrder')} (DELIVERED → COMPLETED)
          </Button>
        )}

        {status === 'PENDING_PAYMENT' && (
          <div className="space-y-3">
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-700 dark:text-amber-300">
              Awaiting payment from customer. Cancellation will release any active stock reservations back to available quantity.
            </div>

            {!showCancelModal ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowCancelModal(true)}
                className="w-full rounded-lg border-destructive/30 text-destructive hover:bg-destructive/10 text-xs"
              >
                <XCircle className="size-3.5 mr-1.5" />
                {t('cancelOrder')}
              </Button>
            ) : (
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 space-y-2">
                <label className="text-xs font-medium text-destructive">{t('cancelReason')}</label>
                <input
                  type="text"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Customer requested cancellation"
                  className="w-full rounded border border-input bg-background px-2.5 py-1 text-xs"
                />
                <div className="flex gap-2 pt-1">
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={handleCancelOrder}
                    disabled={loading}
                    className="flex-1 text-xs"
                  >
                    {loading && <Loader2 className="size-3 animate-spin mr-1" />}
                    {t('confirmCancel')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCancelModal(false)}
                    disabled={loading}
                    className="text-xs"
                  >
                    Back
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Informative notice for non-cancellable states */}
        {['PAID', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED'].includes(status) && (
          <p className="text-[11px] text-muted-foreground/80 mt-2 bg-muted/40 rounded-lg p-2.5">
            {t('cancellationRestricted')}
          </p>
        )}

        {status === 'COMPLETED' && (
          <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300">
            <Check className="size-4 shrink-0" />
            <span>This order is fully completed. No further transitions permitted.</span>
          </div>
        )}

        {status === 'CANCELLED' && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 flex items-center gap-2 text-xs text-destructive">
            <XCircle className="size-4 shrink-0" />
            <span>This order was cancelled. Reserved inventory was released.</span>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="rounded-lg bg-destructive/10 p-2.5 text-xs text-destructive flex items-center gap-2">
          <AlertCircle className="size-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
}
