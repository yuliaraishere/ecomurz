import type { Transaction } from './types';

export const ORDER_STORAGE_KEY = 'rupa-transactions-v1';

function safeParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function generateTransactionId(): string {
  const now = new Date();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `RUPA-${now.getTime().toString().slice(-8)}-${random}`;
}

export function getStoredTransactions(): Transaction[] {
  if (typeof window === 'undefined') return [];
  try {
    return safeParse<Transaction[]>(window.localStorage.getItem(ORDER_STORAGE_KEY), []);
  } catch {
    return [];
  }
}

export function setStoredTransactions(transactions: Transaction[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(transactions));
  } catch {
    // Gracefully handle storage exceptions
  }
}
