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
import { customerRequestReturnAction } from '@/features/returns/actions/return-actions';
import type { OrderItemSnapshot } from '@/features/orders/types';
import { AlertCircle, CheckSquare, Loader2, Square } from 'lucide-react';

interface ReturnRequestModalProps {
  orderPublicId: string;
  items: OrderItemSnapshot[];
  existingReturns?: any[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const RETURN_REASONS = [
  'DAMAGED',
  'WRONG_ITEM',
  'DEFECTIVE',
  'NOT_AS_DESCRIBED',
  'OTHER',
] as const;

export function ReturnRequestModal({
  orderPublicId,
  items,
  existingReturns = [],
  isOpen,
  onClose,
  onSuccess,
}: ReturnRequestModalProps) {
  const t = useTranslations('Return');
  const [overallReasonKey, setOverallReasonKey] = useState<string>('DAMAGED');
  const [customReason, setCustomReason] = useState('');
  const [customerNote, setCustomerNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Compute remaining returnable quantity per item
  const alreadyReturnedMap: Record<string, number> = {};
  for (const ret of existingReturns) {
    if (ret.status !== 'RETURN_REJECTED' && ret.status !== 'RETURN_CANCELLED') {
      for (const it of ret.items || []) {
        alreadyReturnedMap[it.orderItemId] = (alreadyReturnedMap[it.orderItemId] || 0) + it.quantity;
      }
    }
  }

  // Selected items state: map of orderItemId -> { selected: boolean, quantity: number }
  const [selectedItems, setSelectedItems] = useState<Record<string, { selected: boolean; quantity: number }>>(() => {
    const initial: Record<string, { selected: boolean; quantity: number }> = {};
    for (const item of items) {
      if (item.orderItemId) {
        const remaining = Math.max(0, item.quantity - (alreadyReturnedMap[item.orderItemId] || 0));
        initial[item.orderItemId] = {
          selected: remaining > 0,
          quantity: remaining > 0 ? 1 : 0,
        };
      }
    }
    return initial;
  });

  const toggleItem = (orderItemId: string) => {
    setSelectedItems((prev) => {
      const current = prev[orderItemId];
      if (!current) return prev;
      return {
        ...prev,
        [orderItemId]: {
          ...current,
          selected: !current.selected,
        },
      };
    });
  };

  const updateQuantity = (orderItemId: string, qty: number, maxQty: number) => {
    const validQty = Math.max(1, Math.min(maxQty, qty));
    setSelectedItems((prev) => {
      const current = prev[orderItemId];
      if (!current) return prev;
      return {
        ...prev,
        [orderItemId]: {
          ...current,
          quantity: validQty,
        },
      };
    });
  };

  const handleSubmit = async () => {
    setLoading(true);
    setErrorMsg(null);

    const chosenItems = items
      .filter((item) => item.orderItemId && selectedItems[item.orderItemId]?.selected)
      .map((item) => ({
        orderItemId: item.orderItemId!,
        quantity: selectedItems[item.orderItemId!].quantity,
      }));

    if (chosenItems.length === 0) {
      setErrorMsg(t('selectAtLeastOneItem'));
      setLoading(false);
      return;
    }

    const finalReason =
      overallReasonKey === 'OTHER' && customReason.trim()
        ? customReason.trim()
        : t(`reasons.${overallReasonKey}`);

    try {
      const res = await customerRequestReturnAction({
        orderPublicId,
        reason: finalReason,
        customerNote: customerNote.trim() || undefined,
        items: chosenItems,
      });

      if (res.success) {
        onClose();
        if (onSuccess) {
          onSuccess();
        } else {
          window.location.reload();
        }
      } else {
        setErrorMsg(res.error || 'Failed to submit return request');
      }
    } catch {
      setErrorMsg('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('requestReturn')}</DialogTitle>
          <DialogDescription>{t('modalDescription')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Select Items */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground">
              {t('chooseItems')}
            </label>
            <div className="space-y-2 border rounded-lg p-2.5 divide-y divide-border/40">
              {items.map((item) => {
                const orderItemId = item.orderItemId || '';
                const alreadyReturned = alreadyReturnedMap[orderItemId] || 0;
                const maxReturnable = Math.max(0, item.quantity - alreadyReturned);
                const isSelected = selectedItems[orderItemId]?.selected ?? false;
                const currentQty = selectedItems[orderItemId]?.quantity ?? 1;

                if (maxReturnable <= 0) {
                  return (
                    <div key={orderItemId || item.productId} className="py-2 text-xs text-muted-foreground flex justify-between items-center opacity-60">
                      <span>{item.productName || item.productId} (x{item.quantity})</span>
                      <span className="text-[11px] bg-muted px-2 py-0.5 rounded">{t('fullyReturned')}</span>
                    </div>
                  );
                }

                return (
                  <div key={orderItemId || item.productId} className="py-2 first:pt-0 last:pb-0 flex items-center justify-between gap-3 text-xs">
                    <button
                      type="button"
                      onClick={() => toggleItem(orderItemId)}
                      className="flex items-center gap-2 text-left flex-1 hover:opacity-80"
                    >
                      {isSelected ? (
                        <CheckSquare className="size-4 text-primary shrink-0" />
                      ) : (
                        <Square className="size-4 text-muted-foreground shrink-0" />
                      )}
                      <div>
                        <p className="font-medium text-foreground">{item.productName || item.productId}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {t('purchased')}: {item.quantity} | {t('availableToReturn')}: {maxReturnable}
                        </p>
                      </div>
                    </button>

                    {isSelected && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <label className="text-[11px] text-muted-foreground">{t('qty')}:</label>
                        <input
                          type="number"
                          min={1}
                          max={maxReturnable}
                          value={currentQty}
                          onChange={(e) => updateQuantity(orderItemId, parseInt(e.target.value) || 1, maxReturnable)}
                          className="w-14 h-8 rounded border border-input bg-background px-2 text-center text-xs"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground">
              {t('returnReason')}
            </label>
            <select
              value={overallReasonKey}
              onChange={(e) => setOverallReasonKey(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {RETURN_REASONS.map((key) => (
                <option key={key} value={key}>
                  {t(`reasons.${key}`)}
                </option>
              ))}
            </select>
          </div>

          {overallReasonKey === 'OTHER' && (
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
            variant="default"
            onClick={handleSubmit}
            disabled={loading || (overallReasonKey === 'OTHER' && !customReason.trim())}
            className="rounded-full text-xs"
          >
            {loading && <Loader2 className="size-3.5 animate-spin mr-1.5" />}
            {t('submitReturn')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
