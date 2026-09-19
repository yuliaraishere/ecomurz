export type ReturnStatus =
  | 'RETURN_REQUESTED'
  | 'RETURN_APPROVED'
  | 'RETURN_REJECTED'
  | 'RETURN_IN_TRANSIT'
  | 'RETURN_RECEIVED'
  | 'COMPLETED'
  | 'RETURN_CANCELLED';

export interface ReturnItemRecord {
  id: string;
  returnId: string;
  orderItemId: string;
  productId: string;
  quantity: number;
  reason?: string | null;
  createdAt: Date;
  orderItem?: {
    id: string;
    productName: string;
    productPrice: number;
    quantity: number;
  };
}

export interface ReturnRecord {
  id: string;
  orderId: string;
  status: ReturnStatus;
  reason: string;
  customerNote?: string | null;
  adminNote?: string | null;
  requestedAt: Date;
  approvedAt?: Date | null;
  rejectedAt?: Date | null;
  receivedAt?: Date | null;
  completedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  items: ReturnItemRecord[];
  refunds?: Array<{
    id: string;
    amount: number;
    currency: string;
    status: string;
  }>;
}

export interface RequestReturnItemInput {
  orderItemId: string;
  quantity: number;
  reason?: string;
}

export interface RequestReturnInput {
  orderPublicId: string;
  userId?: string | null;
  reason: string;
  customerNote?: string;
  items: RequestReturnItemInput[];
}

export interface ApproveReturnInput {
  returnId: string;
  adminUserId: string;
  adminNote?: string;
}

export interface ReceiveReturnInput {
  returnId: string;
  adminUserId: string;
  adminNote?: string;
  autoRefund?: boolean;
  refundAmount?: number;
}

export interface RejectReturnInput {
  returnId: string;
  adminUserId: string;
  adminNote?: string;
}
