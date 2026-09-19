'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Truck,
  Package,
  CheckCircle2,
  Clock,
  Copy,
  Check,
  AlertTriangle,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { ShipmentStatus } from '@/features/shipping/types';

interface CustomerShipmentTrackerProps {
  shipment: {
    provider: string;
    carrierName?: string | null;
    serviceName?: string | null;
    trackingNumber?: string | null;
    status: ShipmentStatus | string;
    estimatedDelivery?: string | null;
    shippedAt?: string | null;
    deliveredAt?: string | null;
    trackingEvents?: Array<{
      id: string;
      status: string;
      description?: string | null;
      location?: string | null;
      occurredAt: string;
    }>;
  } | null;
  orderStatus: string;
  trackingNumber?: string | null;
}

const STEPS: { key: ShipmentStatus; label: string }[] = [
  { key: 'READY_TO_SHIP', label: 'Prepared' },
  { key: 'SHIPPED', label: 'Shipped' },
  { key: 'IN_TRANSIT', label: 'In Transit' },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
  { key: 'DELIVERED', label: 'Delivered' },
];

export function CustomerShipmentTracker({
  shipment,
  orderStatus,
  trackingNumber: orderTrackingNumber,
}: CustomerShipmentTrackerProps) {
  const t = useTranslations('Shipping');
  const [copied, setCopied] = useState(false);

  const activeTracking = shipment?.trackingNumber || orderTrackingNumber;
  const currentStatus = (shipment?.status || 'PENDING') as ShipmentStatus;

  const handleCopy = () => {
    if (!activeTracking) return;
    navigator.clipboard.writeText(activeTracking);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStepIndex = (status: ShipmentStatus) => {
    switch (status) {
      case 'READY_TO_SHIP':
        return 0;
      case 'SHIPPED':
        return 1;
      case 'IN_TRANSIT':
        return 2;
      case 'OUT_FOR_DELIVERY':
        return 3;
      case 'DELIVERED':
        return 4;
      default:
        return -1;
    }
  };

  const currentIndex = getStepIndex(currentStatus);
  const isException = ['DELIVERY_FAILED', 'RETURNED', 'CANCELLED'].includes(currentStatus);

  return (
    <div className="rounded-xl border border-border/70 bg-card p-5 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-3">
        <div className="flex items-center gap-2">
          <Truck className="size-5 text-primary" />
          <h3 className="font-heading font-semibold text-base">{t('shipmentDetails')}</h3>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={currentStatus === 'DELIVERED' ? 'default' : 'secondary'}
            className={
              currentStatus === 'DELIVERED'
                ? 'bg-emerald-600 text-white hover:bg-emerald-600'
                : isException
                  ? 'bg-rose-600 text-white hover:bg-rose-600'
                  : ''
            }
          >
            {t(`statuses.${currentStatus}`, { defaultValue: currentStatus })}
          </Badge>
        </div>
      </div>

      {/* Courier & Tracking Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div>
          <span className="text-muted-foreground">{t('courier')}:</span>
          <p className="font-medium text-foreground mt-0.5 capitalize">
            {shipment?.carrierName || (shipment?.provider ? `${shipment.provider} Courier` : 'RUPA Courier')}
            {shipment?.serviceName ? ` — ${shipment.serviceName}` : ''}
          </p>
        </div>

        {activeTracking && (
          <div>
            <span className="text-muted-foreground">{t('trackingNumber')}:</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="font-mono font-bold text-foreground text-xs">{activeTracking}</span>
              <Button
                variant="ghost"
                size="sm"
                className="size-6 p-0 text-muted-foreground hover:text-foreground"
                onClick={handleCopy}
              >
                {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
              </Button>
            </div>
          </div>
        )}

        {shipment?.estimatedDelivery && (
          <div>
            <span className="text-muted-foreground">{t('estimatedDelivery')}:</span>
            <p className="text-foreground mt-0.5">
              {new Date(shipment.estimatedDelivery).toLocaleDateString()}
            </p>
          </div>
        )}

        {shipment?.shippedAt && (
          <div>
            <span className="text-muted-foreground">{t('dispatchedAt')}:</span>
            <p className="text-foreground mt-0.5">
              {new Date(shipment.shippedAt).toLocaleString()}
            </p>
          </div>
        )}
      </div>

      {/* Visual Stepper */}
      {!isException && (
        <div className="pt-2">
          <div className="relative flex items-center justify-between">
            {/* Connecting Bar */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 w-full bg-muted -z-0" />
            <div
              className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-primary transition-all duration-300 -z-0"
              style={{
                width:
                  currentIndex <= 0
                    ? '0%'
                    : `${(currentIndex / (STEPS.length - 1)) * 100}%`,
              }}
            />

            {STEPS.map((step, idx) => {
              const isPast = idx < currentIndex;
              const isCurrent = idx === currentIndex;

              return (
                <div key={step.key} className="flex flex-col items-center relative z-10">
                  <div
                    className={`size-7 rounded-full flex items-center justify-center border-2 transition-colors ${
                      isPast
                        ? 'bg-primary border-primary text-primary-foreground'
                        : isCurrent
                          ? 'bg-primary border-primary text-primary-foreground ring-4 ring-primary/20'
                          : 'bg-background border-muted-foreground/30 text-muted-foreground'
                    }`}
                  >
                    {isPast ? (
                      <Check className="size-3.5" />
                    ) : (
                      <span className="text-[10px] font-bold">{idx + 1}</span>
                    )}
                  </div>
                  <span
                    className={`text-[10px] mt-1.5 whitespace-nowrap ${
                      isCurrent
                        ? 'font-bold text-foreground'
                        : isPast
                          ? 'font-medium text-foreground'
                          : 'text-muted-foreground'
                    }`}
                  >
                    {t(`steps.${step.key}`, { defaultValue: step.label })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Chronological Tracking History */}
      {shipment?.trackingEvents && shipment.trackingEvents.length > 0 && (
        <div className="pt-2 border-t border-border/40 space-y-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
            {t('trackingHistory', { defaultValue: 'Tracking History' })}
          </span>
          <div className="space-y-2">
            {shipment.trackingEvents.map((event, idx) => (
              <div
                key={event.id || idx}
                className="flex items-start gap-3 text-xs p-2 rounded-lg bg-muted/20 border border-border/30"
              >
                <div className="mt-0.5 size-2 rounded-full bg-primary shrink-0" />
                <div className="flex-1 space-y-0.5 min-w-0">
                  <div className="flex justify-between items-baseline gap-2">
                    <span className="font-semibold text-foreground">
                      {t(`statuses.${event.status}`, { defaultValue: event.status })}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                      {new Date(event.occurredAt).toLocaleString()}
                    </span>
                  </div>
                  {event.description && (
                    <p className="text-muted-foreground text-[11px] leading-relaxed">
                      {event.description}
                    </p>
                  )}
                  {event.location && (
                    <p className="text-[10px] text-muted-foreground/80 flex items-center gap-1">
                      <span>📍</span> {event.location}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Exception Notice */}
      {isException && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs flex items-center gap-2 text-destructive">
          {currentStatus === 'RETURNED' ? (
            <RotateCcw className="size-4 shrink-0" />
          ) : currentStatus === 'CANCELLED' ? (
            <XCircle className="size-4 shrink-0" />
          ) : (
            <AlertTriangle className="size-4 shrink-0" />
          )}
          <span>
            {t(`exceptionNotices.${currentStatus}`, {
              defaultValue: `Shipment status: ${currentStatus}`,
            })}
          </span>
        </div>
      )}
    </div>
  );
}
