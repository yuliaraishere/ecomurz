/**
 * Utility for normalizing and validating SKUs.
 */
export function normalizeSku(sku: string): string {
  return sku
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-_]/g, '-');
}

export function isValidSku(sku: string): boolean {
  const normalized = normalizeSku(sku);
  return normalized.length >= 3 && /^[A-Z0-9-_]+$/.test(normalized);
}
