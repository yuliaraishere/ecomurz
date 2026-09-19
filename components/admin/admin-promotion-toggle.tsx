'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Power, Loader2 } from 'lucide-react';
import { adminUpdatePromotionStatusAction } from '@/features/promotions';
import { useRouter } from '@/i18n/routing';

interface AdminPromotionToggleProps {
  promotionId: string;
  isActive: boolean;
}

export function AdminPromotionToggle({
  promotionId,
  isActive,
}: AdminPromotionToggleProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    try {
      await adminUpdatePromotionStatusAction(promotionId, !isActive);
      router.refresh();
    } catch (err) {
      console.error('Failed to toggle promotion status:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={handleToggle}
      disabled={loading}
      className={`h-8 px-2.5 text-xs ${
        isActive
          ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30'
          : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
      }`}
      title={isActive ? 'Deactivate promotion' : 'Activate promotion'}
    >
      {loading ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <>
          <Power className="size-3.5 mr-1" />
          {isActive ? 'Disable' : 'Enable'}
        </>
      )}
    </Button>
  );
}
