import type { EmailMessage, EmailSendResult } from '../domain/email-message';

export interface EmailProvider {
  readonly name: string;
  send(message: EmailMessage): Promise<EmailSendResult>;
}
