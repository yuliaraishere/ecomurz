import { prisma } from '@/lib/prisma';
import { normalizeCouponCode } from '../domain/coupon-normalizer';
import { CreatePromotionInput, Promotion } from '../types';

export class AdminPromotionService {
  async listPromotions(): Promise<Promotion[]> {
    const records = await prisma.promotion.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        targetCategory: { select: { name: true } },
        targetProduct: { select: { id: true } },
      },
    });

    return records.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      description: r.description,
      type: r.type as any,
      value: r.value,
      scope: r.scope as any,
      targetCategoryId: r.targetCategoryId,
      targetProductId: r.targetProductId,
      minOrderAmount: r.minOrderAmount,
      maxDiscountAmount: r.maxDiscountAmount,
      usageLimit: r.usageLimit,
      usageCount: r.usageCount,
      perUserLimit: r.perUserLimit,
      startsAt: r.startsAt,
      expiresAt: r.expiresAt,
      isActive: r.isActive,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  }

  async createPromotion(input: CreatePromotionInput): Promise<Promotion> {
    const normalizedCode = normalizeCouponCode(input.code);
    if (!normalizedCode) {
      throw new Error('Promotion coupon code is required');
    }

    if (!input.name || input.name.trim().length === 0) {
      throw new Error('Promotion name is required');
    }

    if (input.value <= 0) {
      throw new Error('Promotion value must be greater than zero');
    }

    if (input.type === 'PERCENTAGE' && (input.value < 1 || input.value > 100)) {
      throw new Error('Percentage discount value must be between 1 and 100');
    }

    if (input.startsAt >= input.expiresAt) {
      throw new Error('Promotion start date must be before expiration date');
    }

    if (input.scope === 'CATEGORY' && !input.targetCategoryId) {
      throw new Error('Target category is required for category-scoped promotions');
    }

    if (input.scope === 'PRODUCT' && !input.targetProductId) {
      throw new Error('Target product is required for product-scoped promotions');
    }

    const existing = await prisma.promotion.findUnique({
      where: { code: normalizedCode },
    });
    if (existing) {
      throw new Error(`Promotion code "${normalizedCode}" already exists`);
    }

    const record = await prisma.promotion.create({
      data: {
        code: normalizedCode,
        name: input.name.trim(),
        description: input.description?.trim() || null,
        type: input.type,
        value: input.value,
        scope: input.scope,
        targetCategoryId: input.targetCategoryId || null,
        targetProductId: input.targetProductId || null,
        minOrderAmount: input.minOrderAmount ?? 0,
        maxDiscountAmount: input.maxDiscountAmount ?? null,
        usageLimit: input.usageLimit ?? null,
        perUserLimit: input.perUserLimit ?? null,
        startsAt: input.startsAt,
        expiresAt: input.expiresAt,
        isActive: input.isActive ?? true,
      },
    });

    return {
      id: record.id,
      code: record.code,
      name: record.name,
      description: record.description,
      type: record.type as any,
      value: record.value,
      scope: record.scope as any,
      targetCategoryId: record.targetCategoryId,
      targetProductId: record.targetProductId,
      minOrderAmount: record.minOrderAmount,
      maxDiscountAmount: record.maxDiscountAmount,
      usageLimit: record.usageLimit,
      usageCount: record.usageCount,
      perUserLimit: record.perUserLimit,
      startsAt: record.startsAt,
      expiresAt: record.expiresAt,
      isActive: record.isActive,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  async updatePromotionStatus(id: string, isActive: boolean): Promise<Promotion> {
    const record = await prisma.promotion.update({
      where: { id },
      data: { isActive },
    });

    return {
      id: record.id,
      code: record.code,
      name: record.name,
      description: record.description,
      type: record.type as any,
      value: record.value,
      scope: record.scope as any,
      targetCategoryId: record.targetCategoryId,
      targetProductId: record.targetProductId,
      minOrderAmount: record.minOrderAmount,
      maxDiscountAmount: record.maxDiscountAmount,
      usageLimit: record.usageLimit,
      usageCount: record.usageCount,
      perUserLimit: record.perUserLimit,
      startsAt: record.startsAt,
      expiresAt: record.expiresAt,
      isActive: record.isActive,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}

export const adminPromotionService = new AdminPromotionService();
