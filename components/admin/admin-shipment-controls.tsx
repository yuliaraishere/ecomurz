'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Truck,
  Package,
  Send,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Loader2,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  adminCreateShipmentAction,
  adminRefreshTrackingAction,
  adminSimulateShipmentAction,
} from '@/features/shipping/actions/shipping-actions';
import type { ShipmentStatus } from '@/features/shipping/types';

interface AdminShipmentControlsProps {
  orderPublicId: string;
  orderStatus: string;
  shipment?: {
    id: string;
    provider: string;
    carrierName?: string | null;
    serviceName?: string | null;
    serviceCode: string;
    trackingNumber?: string | null;
    status: string;
    shippingCost: number;
    currency: string;
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
}

export function AdminShipmentControls({
  orderPublicId,
  orderStatus,
  shipment,
}: AdminShipmentControlsProps) {
  const t = useTranslations('Admin.orderDetail');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canCreateShipment =
    !shipment &&
    orderStatus !== 'PENDING_PAYMENT' &&
    orderStatus !== 'CANCELLED';

  const handleCreateShipment = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await adminCreateShipmentAction(orderPublicId);
      if (res.success) {
        window.location.reload();
      } else {
        setErrorMsg((res as any).message || res.error || 'Failed to create shipment');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'System error');
    } finally {
      setLoading(false);
    }
  };

  const handleSimulate = async (targetStatus: ShipmentStatus) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await adminSimulateShipmentAction(orderPublicId, targetStatus);
      if (res.success) {
        window.location.reload();
      } else {
        setErrorMsg((res as any).message || res.error || 'Failed to transition shipment');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'System error');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshTracking = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await adminRefreshTrackingAction(orderPublicId);
      if (res.success) {
        window.location.reload();
      } else {
        setErrorMsg((res as any).message || res.error || 'Failed to refresh tracking');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'System error');
    } finally {
      setLoading(false);
    }
  };

  const currentStatus = shipment?.status as ShipmentStatus | undefined;

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Truck className="size-4 text-primary" />
          Fulfillment & Courier Shipment
        </h2>
        {shipment && (
          <Badge variant="outline" className="text-xs uppercase font-mono">
            {shipment.status}
          </Badge>
        )}
      </div>

      {errorMsg && (
        <div className="p-2.5 rounded-lg border border-destructive/20 bg-destructive/10 text-xs font-medium text-destructive">
          {errorMsg}
        </div>
      )}

      {!shipment ? (
        <div className="rounded-lg border border-dashed border-border p-4 text-center space-y-3">
          <p className="text-xs text-muted-foreground">
            {canCreateShipment
              ? 'Order is paid and ready for shipment dispatch.'
              : 'Shipment cannot be created until the order is confirmed as PAID.'}
          </p>

          {canCreateShipment && (
            <Button
              onClick={handleCreateShipment}
              disabled={loading}
              className="rounded-full text-xs"
            >
              {loading && <Loader2 className="size-3 animate-spin mr-1.5" />}
              <Package className="size-3.5 mr-1.5" />
              Generate Shipment & Tracking
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3 text-xs">
          <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Courier Provider:</span>
              <span className="font-medium text-foreground uppercase">{shipment.provider}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Service:</span>
              <span className="font-medium text-foreground">{shipment.serviceName || shipment.serviceCode}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Tracking Number:</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold text-primary">{shipment.trackingNumber || 'Pending'}</span>
                {shipment.trackingNumber && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleRefreshTracking}
                    disabled={loading}
                    className="size-6 p-0 text-muted-foreground hover:text-foreground"
                    title="Refresh Courier Tracking"
                  >
                    <RefreshCw className={`size-3 ${loading ? 'animate-spin' : ''}`} />
                  </Button>
                )}
              </div>
            </div>
            {shipment.carrierName && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Carrier:</span>
                <span className="text-foreground font-medium">{shipment.carrierName}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shipping Cost:</span>
              <span className="font-mono font-bold text-foreground">¥{shipment.shippingCost.toLocaleString()} {shipment.currency}</span>
            </div>
            {shipment.shippedAt && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipped At:</span>
                <span className="text-foreground">{new Date(shipment.shippedAt).toLocaleString()}</span>
              </div>
            )}
            {shipment.deliveredAt && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivered At:</span>
                <span className="text-foreground">{new Date(shipment.deliveredAt).toLocaleString()}</span>
              </div>
            )}
          </div>

          {/* Chronological Tracking Events */}
          {shipment.trackingEvents && shipment.trackingEvents.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Tracking History ({shipment.trackingEvents.length})
              </span>
              <div className="space-y-1.5 max-h-48 overflow-y-auto border border-border/60 rounded-lg p-2 bg-muted/10">
                {shipment.trackingEvents.map((evt) => (
                  <div key={evt.id} className="text-[11px] p-1.5 rounded bg-card border border-border/40 space-y-0.5">
                    <div className="flex justify-between items-center font-medium">
                      <span className="font-mono text-primary">{evt.status}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(evt.occurredAt).toLocaleString()}
                      </span>
                    </div>
                    {evt.description && (
                      <p className="text-foreground text-[11px]">{evt.description}</p>
                    )}
                    {evt.location && (
                      <p className="text-[10px] text-muted-foreground">{evt.location}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Simulation Controls */}
          <div className="space-y-2 pt-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Courier Dispatch Controls (Simulation)
            </span>

            <div className="flex flex-wrap gap-2">
              {currentStatus === 'READY_TO_SHIP' && (
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => handleSimulate('SHIPPED')}
                  disabled={loading}
                  className="rounded-full text-xs"
                >
                  {loading && <Loader2 className="size-3 animate-spin mr-1" />}
                  <Send className="size-3 mr-1" />
                  Simulate Shipped
                </Button>
              )}

              {currentStatus === 'SHIPPED' && (
                <>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => handleSimulate('IN_TRANSIT')}
                    disabled={loading}
                    className="rounded-full text-xs"
                  >
                    {loading && <Loader2 className="size-3 animate-spin mr-1" />}
                    <Truck className="size-3 mr-1" />
                    Simulate In Transit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleSimulate('DELIVERY_FAILED')}
                    disabled={loading}
                    className="rounded-full text-xs"
                  >
                    Delivery Failed
                  </Button>
                </>
              )}

              {currentStatus === 'IN_TRANSIT' && (
                <>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => handleSimulate('OUT_FOR_DELIVERY')}
                    disabled={loading}
                    className="rounded-full text-xs"
                  >
                    {loading && <Loader2 className="size-3 animate-spin mr-1" />}
                    <Truck className="size-3 mr-1" />
                    Out for Delivery
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleSimulate('DELIVERY_FAILED')}
                    disabled={loading}
                    className="rounded-full text-xs"
                  >
                    Delivery Failed
                  </Button>
                </>
              )}

              {currentStatus === 'OUT_FOR_DELIVERY' && (
                <>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => handleSimulate('DELIVERED')}
                    disabled={loading}
                    className="rounded-full text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {loading && <Loader2 className="size-3 animate-spin mr-1" />}
                    <CheckCircle2 className="size-3 mr-1" />
                    Simulate Delivered
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleSimulate('DELIVERY_FAILED')}
                    disabled={loading}
                    className="rounded-full text-xs"
                  >
                    Delivery Failed
                  </Button>
                </>
              )}

              {(currentStatus === 'DELIVERED' || currentStatus === 'DELIVERY_FAILED') && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSimulate('RETURNED')}
                  disabled={loading}
                  className="rounded-full text-xs"
                >
                  <RotateCcw className="size-3 mr-1" />
                  Simulate Returned
                </Button>
              )}

              {['DELIVERED', 'RETURNED', 'CANCELLED'].includes(currentStatus || '') && (
                <span className="text-xs text-muted-foreground py-1">
                  Terminal shipment state reached ({currentStatus}).
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
