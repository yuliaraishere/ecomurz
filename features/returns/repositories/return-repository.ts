import type { ReturnStatus } from '../types';

export interface ReturnListParams {
  status?: ReturnStatus | 'ALL';
  page?: number;
  pageSize?: number;
}

export interface ReturnListItem {
  id: string;
  orderId: string;
  status: ReturnStatus;
  reason: string;
  customerNote: string | null;
  adminNote: string | null;
  requestedAt: Date;
  approvedAt: Date | null;
  rejectedAt: Date | null;
  receivedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  order: {
    id: string;
    publicId: string;
    recipientName: string;
    userId: string | null;
    status: string;
  };
  items: Array<{
    id: string;
    orderItemId: string;
    productId: string;
    quantity: number;
    reason: string | null;
    orderItem: {
      id: string;
      productName: string;
      productPrice: number;
      quantity: number;
    };
  }>;
  refunds: Array<{
    id: string;
    amount: number;
    currency: string;
    status: string;
  }>;
}

export interface ReturnListResult {
  returns: ReturnListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ReturnRepository {
  getReturnsByUserId(userId: string, params?: ReturnListParams): Promise<ReturnListResult>;
  getAllReturns(params?: ReturnListParams): Promise<ReturnListResult>;
  getReturnById(returnId: string): Promise<ReturnListItem | null>;
}
