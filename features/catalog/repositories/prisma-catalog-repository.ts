import { prisma } from '@/lib/prisma';
import type { CatalogRepository } from './catalog-repository';
import type { Product, ProductId } from '../domain/product';
import type { Category } from '../domain/category';
import type { LocalizedContentMap } from '../domain/localized-product';
import { isSupportedLocale, DEFAULT_LOCALE } from '../domain/locale';
import { DEFAULT_CATEGORY } from '../domain/category';
import type { Prisma } from '@prisma/client';

type PrismaProductWithRelations = Prisma.ProductGetPayload<{
  include: {
    category: true;
    translations: true;
  };
}>;

function mapPrismaProductToDomain(record: PrismaProductWithRelations): Product {
  const localizedContent: LocalizedContentMap = {};

  for (const t of record.translations) {
    if (isSupportedLocale(t.locale)) {
      localizedContent[t.locale] = {
        name: t.name,
        description: t.description,
      };
    }
  }

  const defaultContent = localizedContent[DEFAULT_LOCALE] ?? Object.values(localizedContent)[0];

  return {
    id: record.id,
    sku: record.sku,
    slug: record.slug,
    status: record.status as any,
    currency: record.currency,
    categoryId: record.categoryId,
    category: record.category.name,
    price: record.price,
    rating: record.rating,
    reviews: record.reviews,
    stock: record.stock,
    image: record.image,
    accent: record.accent ?? undefined,
    archivedAt: record.archivedAt,
    localizedContent,
    name: defaultContent?.name,
    description: defaultContent?.description,
  };
}

export class PrismaCatalogRepository implements CatalogRepository {
  async getProducts(): Promise<Product[]> {
    try {
      const records = await prisma.product.findMany({
        where: {
          status: 'ACTIVE',
        },
        include: {
          category: true,
          translations: true,
        },
        orderBy: { id: 'asc' },
      });
      return records.map(mapPrismaProductToDomain);
    } catch (err: any) {
      if (err?.code === 'P2021' || err?.message?.includes('does not exist')) {
        console.warn('[Catalog] Product table not yet created in database, returning empty catalog');
        return [];
      }
      throw err;
    }
  }

  async getProductById(idOrSlug: ProductId): Promise<Product | undefined> {
    try {
      const record = await prisma.product.findFirst({
        where: {
          OR: [
            { id: idOrSlug },
            { slug: idOrSlug },
          ],
          status: 'ACTIVE',
        },
        include: {
          category: true,
          translations: true,
        },
      });
      return record ? mapPrismaProductToDomain(record) : undefined;
    } catch (err: any) {
      if (err?.code === 'P2021' || err?.message?.includes('does not exist')) {
        console.warn('[Catalog] Product table not yet created in database, product not found');
        return undefined;
      }
      throw err;
    }
  }

  async getProductsByCategory(category: string): Promise<Product[]> {
    const normalized = category.trim().toLowerCase();
    if (!normalized || normalized === 'semua') {
      return this.getProducts();
    }
    try {
      const records = await prisma.product.findMany({
        where: {
          status: 'ACTIVE',
          category: {
            OR: [
              { id: { equals: normalized, mode: 'insensitive' } },
              { slug: { equals: normalized, mode: 'insensitive' } },
              { name: { equals: category.trim(), mode: 'insensitive' } },
            ],
          },
        },
        include: {
          category: true,
          translations: true,
        },
        orderBy: { id: 'asc' },
      });
      return records.map(mapPrismaProductToDomain);
    } catch (err: any) {
      if (err?.code === 'P2021' || err?.message?.includes('does not exist')) {
        console.warn('[Catalog] Product table not yet created in database, returning empty catalog');
        return [];
      }
      throw err;
    }
  }

  async getCategories(): Promise<Category[]> {
    try {
      const records = await prisma.category.findMany({
        where: {
          status: 'ACTIVE',
        },
        include: {
          translations: true,
        },
        orderBy: { name: 'asc' },
      });
      return [
        { id: 'semua', name: DEFAULT_CATEGORY },
        ...records.map((c) => {
          const transMap: Record<string, { name: string; description?: string | null }> = {};
          for (const t of c.translations) {
            transMap[t.locale] = { name: t.name, description: t.description };
          }
          return {
            id: c.id,
            name: c.name,
            slug: c.slug,
            description: c.description,
            status: c.status as any,
            archivedAt: c.archivedAt,
            translations: transMap,
          };
        }),
      ];
    } catch (err: any) {
      if (err?.code === 'P2021' || err?.message?.includes('does not exist')) {
        console.warn('[Catalog] Category table not yet created in database, returning default category');
        return [{ id: 'semua', name: DEFAULT_CATEGORY }];
      }
      throw err;
    }
  }
}

export const prismaCatalogRepository = new PrismaCatalogRepository();
