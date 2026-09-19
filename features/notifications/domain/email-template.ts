export type EmailTemplateType =
  | 'VERIFICATION'
  | 'PASSWORD_RESET'
  | 'ORDER_CONFIRMATION'
  | 'PAYMENT_CONFIRMATION'
  | 'SHIPMENT_CREATED'
  | 'SHIPMENT_DELIVERED'
  | 'REFUND_PROCESSED';

export type SupportedLocale = 'id' | 'en' | 'ja' | 'tl' | 'vi' | 'th' | 'hi' | 'zh';

export interface BaseTemplateData {
  locale?: string;
  recipientName?: string;
}

export interface VerificationEmailData extends BaseTemplateData {
  verificationUrl: string;
  token?: string;
}

export interface PasswordResetEmailData extends BaseTemplateData {
  resetUrl: string;
}

export interface OrderItemSummary {
  name: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface OrderConfirmationEmailData extends BaseTemplateData {
  orderId: string;
  items: OrderItemSummary[];
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  shippingAddress: string;
  paymentMethod: string;
}

export interface PaymentConfirmationEmailData extends BaseTemplateData {
  orderId: string;
  transactionId?: string;
  amount: number;
  paymentMethod: string;
  paidAt: string;
}

export interface ShipmentCreatedEmailData extends BaseTemplateData {
  orderId: string;
  trackingNumber: string;
  courierName: string;
  trackingUrl?: string;
  estimatedDelivery?: string;
}

export interface ShipmentDeliveredEmailData extends BaseTemplateData {
  orderId: string;
  trackingNumber: string;
  courierName: string;
  deliveredAt: string;
}

export interface RefundEmailData extends BaseTemplateData {
  orderId: string;
  refundId: string;
  amount: number;
  reason?: string;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}
