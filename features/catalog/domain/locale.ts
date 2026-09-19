/**
 * Central source of truth for all supported marketplace locales.
 */
export const SUPPORTED_LOCALES = [
  'id', // Indonesian (Default)
  'en', // English
  'ja', // Japanese
  'tl', // Tagalog
  'vi', // Vietnamese
  'th', // Thai
  'hi', // Hindi
  'zh', // Chinese
] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = 'id';

/**
 * Checks if a given value is one of the 8 supported locales.
 */
export function isSupportedLocale(locale: unknown): locale is SupportedLocale {
  return (
    typeof locale === 'string' &&
    (SUPPORTED_LOCALES as readonly string[]).includes(locale.trim().toLowerCase())
  );
}

/**
 * Normalizes an arbitrary locale string into a valid SupportedLocale.
 * Falls back safely to DEFAULT_LOCALE ('id') for unsupported or invalid inputs.
 */
export function normalizeLocale(locale?: unknown): SupportedLocale {
  if (typeof locale !== 'string') {
    return DEFAULT_LOCALE;
  }
  const normalized = locale.trim().toLowerCase();
  return isSupportedLocale(normalized) ? (normalized as SupportedLocale) : DEFAULT_LOCALE;
}
