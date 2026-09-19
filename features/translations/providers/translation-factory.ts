import type { TranslationProvider } from './translation-provider';
import { mockTranslationProvider } from './mock-translation-provider';
import { GoogleTranslateProvider } from './google-translate-provider';

let translationProviderInstance: TranslationProvider | null = null;

export function getTranslationProvider(): TranslationProvider {
  if (translationProviderInstance) {
    return translationProviderInstance;
  }

  const mode = process.env.TRANSLATION_PROVIDER?.toLowerCase();
  const googleKey = process.env.GOOGLE_TRANSLATE_API_KEY?.trim();

  if (mode === 'google' && googleKey) {
    console.log('[TranslationFactory] Using GoogleTranslateProvider');
    translationProviderInstance = new GoogleTranslateProvider(googleKey);
  } else {
    console.log('[TranslationFactory] Using MockTranslationProvider');
    translationProviderInstance = mockTranslationProvider;
  }

  return translationProviderInstance;
}

export function resetTranslationProvider(): void {
  translationProviderInstance = null;
}
