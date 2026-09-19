import type { CartItem } from '@/features/cart/types';

export type Address = {
  name: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
};

export type ShippingMethod = {
  id: string;
  name: string;
  eta: string;
  price: number;
};

export type TransactionStatus =
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'PROCESSING'
  | 'PACKED'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'Diproses';

export type OrderStatusHistoryRecord = {
  id: string;
  orderId: string;
  fromStatus: string | null;
  toStatus: string;
  note?: string | null;
  actorType: string;
  actorId?: string | null;
  createdAt: string;
};

export type OrderItemSnapshot = CartItem & {
  orderItemId?: string;
  productName?: string;
  productPrice?: number;
  productImage?: string;
  subtotal?: number;
  discountAllocation?: number;
};

export type Transaction = {
  id: string;
  internalId?: string;
  userId?: string | null;
  createdAt: string;
  items: OrderItemSnapshot[];
  address: Address;
  shipping: ShippingMethod;
  payment: string;
  subtotal: number;
  discountAmount?: number;
  total: number;
  promotionId?: string | null;
  couponCode?: string | null;
  status: TransactionStatus;
  paymentStatus?: string;
  providerPaymentId?: string;
  trackingNumber?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  statusHistory?: OrderStatusHistoryRecord[];
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
  cancellation?: {
    id: string;
    orderId: string;
    status: string;
    reason: string;
    customerNote?: string | null;
    adminNote?: string | null;
    actorType: string;
    actorId?: string | null;
    requestedAt: string;
    approvedAt?: string | null;
    rejectedAt?: string | null;
    cancelledAt?: string | null;
  } | null;
  refunds?: Array<{
    id: string;
    paymentId: string;
    returnId?: string | null;
    amount: number;
    currency: string;
    reason: string;
    status: string;
    providerRefundId?: string | null;
    processedAt?: string | null;
    createdAt: string;
  }>;
  returns?: Array<{
    id: string;
    orderId: string;
    status: string;
    reason: string;
    customerNote?: string | null;
    adminNote?: string | null;
    requestedAt: string;
    approvedAt?: string | null;
    rejectedAt?: string | null;
    receivedAt?: string | null;
    completedAt?: string | null;
    items: Array<{
      id: string;
      orderItemId: string;
      productId: string;
      quantity: number;
      reason?: string | null;
    }>;
    refunds?: Array<{
      id: string;
      amount: number;
      currency: string;
      status: string;
    }>;
  }>;
  source?: 'database' | 'legacy';
};

export type CreateOrderInput = {
  id?: string;
  userId?: string | null;
  createdAt?: string;
  items: CartItem[];
  address: Address;
  shipping: ShippingMethod;
  payment: string;
  subtotal: number;
  discountAmount?: number;
  total: number;
  promotionId?: string | null;
  couponCode?: string | null;
  status?: TransactionStatus;
};

export type CreateOrderServerInput = {
  items: { productId: string; quantity: number }[];
  address: Address;
  shippingId: string;
  payment: string;
  couponCode?: string;
  locale?: string;
};

export type CreateOrderResult =
  | { success: true; order: Transaction; paymentUrl?: string }
  | { success: false; error: string };

export type OrderContextValue = {
  transactions: Transaction[];
  hydrated: boolean;
  createOrder: (input: CreateOrderInput) => Transaction;
  createOrderServer: (input: CreateOrderServerInput) => Promise<CreateOrderResult>;
  getTransactionById: (id: string) => Transaction | undefined;
  addTransaction: (transaction: Transaction) => void;
};
