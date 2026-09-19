import type { EmailProvider } from './email-provider';
import type { EmailMessage, EmailSendResult } from '../domain/email-message';

export class ResendEmailProvider implements EmailProvider {
  readonly name = 'resend';

  private readonly apiKey: string;
  private readonly defaultFrom: string;

  constructor(apiKey?: string, defaultFrom?: string) {
    this.apiKey = typeof apiKey === 'string' ? apiKey : (process.env.RESEND_API_KEY || '');
    this.defaultFrom =
      defaultFrom || process.env.RESEND_FROM_EMAIL || 'RUPA Marketplace <orders@rupa.asia>';
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    const timestamp = new Date().toISOString();

    if (!this.apiKey) {
      return {
        success: false,
        error: 'RESEND_API_KEY is not configured',
        provider: this.name,
        timestamp,
      };
    }

    try {
      const recipientList: string[] = Array.isArray(message.to)
        ? message.to.map((r) => (typeof r === 'string' ? r : r.email))
        : [typeof message.to === 'string' ? message.to : message.to.email];

      const payload = {
        from: message.from || this.defaultFrom,
        to: recipientList,
        subject: message.subject,
        html: message.html,
        text: message.text,
        reply_to: message.replyTo,
        tags: message.tags
          ? Object.entries(message.tags).map(([name, value]) => ({ name, value }))
          : undefined,
        attachments: message.attachments?.map((a) => ({
          filename: a.filename,
          content: typeof a.content === 'string' ? a.content : a.content.toString('base64'),
        })),
      };

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          ...(message.idempotencyKey ? { 'Idempotency-Key': message.idempotencyKey } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json().catch(() => ({}))) as Record<string, any>;

      if (!response.ok) {
        return {
          success: false,
          error: data.message || `Resend API returned HTTP ${response.status}`,
          provider: this.name,
          timestamp,
        };
      }

      return {
        success: true,
        id: data.id || `resend_${Date.now()}`,
        provider: this.name,
        timestamp,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Network error communicating with Resend',
        provider: this.name,
        timestamp,
      };
    }
  }
}
