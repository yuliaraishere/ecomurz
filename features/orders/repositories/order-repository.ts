import type { Transaction } from '../types';

export type CreateOrderRecordInput = {
  publicId: string;
  userId?: string | null;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  recipientCity: string;
  recipientPostalCode: string;
  shippingMethodId: string;
  shippingMethodName: string;
  shippingMethodEta: string;
  shippingPrice: number;
  paymentMethod: string;
  paymentProvider?: string;
  currency?: string;
  subtotal: number;
  discountAmount?: number;
  total: number;
  promotionId?: string | null;
  couponCode?: string | null;
  status: string;
  providerPaymentId?: string;
  items: {
    productId: string;
    quantity: number;
    productName: string;
    productPrice: number;
    productImage: string;
    subtotal: number;
    discountAllocation?: number;
  }[];
};

export interface OrderRepository {
  createOrder(data: CreateOrderRecordInput): Promise<Transaction>;
  getOrderByPublicId(publicId: string): Promise<Transaction | undefined>;
  getOrdersByUserId(userId: string): Promise<Transaction[]>;
  getRecentOrders(limit?: number): Promise<Transaction[]>;
}
