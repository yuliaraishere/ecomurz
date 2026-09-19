import type { TranslationProvider } from './translation-provider';
import type { SupportedLocale } from '@/features/catalog/domain/locale';

const DICTIONARY: Record<string, Partial<Record<SupportedLocale, string>>> = {
  'ayam kampung segar': {
    id: 'Ayam Kampung Segar',
    en: 'Fresh Free-Range Chicken',
    ja: '新鮮な地鶏（丸鶏）',
    tl: 'Sariwang Katutubong Manok',
    vi: 'Gà Ta Thả Vườn Tươi',
    th: 'ไก่บ้านสดทั้งตัว',
    hi: 'ताज़ा देसी मुर्गा (साबुत)',
    zh: '新鲜优质走地鸡（整只）',
  },
  'paha ayam fillet tanpa tulang': {
    id: 'Paha Ayam Fillet Tanpa Tulang',
    en: 'Boneless Skinless Chicken Thigh Fillet',
    ja: '鶏もも肉フィレ（骨なし・皮なし）',
    tl: 'Walang Butong Pecho ng Manok Fillet',
    vi: 'Thịt Đùi Gà Rút Xương Tươi',
    th: 'เนื้อสะโพกไก่เลาะกระดูก',
    hi: 'हड्डी रहित चिकन थाई फिलेट',
    zh: '去骨去皮新鲜鸡腿肉',
  },
  'daging sapi wagyu a5 slice': {
    id: 'Daging Sapi Wagyu A5 Slice',
    en: 'Japanese Wagyu A5 Beef Slices',
    ja: 'A5等級特選和牛スライス',
    tl: 'Hiniwang Baka na Wagyu A5',
    vi: 'Thịt Bò Wagyu A5 Cắt Lát',
    th: 'เนื้อวัววากิว A5 สไลซ์พรีเมียม',
    hi: 'जापानी वाग्यू A5 बीफ स्लाइस',
    zh: '日本特选A5和牛薄切片',
  },
};

export class MockTranslationProvider implements TranslationProvider {
  readonly name = 'mock' as const;

  async translate(
    text: string,
    _sourceLocale: SupportedLocale | string,
    targetLocale: SupportedLocale | string
  ): Promise<string> {
    const trimmed = text.trim();
    const lower = trimmed.toLowerCase();

    // 1. Check dictionary match
    const dictEntry = DICTIONARY[lower];
    if (dictEntry && dictEntry[targetLocale as SupportedLocale]) {
      return dictEntry[targetLocale as SupportedLocale]!;
    }

    // 2. Fallback simulated translation for tests
    return `[${targetLocale}] ${trimmed}`;
  }

  async translateBatch(
    texts: string[],
    sourceLocale: SupportedLocale | string,
    targetLocale: SupportedLocale | string
  ): Promise<string[]> {
    return Promise.all(
      texts.map((text) => this.translate(text, sourceLocale, targetLocale))
    );
  }
}

export const mockTranslationProvider = new MockTranslationProvider();
