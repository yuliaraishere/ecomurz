import type { EmailProvider } from '../providers/email-provider';
import { ResendEmailProvider } from '../providers/resend-email-provider';
import { MockEmailProvider } from '../providers/mock-email-provider';
import type { EmailMessage, EmailSendResult } from '../domain/email-message';
import type {
  VerificationEmailData,
  PasswordResetEmailData,
  OrderConfirmationEmailData,
  PaymentConfirmationEmailData,
  ShipmentCreatedEmailData,
  ShipmentDeliveredEmailData,
  RefundEmailData,
} from '../domain/email-template';
import { renderVerificationEmail } from '../templates/verification';
import { renderPasswordResetEmail } from '../templates/password-reset';
import { renderOrderConfirmationEmail } from '../templates/order-confirmation';
import { renderPaymentConfirmationEmail } from '../templates/payment-confirmation';
import { renderShipmentCreatedEmail } from '../templates/shipment-created';
import { renderShipmentDeliveredEmail } from '../templates/shipment-delivered';
import { renderRefundEmail } from '../templates/refund';

export class EmailService {
  private provider: EmailProvider;
  private processedKeys = new Map<string, number>();
  private readonly dedupeWindowMs = 10 * 60 * 1000; // 10 minutes

  constructor(provider?: EmailProvider) {
    if (provider) {
      this.provider = provider;
    } else if (
      process.env.EMAIL_PROVIDER === 'resend' ||
      (process.env.NODE_ENV === 'production' && Boolean(process.env.RESEND_API_KEY))
    ) {
      this.provider = new ResendEmailProvider();
    } else {
      this.provider = new MockEmailProvider();
    }
  }

  getProviderName(): string {
    return this.provider.name;
  }

  setProvider(provider: EmailProvider): void {
    this.provider = provider;
  }

  getProvider(): EmailProvider {
    return this.provider;
  }

  clearDedupeCache(): void {
    this.processedKeys.clear();
  }

  /**
   * Generic sender with idempotency checking and non-blocking safe delivery.
   */
  async send(message: EmailMessage): Promise<EmailSendResult> {
    const timestamp = new Date().toISOString();

    // 1. Check idempotency
    if (message.idempotencyKey) {
      const now = Date.now();
      const lastSent = this.processedKeys.get(message.idempotencyKey);
      if (lastSent && now - lastSent < this.dedupeWindowMs) {
        return {
          success: true,
          id: `deduped_${message.idempotencyKey}`,
          provider: this.provider.name,
          timestamp,
          idempotent: true,
        };
      }
      this.processedKeys.set(message.idempotencyKey, now);
    }

    // 2. Dispatch via active provider safely
    try {
      const result = await this.provider.send(message);
      if (!result.success) {
        console.warn(`[EmailService] Non-blocking warning: Failed to send "${message.subject}" via ${this.provider.name}: ${result.error}`);
      }
      return result;
    } catch (err: any) {
      console.error(`[EmailService] Uncaught error sending "${message.subject}":`, err?.message || err);
      return {
        success: false,
        error: err?.message || 'Unexpected email delivery failure',
        provider: this.provider.name,
        timestamp,
      };
    }
  }

  async sendVerificationEmail(to: string, data: VerificationEmailData): Promise<EmailSendResult> {
    const rendered = renderVerificationEmail(data);
    return this.send({
      to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      idempotencyKey: data.token ? `verify_${data.token}` : undefined,
      tags: { type: 'verification' },
    });
  }

  async sendPasswordResetEmail(to: string, data: PasswordResetEmailData): Promise<EmailSendResult> {
    const rendered = renderPasswordResetEmail(data);
    return this.send({
      to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      tags: { type: 'password_reset' },
    });
  }

  async sendOrderConfirmationEmail(to: string, data: OrderConfirmationEmailData): Promise<EmailSendResult> {
    const rendered = renderOrderConfirmationEmail(data);
    return this.send({
      to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      idempotencyKey: `order_confirm_${data.orderId}`,
      tags: { type: 'order_confirmation', orderId: data.orderId },
    });
  }

  async sendPaymentConfirmationEmail(to: string, data: PaymentConfirmationEmailData): Promise<EmailSendResult> {
    const rendered = renderPaymentConfirmationEmail(data);
    return this.send({
      to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      idempotencyKey: `payment_confirm_${data.orderId}_${data.transactionId || 'default'}`,
      tags: { type: 'payment_confirmation', orderId: data.orderId },
    });
  }

  async sendShipmentCreatedEmail(to: string, data: ShipmentCreatedEmailData): Promise<EmailSendResult> {
    const rendered = renderShipmentCreatedEmail(data);
    return this.send({
      to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      idempotencyKey: `shipment_created_${data.orderId}_${data.trackingNumber}`,
      tags: { type: 'shipment_created', orderId: data.orderId },
    });
  }

  async sendShipmentDeliveredEmail(to: string, data: ShipmentDeliveredEmailData): Promise<EmailSendResult> {
    const rendered = renderShipmentDeliveredEmail(data);
    return this.send({
      to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      idempotencyKey: `shipment_delivered_${data.orderId}_${data.trackingNumber}`,
      tags: { type: 'shipment_delivered', orderId: data.orderId },
    });
  }

  async sendRefundEmail(to: string, data: RefundEmailData): Promise<EmailSendResult> {
    const rendered = renderRefundEmail(data);
    return this.send({
      to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      idempotencyKey: `refund_${data.refundId}`,
      tags: { type: 'refund_processed', orderId: data.orderId, refundId: data.refundId },
    });
  }
}

export const emailService = new EmailService();
