import type { EmailProvider } from './email-provider';
import type { EmailMessage, EmailSendResult } from '../domain/email-message';

export class MockEmailProvider implements EmailProvider {
  readonly name = 'mock';

  private sentEmails: EmailMessage[] = [];
  private shouldFail = false;
  private failureMessage = 'Simulated email delivery failure';

  async send(message: EmailMessage): Promise<EmailSendResult> {
    const timestamp = new Date().toISOString();

    if (this.shouldFail) {
      return {
        success: false,
        error: this.failureMessage,
        provider: this.name,
        timestamp,
      };
    }

    this.sentEmails.push({ ...message });

    return {
      success: true,
      id: `mock_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      provider: this.name,
      timestamp,
    };
  }

  getSentEmails(): EmailMessage[] {
    return [...this.sentEmails];
  }

  getLastEmail(): EmailMessage | undefined {
    return this.sentEmails[this.sentEmails.length - 1];
  }

  clearSentEmails(): void {
    this.sentEmails = [];
  }

  setShouldFail(shouldFail: boolean, message?: string): void {
    this.shouldFail = shouldFail;
    if (message) this.failureMessage = message;
  }
}
