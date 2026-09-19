import type { SupportedLocale } from '@/features/catalog/domain/locale';

export interface TranslationProvider {
  readonly name: 'google' | 'mock';
  translate(
    text: string,
    sourceLocale: SupportedLocale | string,
    targetLocale: SupportedLocale | string
  ): Promise<string>;
  translateBatch(
    texts: string[],
    sourceLocale: SupportedLocale | string,
    targetLocale: SupportedLocale | string
  ): Promise<string[]>;
}
