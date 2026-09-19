export type CancellationStatus =
  | 'REQUESTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED';

export interface CancellationRecord {
  id: string;
  orderId: string;
  status: CancellationStatus;
  reason: string;
  customerNote?: string | null;
  adminNote?: string | null;
  actorType: string;
  actorId?: string | null;
  requestedAt: Date;
  approvedAt?: Date | null;
  rejectedAt?: Date | null;
  cancelledAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface RequestCancellationInput {
  orderPublicId: string;
  userId?: string | null;
  reason: string;
  customerNote?: string;
}

export interface ReviewCancellationInput {
  cancellationId: string;
  adminUserId: string;
  action: 'APPROVE' | 'REJECT';
  adminNote?: string;
}
