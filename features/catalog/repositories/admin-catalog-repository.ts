import { prisma } from '@/lib/prisma';
import type { Product } from '../domain/product';
import type { Category } from '../domain/category';
import type { ProductStatus, CategoryStatus } from '../domain/catalog-state-machine';
import type { LocalizedContentMap } from '../domain/localized-product';
import { isSupportedLocale, DEFAULT_LOCALE } from '../domain/locale';
import type { Prisma } from '@prisma/client';

export interface ListAdminProductsParams {
  status?: string; // 'all' | 'DRAFT' | 'ACTIVE' | 'ARCHIVED'
  categoryId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface AdminProductListItem extends Product {
  availableQty: number;
  reservedQty: number;
  orderItemCount: number;
}

export interface AdminProductDetail extends AdminProductListItem {
  priceHistory: {
    id: string;
    previousPrice: number;
    newPrice: number;
    currency: string;
    changedBy: string | null;
    reason: string | null;
    createdAt: Date;
  }[];
}

export interface AdminCategoryItem extends Category {
  productCount: number;
}

function mapProductTranslations(translations: { locale: string; name: string; description: string }[]): LocalizedContentMap {
  const localizedContent: LocalizedContentMap = {};
  for (const t of translations) {
    if (isSupportedLocale(t.locale)) {
      localizedContent[t.locale] = {
        name: t.name,
        description: t.description,
      };
    }
  }
  return localizedContent;
}

export class AdminCatalogRepository {
  async listProducts(params: ListAdminProductsParams = {}): Promise<{ products: AdminProductListItem[]; total: number }> {
    const page = Math.max(1, params.page || 1);
    const pageSize = Math.max(1, params.pageSize || 50);
    const skip = (page - 1) * pageSize;

    const where: Prisma.ProductWhereInput = {};

    if (params.status && params.status !== 'all') {
      where.status = params.status.toUpperCase();
    }

    if (params.categoryId && params.categoryId !== 'all') {
      where.categoryId = params.categoryId;
    }

    if (params.search) {
      const q = params.search.trim();
      where.OR = [
        { id: { contains: q, mode: 'insensitive' } },
        { sku: { contains: q, mode: 'insensitive' } },
        { slug: { contains: q, mode: 'insensitive' } },
        { translations: { some: { name: { contains: q, mode: 'insensitive' } } } },
      ];
    }

    const [total, records] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        include: {
          category: true,
          translations: true,
          inventory: true,
          _count: {
            select: { orderItems: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
    ]);

    const products = records.map((record) => {
      const localizedContent = mapProductTranslations(record.translations);
      const defaultContent = localizedContent[DEFAULT_LOCALE] ?? Object.values(localizedContent)[0];

      return {
        id: record.id,
        sku: record.sku,
        slug: record.slug,
        status: record.status as ProductStatus,
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
        availableQty: record.inventory?.availableQty ?? record.stock,
        reservedQty: record.inventory?.reservedQty ?? 0,
        orderItemCount: record._count.orderItems,
      };
    });

    return { products, total };
  }

  async getProductById(idOrSlug: string): Promise<AdminProductDetail | null> {
    const record = await prisma.product.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }, { sku: idOrSlug }],
      },
      include: {
        category: true,
        translations: true,
        inventory: true,
        priceHistory: {
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { orderItems: true },
        },
      },
    });

    if (!record) return null;

    const localizedContent = mapProductTranslations(record.translations);
    const defaultContent = localizedContent[DEFAULT_LOCALE] ?? Object.values(localizedContent)[0];

    return {
      id: record.id,
      sku: record.sku,
      slug: record.slug,
      status: record.status as ProductStatus,
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
      availableQty: record.inventory?.availableQty ?? record.stock,
      reservedQty: record.inventory?.reservedQty ?? 0,
      orderItemCount: record._count.orderItems,
      priceHistory: record.priceHistory,
    };
  }

  async listCategories(): Promise<AdminCategoryItem[]> {
    const records = await prisma.category.findMany({
      include: {
        translations: true,
        _count: {
          select: { products: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return records.map((c) => {
      const transMap: Record<string, { name: string; description?: string | null }> = {};
      for (const t of c.translations) {
        transMap[t.locale] = { name: t.name, description: t.description };
      }
      return {
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        status: c.status as CategoryStatus,
        archivedAt: c.archivedAt,
        translations: transMap,
        productCount: c._count.products,
      };
    });
  }

  async getCategoryById(idOrSlug: string): Promise<AdminCategoryItem | null> {
    const record = await prisma.category.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      include: {
        translations: true,
        _count: {
          select: { products: true },
        },
      },
    });

    if (!record) return null;

    const transMap: Record<string, { name: string; description?: string | null }> = {};
    for (const t of record.translations) {
      transMap[t.locale] = { name: t.name, description: t.description };
    }

    return {
      id: record.id,
      name: record.name,
      slug: record.slug,
      description: record.description,
      status: record.status as CategoryStatus,
      archivedAt: record.archivedAt,
      translations: transMap,
      productCount: record._count.products,
    };
  }
}

export const adminCatalogRepository = new AdminCatalogRepository();
