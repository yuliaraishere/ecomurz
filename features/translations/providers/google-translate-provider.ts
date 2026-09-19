import type { TranslationProvider } from './translation-provider';
import type { SupportedLocale } from '@/features/catalog/domain/locale';

export class GoogleTranslateProvider implements TranslationProvider {
  readonly name = 'google' as const;
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = (apiKey ?? process.env.GOOGLE_TRANSLATE_API_KEY ?? '').trim();
  }

  async translate(
    text: string,
    sourceLocale: SupportedLocale | string,
    targetLocale: SupportedLocale | string
  ): Promise<string> {
    const results = await this.translateBatch([text], sourceLocale, targetLocale);
    return results[0] ?? text;
  }

  async translateBatch(
    texts: string[],
    sourceLocale: SupportedLocale | string,
    targetLocale: SupportedLocale | string
  ): Promise<string[]> {
    if (!this.apiKey) {
      throw new Error(
        '[GoogleTranslateProvider] GOOGLE_TRANSLATE_API_KEY is not configured.'
      );
    }

    if (texts.length === 0) return [];

    const url = `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(
      this.apiKey
    )}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: texts,
        source: sourceLocale,
        target: targetLocale,
        format: 'text',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `[GoogleTranslateProvider] Translation request failed (${response.status}): ${errorText}`
      );
    }

    const data = (await response.json()) as {
      data?: {
        translations?: Array<{ translatedText: string }>;
      };
    };

    const translations = data.data?.translations;
    if (!translations || translations.length === 0) {
      return texts;
    }

    return translations.map((t) => t.translatedText);
  }
}
