import { prisma } from '@/lib/prisma';
import { generateSlug } from '../domain/slug-generator';
import { normalizeSku, isValidSku } from '../domain/sku-normalizer';
import {
  ProductStatus,
  CategoryStatus,
  validateProductStatusTransition,
  validateCategoryStatusTransition,
} from '../domain/catalog-state-machine';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '../domain/locale';

export interface CreateProductInput {
  name: string; // Default locale name
  description: string; // Default locale description
  categoryId: string;
  price: number; // Integer JPY
  sku: string;
  slug?: string;
  image: string;
  accent?: string;
  initialStock?: number;
  status?: ProductStatus;
  translations?: Record<string, { name: string; description: string }>;
  adminUserId?: string;
}

export interface UpdateProductInput {
  productId: string;
  name?: string;
  description?: string;
  categoryId?: string;
  price?: number;
  priceChangeReason?: string;
  sku?: string;
  slug?: string;
  image?: string;
  accent?: string;
  status?: ProductStatus;
  translations?: Record<string, { name: string; description: string }>;
  adminUserId?: string;
}

export interface CreateCategoryInput {
  id?: string;
  name: string;
  slug?: string;
  description?: string;
  translations?: Record<string, { name: string; description?: string }>;
  adminUserId?: string;
}

export interface UpdateCategoryInput {
  categoryId: string;
  name?: string;
  slug?: string;
  description?: string;
  status?: CategoryStatus;
  translations?: Record<string, { name: string; description?: string }>;
  adminUserId?: string;
}

export class AdminCatalogService {
  /**
   * Create a new product with default locale and optional multilingual translations,
   * initializing inventory and audit log.
   */
  async createProduct(input: CreateProductInput) {
    const {
      name,
      description,
      categoryId,
      price,
      sku: rawSku,
      image,
      accent,
      initialStock = 0,
      status = 'ACTIVE',
      adminUserId,
    } = input;

    if (!name || name.trim() === '') {
      throw new Error('Product name is required');
    }

    if (price === undefined || price === null || !Number.isInteger(price) || price < 0) {
      throw new Error('Product price must be a non-negative integer (JPY)');
    }

    const sku = normalizeSku(rawSku);
    if (!isValidSku(sku)) {
      throw new Error(`Invalid SKU format: "${rawSku}". Must be at least 3 alphanumeric characters.`);
    }

    // Verify category exists
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });
    if (!category) {
      throw new Error(`Category not found: ${categoryId}`);
    }

    const slug = input.slug?.trim() ? generateSlug(input.slug) : generateSlug(name);
    if (!slug) {
      throw new Error('Generated product slug is empty');
    }

    // Check uniqueness of SKU and Slug
    const [existingSku, existingSlug] = await Promise.all([
      prisma.product.findUnique({ where: { sku } }),
      prisma.product.findUnique({ where: { slug } }),
    ]);

    if (existingSku) {
      throw new Error(`Product with SKU "${sku}" already exists`);
    }
    if (existingSlug) {
      throw new Error(`Product with slug "${slug}" already exists`);
    }

    const productId = slug; // Consistent with existing ID convention, or unique cuid

    return await prisma.$transaction(async (tx) => {
      // 1. Create Product
      const product = await tx.product.create({
        data: {
          id: productId,
          sku,
          slug,
          status,
          currency: 'JPY',
          categoryId,
          price,
          rating: 5.0,
          reviews: 0,
          stock: initialStock,
          image: image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c',
          accent: accent || null,
        },
      });

      // 2. Translations
      const translationsToUpsert = input.translations || {};
      if (!translationsToUpsert[DEFAULT_LOCALE]) {
        translationsToUpsert[DEFAULT_LOCALE] = { name, description };
      }

      for (const [locale, trans] of Object.entries(translationsToUpsert)) {
        if (!SUPPORTED_LOCALES.includes(locale as any)) continue;
        await tx.productTranslation.create({
          data: {
            productId: product.id,
            locale,
            name: trans.name,
            description: trans.description || '',
          },
        });
      }

      // 3. Initialize Inventory
      await tx.inventory.create({
        data: {
          productId: product.id,
          availableQty: initialStock,
          reservedQty: 0,
        },
      });

      // 4. Initial Price History
      await tx.productPriceHistory.create({
        data: {
          productId: product.id,
          previousPrice: price,
          newPrice: price,
          currency: 'JPY',
          changedBy: adminUserId || 'system',
          reason: 'Initial catalog creation',
        },
      });

      // 5. Audit Log
      await tx.catalogAuditLog.create({
        data: {
          entityType: 'PRODUCT',
          entityId: product.id,
          action: 'PRODUCT_CREATED',
          actorId: adminUserId || 'system',
          metadata: JSON.stringify({
            sku,
            slug,
            price,
            initialStock,
            status,
          }),
        },
      });

      return product;
    });
  }

  /**
   * Update an existing product, recording price history if price changes,
   * validating SKU/slug uniqueness, and updating translations.
   */
  async updateProduct(input: UpdateProductInput) {
    const { productId, adminUserId } = input;

    const current = await prisma.product.findUnique({
      where: { id: productId },
      include: { translations: true },
    });

    if (!current) {
      throw new Error(`Product not found: ${productId}`);
    }

    const dataToUpdate: any = {};

    // Validate Status Transition
    if (input.status && input.status !== current.status) {
      validateProductStatusTransition(current.status as ProductStatus, input.status);
      dataToUpdate.status = input.status;
      if (input.status === 'ARCHIVED') {
        dataToUpdate.archivedAt = new Date();
      } else if (input.status === 'ACTIVE' && current.status === 'ARCHIVED') {
        dataToUpdate.archivedAt = null;
      }
    }

    // SKU
    if (input.sku && input.sku !== current.sku) {
      const normalized = normalizeSku(input.sku);
      if (!isValidSku(normalized)) {
        throw new Error(`Invalid SKU: "${input.sku}"`);
      }
      const existing = await prisma.product.findUnique({ where: { sku: normalized } });
      if (existing && existing.id !== productId) {
        throw new Error(`SKU "${normalized}" is already in use by product ${existing.id}`);
      }
      dataToUpdate.sku = normalized;
    }

    // Slug
    if (input.slug && input.slug !== current.slug) {
      const normalizedSlug = generateSlug(input.slug);
      const existing = await prisma.product.findUnique({ where: { slug: normalizedSlug } });
      if (existing && existing.id !== productId) {
        throw new Error(`Slug "${normalizedSlug}" is already in use by product ${existing.id}`);
      }
      dataToUpdate.slug = normalizedSlug;
    }

    // Category
    if (input.categoryId && input.categoryId !== current.categoryId) {
      const category = await prisma.category.findUnique({ where: { id: input.categoryId } });
      if (!category) {
        throw new Error(`Category not found: ${input.categoryId}`);
      }
      dataToUpdate.categoryId = input.categoryId;
    }

    // Metadata
    if (input.image) dataToUpdate.image = input.image;
    if (input.accent !== undefined) dataToUpdate.accent = input.accent;

    // Price change handling
    const isPriceChanged = input.price !== undefined && input.price !== current.price;
    if (isPriceChanged) {
      if (!Number.isInteger(input.price) || (input.price as number) < 0) {
        throw new Error('Price must be a non-negative integer (JPY)');
      }
      dataToUpdate.price = input.price;
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Update Product record
      const updated = await tx.product.update({
        where: { id: productId },
        data: dataToUpdate,
      });

      // 2. Handle Price History
      if (isPriceChanged) {
        await tx.productPriceHistory.create({
          data: {
            productId,
            previousPrice: current.price,
            newPrice: input.price!,
            currency: 'JPY',
            changedBy: adminUserId || 'system',
            reason: input.priceChangeReason || 'Price updated by admin',
          },
        });

        await tx.catalogAuditLog.create({
          data: {
            entityType: 'PRODUCT',
            entityId: productId,
            action: 'PRICE_CHANGED',
            actorId: adminUserId || 'system',
            metadata: JSON.stringify({
              previousPrice: current.price,
              newPrice: input.price,
              reason: input.priceChangeReason || 'Price updated',
            }),
          },
        });
      }

      // 3. Update translations if supplied
      if (input.translations) {
        for (const [locale, trans] of Object.entries(input.translations)) {
          if (!SUPPORTED_LOCALES.includes(locale as any)) continue;
          await tx.productTranslation.upsert({
            where: {
              productId_locale: {
                productId,
                locale,
              },
            },
            create: {
              productId,
              locale,
              name: trans.name,
              description: trans.description || '',
            },
            update: {
              name: trans.name,
              description: trans.description || '',
            },
          });
        }
      } else if (input.name || input.description) {
        // Fallback update default locale translation
        await tx.productTranslation.upsert({
          where: {
            productId_locale: {
              productId,
              locale: DEFAULT_LOCALE,
            },
          },
          create: {
            productId,
            locale: DEFAULT_LOCALE,
            name: input.name || '',
            description: input.description || '',
          },
          update: {
            ...(input.name ? { name: input.name } : {}),
            ...(input.description ? { description: input.description } : {}),
          },
        });
      }

      // 4. Record general audit log
      await tx.catalogAuditLog.create({
        data: {
          entityType: 'PRODUCT',
          entityId: productId,
          action: 'PRODUCT_UPDATED',
          actorId: adminUserId || 'system',
          metadata: JSON.stringify(dataToUpdate),
        },
      });

      return updated;
    });
  }

  /**
   * Archive a product.
   */
  async archiveProduct(productId: string, adminUserId?: string) {
    const current = await prisma.product.findUnique({
      where: { id: productId },
    });
    if (!current) {
      throw new Error(`Product not found: ${productId}`);
    }

    validateProductStatusTransition(current.status as ProductStatus, 'ARCHIVED');

    return await prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({
        where: { id: productId },
        data: {
          status: 'ARCHIVED',
          archivedAt: new Date(),
        },
      });

      await tx.catalogAuditLog.create({
        data: {
          entityType: 'PRODUCT',
          entityId: productId,
          action: 'PRODUCT_ARCHIVED',
          actorId: adminUserId || 'system',
          metadata: JSON.stringify({ previousStatus: current.status }),
        },
      });

      return updated;
    });
  }

  /**
   * Restore an archived product to ACTIVE.
   */
  async restoreProduct(productId: string, adminUserId?: string) {
    const current = await prisma.product.findUnique({
      where: { id: productId },
    });
    if (!current) {
      throw new Error(`Product not found: ${productId}`);
    }

    validateProductStatusTransition(current.status as ProductStatus, 'ACTIVE');

    return await prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({
        where: { id: productId },
        data: {
          status: 'ACTIVE',
          archivedAt: null,
        },
      });

      await tx.catalogAuditLog.create({
        data: {
          entityType: 'PRODUCT',
          entityId: productId,
          action: 'PRODUCT_RESTORED',
          actorId: adminUserId || 'system',
          metadata: JSON.stringify({ previousStatus: current.status }),
        },
      });

      return updated;
    });
  }

  /**
   * Delete product: strictly forbidden if the product has historical OrderItems.
   */
  async deleteProduct(productId: string, adminUserId?: string) {
    const orderItemCount = await prisma.orderItem.count({
      where: { productId },
    });

    if (orderItemCount > 0) {
      throw new Error(
        `Cannot delete product ${productId}: It has ${orderItemCount} historical order items. Products with orders must be ARCHIVED to preserve historical snapshot integrity.`
      );
    }

    return await prisma.$transaction(async (tx) => {
      await tx.inventoryReservation.deleteMany({ where: { productId } });
      await tx.inventory.deleteMany({ where: { productId } });
      await tx.productPriceHistory.deleteMany({ where: { productId } });
      await tx.productTranslation.deleteMany({ where: { productId } });
      const deleted = await tx.product.delete({ where: { id: productId } });

      await tx.catalogAuditLog.create({
        data: {
          entityType: 'PRODUCT',
          entityId: productId,
          action: 'PRODUCT_DELETED',
          actorId: adminUserId || 'system',
          metadata: JSON.stringify({ deletedProductId: productId }),
        },
      });

      return deleted;
    });
  }

  // --- Category Management ---

  async createCategory(input: CreateCategoryInput) {
    const { name, description, adminUserId } = input;
    if (!name || name.trim() === '') {
      throw new Error('Category name is required');
    }

    const slug = input.slug?.trim() ? generateSlug(input.slug) : generateSlug(name);
    const id = input.id?.trim() ? input.id.trim().toLowerCase() : slug;

    const existingSlug = await prisma.category.findFirst({
      where: { OR: [{ id }, { slug }] },
    });

    if (existingSlug) {
      throw new Error(`Category with ID or slug "${id}" already exists`);
    }

    return await prisma.$transaction(async (tx) => {
      const category = await tx.category.create({
        data: {
          id,
          name,
          slug,
          description: description || null,
          status: 'ACTIVE',
        },
      });

      const translationsToUpsert = input.translations || {};
      if (!translationsToUpsert[DEFAULT_LOCALE]) {
        translationsToUpsert[DEFAULT_LOCALE] = { name, description };
      }

      for (const [locale, trans] of Object.entries(translationsToUpsert)) {
        if (!SUPPORTED_LOCALES.includes(locale as any)) continue;
        await tx.categoryTranslation.create({
          data: {
            categoryId: category.id,
            locale,
            name: trans.name,
            description: trans.description || null,
          },
        });
      }

      await tx.catalogAuditLog.create({
        data: {
          entityType: 'CATEGORY',
          entityId: category.id,
          action: 'CATEGORY_CREATED',
          actorId: adminUserId || 'system',
          metadata: JSON.stringify({ name, slug }),
        },
      });

      return category;
    });
  }

  async updateCategory(input: UpdateCategoryInput) {
    const { categoryId, adminUserId } = input;
    const current = await prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!current) {
      throw new Error(`Category not found: ${categoryId}`);
    }

    const dataToUpdate: any = {};

    if (input.name) dataToUpdate.name = input.name;
    if (input.description !== undefined) dataToUpdate.description = input.description;

    if (input.slug && input.slug !== current.slug) {
      const newSlug = generateSlug(input.slug);
      const existing = await prisma.category.findUnique({ where: { slug: newSlug } });
      if (existing && existing.id !== categoryId) {
        throw new Error(`Category slug "${newSlug}" is already in use`);
      }
      dataToUpdate.slug = newSlug;
    }

    if (input.status && input.status !== current.status) {
      validateCategoryStatusTransition(current.status as CategoryStatus, input.status);
      dataToUpdate.status = input.status;
      if (input.status === 'ARCHIVED') {
        dataToUpdate.archivedAt = new Date();
      } else if (input.status === 'ACTIVE') {
        dataToUpdate.archivedAt = null;
      }
    }

    return await prisma.$transaction(async (tx) => {
      const updated = await tx.category.update({
        where: { id: categoryId },
        data: dataToUpdate,
      });

      if (input.translations) {
        for (const [locale, trans] of Object.entries(input.translations)) {
          if (!SUPPORTED_LOCALES.includes(locale as any)) continue;
          await tx.categoryTranslation.upsert({
            where: {
              categoryId_locale: {
                categoryId,
                locale,
              },
            },
            create: {
              categoryId,
              locale,
              name: trans.name,
              description: trans.description || null,
            },
            update: {
              name: trans.name,
              description: trans.description || null,
            },
          });
        }
      }

      await tx.catalogAuditLog.create({
        data: {
          entityType: 'CATEGORY',
          entityId: categoryId,
          action: 'CATEGORY_UPDATED',
          actorId: adminUserId || 'system',
          metadata: JSON.stringify(dataToUpdate),
        },
      });

      return updated;
    });
  }

  async archiveCategory(categoryId: string, adminUserId?: string) {
    return this.updateCategory({
      categoryId,
      status: 'ARCHIVED',
      adminUserId,
    });
  }

  async restoreCategory(categoryId: string, adminUserId?: string) {
    return this.updateCategory({
      categoryId,
      status: 'ACTIVE',
      adminUserId,
    });
  }

  async deleteCategory(categoryId: string, adminUserId?: string) {
    const productCount = await prisma.product.count({
      where: { categoryId },
    });

    if (productCount > 0) {
      throw new Error(
        `Cannot delete category ${categoryId}: It contains ${productCount} products. Archive the category or reassign its products first.`
      );
    }

    return await prisma.$transaction(async (tx) => {
      await tx.categoryTranslation.deleteMany({ where: { categoryId } });
      const deleted = await tx.category.delete({ where: { id: categoryId } });

      await tx.catalogAuditLog.create({
        data: {
          entityType: 'CATEGORY',
          entityId: categoryId,
          action: 'CATEGORY_DELETED',
          actorId: adminUserId || 'system',
          metadata: JSON.stringify({ categoryId }),
        },
      });

      return deleted;
    });
  }
}

export const adminCatalogService = new AdminCatalogService();
