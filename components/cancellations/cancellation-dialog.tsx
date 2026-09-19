'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { customerRequestCancellationAction } from '@/features/cancellations/actions/cancellation-actions';
import { AlertCircle, Loader2 } from 'lucide-react';

interface CancellationDialogProps {
  orderPublicId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const CANCEL_REASONS = [
  'CHANGED_MIND',
  'ORDERED_BY_MISTAKE',
  'FOUND_CHEAPER',
  'DELIVERY_TOO_LONG',
  'OTHER',
] as const;

export function CancellationDialog({
  orderPublicId,
  isOpen,
  onClose,
  onSuccess,
}: CancellationDialogProps) {
  const t = useTranslations('Cancellation');
  const [reasonKey, setReasonKey] = useState<string>('CHANGED_MIND');
  const [customReason, setCustomReason] = useState('');
  const [customerNote, setCustomerNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async () => {
    setLoading(true);
    setErrorMsg(null);

    const finalReason =
      reasonKey === 'OTHER' && customReason.trim()
        ? customReason.trim()
        : t(`reasons.${reasonKey}`);

    try {
      const res = await customerRequestCancellationAction({
        orderPublicId,
        reason: finalReason,
        customerNote: customerNote.trim() || undefined,
      });

      if (res.success) {
        onClose();
        if (onSuccess) {
          onSuccess();
        } else {
          window.location.reload();
        }
      } else {
        setErrorMsg(res.error || 'Failed to submit cancellation request');
      }
    } catch {
      setErrorMsg('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('requestCancellation')}</DialogTitle>
          <DialogDescription>{t('dialogDescription')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground">
              {t('selectReason')}
            </label>
            <select
              value={reasonKey}
              onChange={(e) => setReasonKey(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {CANCEL_REASONS.map((key) => (
                <option key={key} value={key}>
                  {t(`reasons.${key}`)}
                </option>
              ))}
            </select>
          </div>

          {reasonKey === 'OTHER' && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                {t('customReasonLabel')}
              </label>
              <input
                type="text"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder={t('customReasonPlaceholder')}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">
              {t('additionalNoteOptional')}
            </label>
            <Textarea
              rows={3}
              value={customerNote}
              onChange={(e) => setCustomerNote(e.target.value)}
              placeholder={t('notePlaceholder')}
              className="text-sm resize-none"
            />
          </div>

          {errorMsg && (
            <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 p-2.5 rounded-lg">
              <AlertCircle className="size-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="rounded-full text-xs"
          >
            {t('cancel')}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleSubmit}
            disabled={loading || (reasonKey === 'OTHER' && !customReason.trim())}
            className="rounded-full text-xs"
          >
            {loading && <Loader2 className="size-3.5 animate-spin mr-1.5" />}
            {t('submitRequest')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
