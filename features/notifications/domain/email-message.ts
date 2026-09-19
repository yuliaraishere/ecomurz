export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface EmailAttachment {
  filename: string;
  content: string | Buffer;
  contentType?: string;
}

export interface EmailMessage {
  to: string | string[] | EmailRecipient | EmailRecipient[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  idempotencyKey?: string;
  tags?: Record<string, string>;
  attachments?: EmailAttachment[];
}

export interface EmailSendResult {
  success: boolean;
  id?: string;
  error?: string;
  provider: string;
  timestamp: string;
  idempotent?: boolean;
}
