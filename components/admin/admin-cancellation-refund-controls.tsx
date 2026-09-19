'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  adminApproveCancellationAction,
  adminRejectCancellationAction,
} from '@/features/cancellations/actions/cancellation-actions';
import {
  adminApproveReturnAction,
  adminReceiveReturnAction,
  adminRejectReturnAction,
} from '@/features/returns/actions/return-actions';
import { refundOrderAction } from '@/features/payments/actions/payment-actions';
import type { AdminOrderDetail } from '@/features/orders/repositories/admin-order-repository';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  PackageCheck,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  XCircle,
} from 'lucide-react';

interface AdminCancellationRefundControlsProps {
  order: AdminOrderDetail;
}

export function AdminCancellationRefundControls({
  order,
}: AdminCancellationRefundControlsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Note state for cancellation
  const [cancelAdminNote, setCancelAdminNote] = useState('');

  // Return review note states (by returnId)
  const [returnNotes, setReturnNotes] = useState<Record<string, string>>({});

  // Manual refund state
  const [showRefundForm, setShowRefundForm] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');

  const cancellation = order.cancellation;
  const returns = order.returns || [];
  const refunds = order.refunds || [];

  // Calculate total captured and refunded
  const successfulPayments = (order.payments || []).filter((p) => p.status === 'PAID');
  const totalCaptured = successfulPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalRefunded = refunds
    .filter((r) => r.status === 'SUCCEEDED')
    .reduce((sum, r) => sum + r.amount, 0);
  const maxRefundable = Math.max(0, totalCaptured - totalRefunded);

  // Cancellation Handlers
  const handleApproveCancellation = async () => {
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await adminApproveCancellationAction({
        cancellationId: cancellation?.id,
        orderId: order.internalId || order.id,
        adminNote: cancelAdminNote.trim() || undefined,
      });

      if (res.success) {
        setSuccessMsg('Cancellation approved. Refund processed and inventory restored.');
        router.refresh();
      } else {
        setErrorMsg(res.error || 'Failed to approve cancellation');
      }
    } catch {
      setErrorMsg('System error while approving cancellation');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectCancellation = async () => {
    if (!cancellation?.id) return;
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await adminRejectCancellationAction({
        cancellationId: cancellation.id,
        orderId: order.internalId || order.id,
        adminNote: cancelAdminNote.trim() || undefined,
      });

      if (res.success) {
        setSuccessMsg('Cancellation request rejected.');
        router.refresh();
      } else {
        setErrorMsg(res.error || 'Failed to reject cancellation');
      }
    } catch {
      setErrorMsg('System error while rejecting cancellation');
    } finally {
      setLoading(false);
    }
  };

  // Return Handlers
  const handleApproveReturn = async (returnId: string) => {
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await adminApproveReturnAction({
        returnId,
        orderPublicId: order.id,
        adminNote: returnNotes[returnId]?.trim() || undefined,
      });

      if (res.success) {
        setSuccessMsg('Return approved. Customer notified to ship items.');
        router.refresh();
      } else {
        setErrorMsg(res.error || 'Failed to approve return');
      }
    } catch {
      setErrorMsg('System error while approving return');
    } finally {
      setLoading(false);
    }
  };

  const handleReceiveReturn = async (returnId: string) => {
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await adminReceiveReturnAction({
        returnId,
        orderPublicId: order.id,
        adminNote: returnNotes[returnId]?.trim() || undefined,
        autoRefund: true,
      });

      if (res.success) {
        setSuccessMsg('Return received! Inventory restored to stock and refund issued.');
        router.refresh();
      } else {
        setErrorMsg(res.error || 'Failed to receive return');
      }
    } catch {
      setErrorMsg('System error while receiving return');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectReturn = async (returnId: string) => {
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await adminRejectReturnAction({
        returnId,
        orderPublicId: order.id,
        adminNote: returnNotes[returnId]?.trim() || undefined,
      });

      if (res.success) {
        setSuccessMsg('Return request rejected.');
        router.refresh();
      } else {
        setErrorMsg(res.error || 'Failed to reject return');
      }
    } catch {
      setErrorMsg('System error while rejecting return');
    } finally {
      setLoading(false);
    }
  };

  // Manual Refund Handler
  const handleIssueManualRefund = async () => {
    const amt = parseInt(refundAmount);
    if (isNaN(amt) || amt <= 0) {
      setErrorMsg('Please enter a valid positive integer refund amount in JPY');
      return;
    }
    if (amt > maxRefundable) {
      setErrorMsg(`Refund amount cannot exceed remaining refundable balance of ¥${maxRefundable.toLocaleString()}`);
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await refundOrderAction({
        orderId: order.internalId || order.id,
        amount: amt,
        reason: refundReason.trim() || 'Manual admin refund',
      });

      if (res.success) {
        setSuccessMsg(`Refund of ¥${amt.toLocaleString()} processed successfully.`);
        setShowRefundForm(false);
        setRefundAmount('');
        setRefundReason('');
        router.refresh();
      } else {
        setErrorMsg(res.error || 'Failed to issue refund');
      }
    } catch {
      setErrorMsg('System error while processing refund');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Alert Banners */}
      {errorMsg && (
        <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs">
          <AlertCircle className="size-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs">
          <CheckCircle2 className="size-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 1. CANCELLATION MANAGEMENT */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <XCircle className="size-4 text-destructive" />
            <h3 className="font-semibold text-sm">Order Cancellation</h3>
          </div>
          {cancellation ? (
            <Badge
              variant="outline"
              className={
                cancellation.status === 'APPROVED' || cancellation.status === 'CANCELLED'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : cancellation.status === 'REQUESTED'
                  ? 'bg-amber-50 text-amber-700 border-amber-300 animate-pulse'
                  : 'bg-rose-50 text-rose-700 border-rose-300'
              }
            >
              {cancellation.status}
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">No cancellation requested</span>
          )}
        </div>

        {cancellation && cancellation.status === 'REQUESTED' && (
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3.5 space-y-3 text-xs">
            <div className="space-y-1">
              <p className="font-semibold text-amber-900">
                Customer Cancellation Request Pending Review
              </p>
              <p className="text-muted-foreground">
                <span className="font-medium text-foreground">Reason:</span> {cancellation.reason}
              </p>
              {cancellation.customerNote && (
                <p className="text-muted-foreground">
                  <span className="font-medium text-foreground">Customer Note:</span> {cancellation.customerNote}
                </p>
              )}
            </div>

            <div className="space-y-2 pt-2 border-t border-amber-500/20">
              <label className="text-[11px] font-semibold text-foreground">
                Admin Review Note (Optional):
              </label>
              <Input
                placeholder="Reason for approval / rejection"
                value={cancelAdminNote}
                onChange={(e) => setCancelAdminNote(e.target.value)}
                className="text-xs bg-white"
              />
              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={loading}
                  onClick={handleApproveCancellation}
                  className="text-xs rounded-full"
                >
                  {loading && <Loader2 className="size-3 animate-spin mr-1" />}
                  Approve Cancellation & Refund
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={loading}
                  onClick={handleRejectCancellation}
                  className="text-xs rounded-full"
                >
                  Reject Request
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Pre-shipment direct cancel if no request exists */}
        {!cancellation &&
          (order.status === 'PAID' || order.status === 'PROCESSING' || order.status === 'PACKED') && (
            <div className="rounded-lg bg-muted/40 border p-3 text-xs space-y-2">
              <p className="text-muted-foreground">
                This paid pre-shipment order can be directly cancelled by an administrator. Consumed stock will be restored and payment refunded.
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="Cancellation reason"
                  value={cancelAdminNote}
                  onChange={(e) => setCancelAdminNote(e.target.value)}
                  className="text-xs bg-background max-w-sm"
                />
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={loading || !cancelAdminNote.trim()}
                  onClick={handleApproveCancellation}
                  className="text-xs rounded-full shrink-0"
                >
                  Cancel Order & Refund
                </Button>
              </div>
            </div>
          )}
      </div>

      {/* 2. RETURNS MANAGEMENT */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <RotateCcw className="size-4 text-primary" />
            <h3 className="font-semibold text-sm">Customer Returns ({returns.length})</h3>
          </div>
        </div>

        {returns.length === 0 ? (
          <p className="text-xs text-muted-foreground">No return requests for this order.</p>
        ) : (
          <div className="space-y-3">
            {returns.map((ret) => (
              <div key={ret.id} className="rounded-lg border p-3.5 space-y-3 bg-muted/20 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold">#{ret.id.slice(-8).toUpperCase()}</span>
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
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(ret.requestedAt).toLocaleString()}
                  </span>
                </div>

                <div>
                  <p className="text-foreground">
                    <span className="font-medium">Reason:</span> {ret.reason}
                  </p>
                  {ret.customerNote && (
                    <p className="text-muted-foreground">
                      <span className="font-medium">Customer Note:</span> {ret.customerNote}
                    </p>
                  )}
                  {ret.adminNote && (
                    <p className="text-muted-foreground">
                      <span className="font-medium">Admin Note:</span> {ret.adminNote}
                    </p>
                  )}
                </div>

                {/* Items */}
                {ret.items && ret.items.length > 0 && (
                  <div className="bg-background rounded p-2 border space-y-1">
                    <p className="font-medium text-[11px] text-muted-foreground">Items to Return:</p>
                    {ret.items.map((it) => (
                      <div key={it.id} className="flex justify-between items-center text-[11px]">
                        <span>
                          {order.items.find((oi) => oi.orderItemId === it.orderItemId)?.productName || it.productId}
                        </span>
                        <span className="font-mono font-semibold">Qty: {it.quantity}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Admin Actions based on return status */}
                {ret.status === 'RETURN_REQUESTED' && (
                  <div className="pt-2 border-t flex flex-col gap-2">
                    <Input
                      placeholder="Admin review note"
                      value={returnNotes[ret.id] || ''}
                      onChange={(e) => setReturnNotes({ ...returnNotes, [ret.id]: e.target.value })}
                      className="text-xs bg-background"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        disabled={loading}
                        onClick={() => handleApproveReturn(ret.id)}
                        className="text-xs rounded-full"
                      >
                        Approve Return
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={loading}
                        onClick={() => handleRejectReturn(ret.id)}
                        className="text-xs rounded-full text-destructive"
                      >
                        Reject Return
                      </Button>
                    </div>
                  </div>
                )}

                {(ret.status === 'RETURN_APPROVED' || ret.status === 'RETURN_IN_TRANSIT') && (
                  <div className="pt-2 border-t flex flex-col gap-2">
                    <p className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                      <PackageCheck className="size-3.5" />
                      Receiving this package will automatically restore stock and execute proportional refund.
                    </p>
                    <Input
                      placeholder="Admin inspection / receipt note"
                      value={returnNotes[ret.id] || ''}
                      onChange={(e) => setReturnNotes({ ...returnNotes, [ret.id]: e.target.value })}
                      className="text-xs bg-background"
                    />
                    <div>
                      <Button
                        size="sm"
                        disabled={loading}
                        onClick={() => handleReceiveReturn(ret.id)}
                        className="text-xs rounded-full bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        {loading && <Loader2 className="size-3 animate-spin mr-1" />}
                        Receive Return & Restore Stock
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. REFUNDS AUDIT & MANUAL REFUND */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <RefreshCw className="size-4 text-emerald-600" />
            <h3 className="font-semibold text-sm">Refunds Management</h3>
          </div>
          <div className="text-right text-xs">
            <span className="text-muted-foreground">Refundable Balance: </span>
            <span className="font-bold text-foreground font-mono">
              ¥{maxRefundable.toLocaleString()}
            </span>
          </div>
        </div>

        {refunds.length === 0 ? (
          <p className="text-xs text-muted-foreground">No refunds issued for this order yet.</p>
        ) : (
          <div className="rounded-lg border divide-y overflow-hidden text-xs">
            {refunds.map((rf) => (
              <div key={rf.id} className="p-3 flex items-center justify-between bg-muted/10">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold font-mono text-sm">¥{rf.amount.toLocaleString()}</span>
                    <Badge
                      variant="outline"
                      className={
                        rf.status === 'SUCCEEDED'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                          : 'bg-rose-50 text-rose-700 border-rose-300'
                      }
                    >
                      {rf.status}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground">{rf.reason}</p>
                  {rf.providerRefundId && (
                    <p className="text-[10px] text-muted-foreground font-mono">
                      Ref: {rf.providerRefundId}
                    </p>
                  )}
                </div>
                <span className="text-[11px] text-muted-foreground">
                  {new Date(rf.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Manual Refund Action */}
        {maxRefundable > 0 && (
          <div className="pt-2 border-t space-y-3">
            {!showRefundForm ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowRefundForm(true)}
                className="text-xs rounded-full"
              >
                Issue Manual Partial / Full Refund
              </Button>
            ) : (
              <div className="rounded-lg border bg-muted/20 p-3 text-xs space-y-2">
                <h4 className="font-semibold text-foreground">Issue Manual Refund</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-muted-foreground">
                      Amount (JPY, max ¥{maxRefundable.toLocaleString()}):
                    </label>
                    <Input
                      type="number"
                      min={1}
                      max={maxRefundable}
                      placeholder="e.g. 1500"
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(e.target.value)}
                      className="text-xs bg-background"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground">Reason:</label>
                    <Input
                      placeholder="e.g. Customer goodwill, damaged goods"
                      value={refundReason}
                      onChange={(e) => setRefundReason(e.target.value)}
                      className="text-xs bg-background"
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    disabled={loading}
                    onClick={handleIssueManualRefund}
                    className="text-xs rounded-full bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {loading && <Loader2 className="size-3 animate-spin mr-1" />}
                    Confirm Refund
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={loading}
                    onClick={() => setShowRefundForm(false)}
                    className="text-xs rounded-full"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
