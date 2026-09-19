import type { CartItem } from './types';

export const CART_STORAGE_KEY = 'rupa-cart-v1';

function safeParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function getStoredCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    return safeParse<CartItem[]>(window.localStorage.getItem(CART_STORAGE_KEY), []);
  } catch {
    return [];
  }
}

export function setStoredCart(items: CartItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Gracefully handle storage quota or private browsing exceptions
  }
}

export function clearStoredCart(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(CART_STORAGE_KEY);
  } catch {
    // Gracefully handle storage exceptions
  }
}
