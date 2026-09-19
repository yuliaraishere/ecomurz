'use client';

import { useTranslations } from 'next-intl';
import { CheckCircle2, Circle, XCircle, Package, Truck, Check, Clock } from 'lucide-react';
import type { TransactionStatus } from '@/features/orders/types';

interface OrderLifecycleTimelineProps {
  status: TransactionStatus;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  trackingNumber?: string | null;
}

const STAGES = [
  { key: 'placed', status: 'PENDING_PAYMENT', step: 1 },
  { key: 'paid', status: 'PAID', step: 2 },
  { key: 'processing', status: 'PROCESSING', step: 3 },
  { key: 'packed', status: 'PACKED', step: 4 },
  { key: 'shipped', status: 'SHIPPED', step: 5 },
  { key: 'delivered', status: 'DELIVERED', step: 6 },
  { key: 'completed', status: 'COMPLETED', step: 7 },
] as const;

const STATUS_TO_STEP: Record<string, number> = {
  PENDING_PAYMENT: 1,
  PAID: 2,
  PROCESSING: 3,
  Diproses: 3,
  PACKED: 4,
  SHIPPED: 5,
  DELIVERED: 6,
  COMPLETED: 7,
  CANCELLED: -1,
};

export function OrderLifecycleTimeline({
  status,
  cancelledAt,
}: OrderLifecycleTimelineProps) {
  const t = useTranslations('Fulfillment');
  const currentStep = STATUS_TO_STEP[status] ?? 1;
  const isCancelled = status === 'CANCELLED';

  if (isCancelled) {
    return (
      <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5 text-destructive">
        <div className="flex items-center gap-3">
          <XCircle className="size-6 shrink-0" />
          <div>
            <h3 className="font-semibold text-base">{t('cancelledNotice')}</h3>
            <p className="mt-0.5 text-xs text-destructive/80">
              {cancelledAt
                ? new Intl.DateTimeFormat(undefined, { dateStyle: 'long', timeStyle: 'short' }).format(new Date(cancelledAt))
                : t('statuses.CANCELLED')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-card/60 p-5 sm:p-6">
      <h3 className="text-xs font-semibold uppercase tracking-[.14em] text-muted-foreground mb-6">
        {t('timelineTitle')}
      </h3>

      {/* Responsive timeline: horizontal on desktop, vertical on mobile */}
      <div className="relative">
        {/* Desktop progress bar background */}
        <div className="hidden sm:block absolute top-4 left-6 right-6 h-0.5 bg-muted -z-0" />
        {/* Active progress fill */}
        <div
          className="hidden sm:block absolute top-4 left-6 h-0.5 bg-primary transition-all duration-500 -z-0"
          style={{
            width: `${Math.max(0, Math.min(100, ((currentStep - 1) / (STAGES.length - 1)) * 100))}%`,
          }}
        />

        <div className="grid grid-cols-1 sm:grid-cols-7 gap-4 sm:gap-2">
          {STAGES.map((stage) => {
            const isCompleted = currentStep >= stage.step;
            const isCurrent = currentStep === stage.step;

            return (
              <div
                key={stage.key}
                className="flex sm:flex-col items-center sm:text-center gap-3 sm:gap-2"
              >
                <div
                  className={`size-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold transition-colors ${
                    isCompleted
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-muted text-muted-foreground'
                  } ${isCurrent ? 'ring-4 ring-primary/20 scale-105' : ''}`}
                >
                  {isCompleted ? <Check className="size-4" /> : stage.step}
                </div>

                <div className="min-w-0 flex-1 sm:flex-initial">
                  <p
                    className={`text-xs font-medium leading-tight ${
                      isCurrent
                        ? 'text-foreground font-semibold'
                        : isCompleted
                        ? 'text-foreground/80'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {t(`timeline.${stage.key}`)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
