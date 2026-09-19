'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import {
  adminCreatePromotionAction,
  adminUpdatePromotionStatusAction,
  type CreatePromotionInput,
  type Promotion,
} from '@/features/promotions';
import { Plus, Check, Loader2, Power } from 'lucide-react';
import { useRouter } from '@/i18n/routing';

interface AdminPromotionControlsProps {
  promotions: Promotion[];
  categories: Array<{ id: string; name: string }>;
  products: Array<{ id: string; name: string }>;
}

export function AdminPromotionControls({
  promotions,
  categories,
  products,
}: AdminPromotionControlsProps) {
  const router = useRouter();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Form states
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'PERCENTAGE' | 'FIXED_AMOUNT'>('PERCENTAGE');
  const [value, setValue] = useState(10);
  const [scope, setScope] = useState<'ORDER' | 'CATEGORY' | 'PRODUCT'>('ORDER');
  const [targetCategoryId, setTargetCategoryId] = useState('');
  const [targetProductId, setTargetProductId] = useState('');
  const [minOrderAmount, setMinOrderAmount] = useState(0);
  const [maxDiscountAmount, setMaxDiscountAmount] = useState<string>('');
  const [usageLimit, setUsageLimit] = useState<string>('');
  const [perUserLimit, setPerUserLimit] = useState<string>('1');

  // Default dates: starts now, expires in 30 days
  const nowStr = new Date().toISOString().slice(0, 16);
  const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16);
  const [startsAt, setStartsAt] = useState(nowStr);
  const [expiresAt, setExpiresAt] = useState(nextMonth);

  const handleToggleStatus = async (promo: Promotion) => {
    setTogglingId(promo.id);
    setActionError(null);
    try {
      await adminUpdatePromotionStatusAction(promo.id, !promo.isActive);
      router.refresh();
    } catch (err: any) {
      setActionError(err.message || 'Failed to update promotion status');
    } finally {
      setTogglingId(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setActionError(null);

    try {
      const input: CreatePromotionInput = {
        code,
        name,
        description: description || null,
        type,
        value: Number(value),
        scope,
        targetCategoryId: scope === 'CATEGORY' ? targetCategoryId : null,
        targetProductId: scope === 'PRODUCT' ? targetProductId : null,
        minOrderAmount: Number(minOrderAmount) || 0,
        maxDiscountAmount: maxDiscountAmount ? Number(maxDiscountAmount) : null,
        usageLimit: usageLimit ? Number(usageLimit) : null,
        perUserLimit: perUserLimit ? Number(perUserLimit) : null,
        startsAt: new Date(startsAt),
        expiresAt: new Date(expiresAt),
        isActive: true,
      };

      await adminCreatePromotionAction(input);
      setShowCreateModal(false);
      resetForm();
      router.refresh();
    } catch (err: any) {
      setActionError(err.message || 'Failed to create promotion');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCode('');
    setName('');
    setDescription('');
    setType('PERCENTAGE');
    setValue(10);
    setScope('ORDER');
    setTargetCategoryId('');
    setTargetProductId('');
    setMinOrderAmount(0);
    setMaxDiscountAmount('');
    setUsageLimit('');
    setPerUserLimit('1');
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        {actionError && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive">
            {actionError}
          </div>
        )}
        <div className="ml-auto">
          <Button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 rounded-lg"
          >
            <Plus className="size-4" />
            Create Promotion
          </Button>
        </div>
      </div>

      {/* Create Promotion Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-xl my-8">
            <h2 className="text-xl font-bold text-foreground">Create New Promotion</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Define discount type, application scope, usage limits, and active date range.
            </p>

            <form onSubmit={handleCreate} className="mt-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold">Coupon Code</Label>
                  <Input
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g. SUMMER2026"
                    className="font-mono uppercase mt-1 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Promotion Name</Label>
                  <Input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Summer Festival 20% Off"
                    className="mt-1 text-sm"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold">Description (Optional)</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Discount description shown to customers"
                  className="mt-1 text-sm h-16"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold">Discount Type</Label>
                  <NativeSelect
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="mt-1"
                  >
                    <NativeSelectOption value="PERCENTAGE">Percentage (%)</NativeSelectOption>
                    <NativeSelectOption value="FIXED_AMOUNT">Fixed Amount (¥ JPY)</NativeSelectOption>
                  </NativeSelect>
                </div>
                <div>
                  <Label className="text-xs font-semibold">
                    {type === 'PERCENTAGE' ? 'Percentage (1-100%)' : 'Fixed Amount (¥ JPY)'}
                  </Label>
                  <Input
                    required
                    type="number"
                    min="1"
                    max={type === 'PERCENTAGE' ? 100 : 1000000}
                    value={value}
                    onChange={(e) => setValue(Number(e.target.value))}
                    className="mt-1 font-mono text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold">Scope</Label>
                  <NativeSelect
                    value={scope}
                    onChange={(e) => setScope(e.target.value as any)}
                    className="mt-1"
                  >
                    <NativeSelectOption value="ORDER">Entire Order</NativeSelectOption>
                    <NativeSelectOption value="CATEGORY">Specific Category</NativeSelectOption>
                    <NativeSelectOption value="PRODUCT">Specific Product</NativeSelectOption>
                  </NativeSelect>
                </div>

                <div>
                  {scope === 'CATEGORY' && (
                    <>
                      <Label className="text-xs font-semibold">Target Category</Label>
                      <NativeSelect
                        required
                        value={targetCategoryId}
                        onChange={(e) => setTargetCategoryId(e.target.value)}
                        className="mt-1"
                      >
                        <NativeSelectOption value="">Select Category</NativeSelectOption>
                        {categories.map((c) => (
                          <NativeSelectOption key={c.id} value={c.id}>
                            {c.name}
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                    </>
                  )}
                  {scope === 'PRODUCT' && (
                    <>
                      <Label className="text-xs font-semibold">Target Product</Label>
                      <NativeSelect
                        required
                        value={targetProductId}
                        onChange={(e) => setTargetProductId(e.target.value)}
                        className="mt-1"
                      >
                        <NativeSelectOption value="">Select Product</NativeSelectOption>
                        {products.map((p) => (
                          <NativeSelectOption key={p.id} value={p.id}>
                            {p.name}
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                    </>
                  )}
                  {scope === 'ORDER' && (
                    <div className="text-xs text-muted-foreground pt-6">
                      Applies to all qualifying merchandise items.
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs font-semibold">Min Order (¥)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={minOrderAmount}
                    onChange={(e) => setMinOrderAmount(Number(e.target.value))}
                    placeholder="0"
                    className="mt-1 font-mono text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Max Cap (¥)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={maxDiscountAmount}
                    onChange={(e) => setMaxDiscountAmount(e.target.value)}
                    placeholder="No cap"
                    className="mt-1 font-mono text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Total Limit</Label>
                  <Input
                    type="number"
                    min="1"
                    value={usageLimit}
                    onChange={(e) => setUsageLimit(e.target.value)}
                    placeholder="Unlimited"
                    className="mt-1 font-mono text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs font-semibold">Per-User Limit</Label>
                  <Input
                    type="number"
                    min="1"
                    value={perUserLimit}
                    onChange={(e) => setPerUserLimit(e.target.value)}
                    placeholder="1"
                    className="mt-1 font-mono text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Starts At</Label>
                  <Input
                    type="datetime-local"
                    required
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Expires At</Label>
                  <Input
                    type="datetime-local"
                    required
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="mt-1 text-xs"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? <Loader2 className="size-4 animate-spin" /> : 'Create Promotion'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
