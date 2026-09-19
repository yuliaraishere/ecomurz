'use client';

import { useState } from 'react';
import { Tag, X, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { validateCouponAction } from '@/features/promotions';
import { rupiah } from '@/lib/marketplace';

export interface AppliedCouponInfo {
  code: string;
  name: string;
  type: string;
  value: number;
  discountAmount: number;
}

interface CouponInputProps {
  cartItems: Array<{ productId: string; quantity: number }>;
  appliedCoupon: AppliedCouponInfo | null;
  onApplyCoupon: (coupon: AppliedCouponInfo) => void;
  onRemoveCoupon: () => void;
  disabled?: boolean;
  labels?: {
    placeholder?: string;
    apply?: string;
    applied?: string;
    remove?: string;
    discount?: string;
  };
}

export function CouponInput({
  cartItems,
  appliedCoupon,
  onApplyCoupon,
  onRemoveCoupon,
  disabled = false,
  labels,
}: CouponInputProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!code.trim() || loading || disabled) return;

    setLoading(true);
    setError(null);

    try {
      const result = await validateCouponAction(code.trim(), cartItems);
      if (!result.success) {
        setError(result.errorMessage || 'Invalid coupon code');
        setLoading(false);
        return;
      }

      onApplyCoupon({
        code: result.code!,
        name: result.name!,
        type: result.type!,
        value: result.value!,
        discountAmount: result.discountAmount!,
      });
      setCode('');
    } catch (err: any) {
      setError(err.message || 'Failed to apply coupon');
    } finally {
      setLoading(false);
    }
  };

  if (appliedCoupon) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-foreground">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="size-4 text-emerald-600 dark:text-emerald-400" />
            <span className="font-mono font-bold tracking-wider text-emerald-700 dark:text-emerald-300">
              {appliedCoupon.code}
            </span>
            <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              -{rupiah(appliedCoupon.discountAmount)}
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemoveCoupon}
            disabled={disabled}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
            aria-label={labels?.remove || 'Remove coupon'}
          >
            <X className="size-3.5 mr-1" />
            {labels?.remove || 'Remove'}
          </Button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{appliedCoupon.name}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              if (error) setError(null);
            }}
            placeholder={labels?.placeholder || 'Coupon / Promo Code'}
            disabled={disabled || loading}
            className="pl-9 font-mono uppercase text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleApply();
              }
            }}
          />
        </div>
        <Button
          type="button"
          onClick={() => handleApply()}
          disabled={!code.trim() || loading || disabled}
          variant="secondary"
          className="shrink-0"
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            labels?.apply || 'Apply'
          )}
        </Button>
      </div>
      {error && (
        <p className="text-xs text-rose-500 font-medium">
          {error}
        </p>
      )}
    </div>
  );
}
