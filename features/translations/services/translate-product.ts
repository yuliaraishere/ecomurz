import { prisma } from '@/lib/prisma';
import type { Product } from '@/features/catalog/domain/product';
import { SUPPORTED_LOCALES, DEFAULT_LOCALE, type SupportedLocale } from '@/features/catalog/domain/locale';
import { getTranslationProvider } from '../providers/translation-factory';
import { indexProduct } from '@/features/search/services/index-product';

export interface TranslateProductResult {
  productId: string;
  generatedLocales: SupportedLocale[];
  updatedProduct: Product;
}

/**
 * Ensures a product has localized content across all 8 supported locales.
 * Generates missing translations using the configured TranslationProvider,
 * persists them to the database, and updates the search index.
 */
export async function ensureProductTranslations(
  product: Product
): Promise<TranslateProductResult> {
  const provider = getTranslationProvider();
  const sourceLocale = DEFAULT_LOCALE;
  const sourceContent =
    product.localizedContent?.[sourceLocale] ??
    Object.values(product.localizedContent ?? {})[0] ?? {
      name: product.name || product.id,
      description: product.description || '',
    };

  const updatedLocalizedContent = { ...(product.localizedContent ?? {}) };
  const generatedLocales: SupportedLocale[] = [];

  for (const locale of SUPPORTED_LOCALES) {
    const existing = updatedLocalizedContent[locale];
    if (!existing || !existing.name || existing.name.trim().length === 0) {
      // Translate name and description
      const [translatedName, translatedDesc] = await Promise.all([
        provider.translate(sourceContent.name, sourceLocale, locale),
        sourceContent.description
          ? provider.translate(sourceContent.description, sourceLocale, locale)
          : Promise.resolve(''),
      ]);

      updatedLocalizedContent[locale] = {
        name: translatedName,
        description: translatedDesc,
      };
      generatedLocales.push(locale);

      // Persist to database if Prisma is available and product exists in DB
      if (process.env.DATABASE_URL && process.env.CATALOG_REPOSITORY_MODE !== 'mock') {
        try {
          const productExists = await prisma.product.findUnique({
            where: { id: product.id },
            select: { id: true },
          });

          if (productExists) {
            await prisma.productTranslation.upsert({
              where: {
                productId_locale: {
                  productId: product.id,
                  locale,
                },
              },
              create: {
                productId: product.id,
                locale,
                name: translatedName,
                description: translatedDesc,
              },
              update: {
                name: translatedName,
                description: translatedDesc,
              },
            });
          }
        } catch (dbErr) {
          console.warn(`[TranslateProduct] Failed to persist translation for ${product.id} (${locale}):`, dbErr);
        }
      }
    }
  }

  const updatedProduct: Product = {
    ...product,
    localizedContent: updatedLocalizedContent,
  };

  // Synchronize search index with the newly translated content
  await indexProduct(updatedProduct);

  return {
    productId: product.id,
    generatedLocales,
    updatedProduct,
  };
}
