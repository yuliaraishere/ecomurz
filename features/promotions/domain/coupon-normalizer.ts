/**
 * Normalizes a user-entered coupon code.
 * Ensures consistent uppercase, trimmed whitespace representation.
 */
export function normalizeCouponCode(code: string | null | undefined): string {
  if (!code) {
    return '';
  }
  return code.trim().toUpperCase();
}
