import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { normalizeCouponCode } from '../domain/coupon-normalizer';
import { allocateDiscountAcrossItems } from '../domain/promotion-allocator';
import {
  CartItemForDiscount,
  DiscountCalculationResult,
  Promotion,
  PromotionErrorCode,
} from '../types';

export class PromotionEngine {
  /**
   * Validates a coupon code against a list of cart items and optional user.
   * Computes eligible subtotal, discount amount, and proportional item allocations.
   */
  async validateAndCalculateDiscount(
    code: string | null | undefined,
    items: CartItemForDiscount[],
    userId?: string | null,
    tx?: Prisma.TransactionClient
  ): Promise<DiscountCalculationResult> {
    const normalizedCode = normalizeCouponCode(code);
    if (!normalizedCode) {
      return {
        valid: false,
        eligibleSubtotal: 0,
        discountAmount: 0,
        itemAllocations: items.map((i) => ({
          productId: i.productId,
          subtotal: i.subtotal,
          discountAllocation: 0,
        })),
        errorCode: 'PROMOTION_NOT_FOUND',
        errorMessage: 'Invalid or missing coupon code',
      };
    }

    const client = tx || prisma;

    const promoRecord = await client.promotion.findUnique({
      where: { code: normalizedCode },
    });

    if (!promoRecord) {
      return {
        valid: false,
        eligibleSubtotal: 0,
        discountAmount: 0,
        itemAllocations: items.map((i) => ({
          productId: i.productId,
          subtotal: i.subtotal,
          discountAllocation: 0,
        })),
        errorCode: 'PROMOTION_NOT_FOUND',
        errorMessage: `Coupon "${normalizedCode}" does not exist`,
      };
    }

    const promotion: Promotion = {
      id: promoRecord.id,
      code: promoRecord.code,
      name: promoRecord.name,
      description: promoRecord.description,
      type: promoRecord.type as any,
      value: promoRecord.value,
      scope: promoRecord.scope as any,
      targetCategoryId: promoRecord.targetCategoryId,
      targetProductId: promoRecord.targetProductId,
      minOrderAmount: promoRecord.minOrderAmount,
      maxDiscountAmount: promoRecord.maxDiscountAmount,
      usageLimit: promoRecord.usageLimit,
      usageCount: promoRecord.usageCount,
      perUserLimit: promoRecord.perUserLimit,
      startsAt: promoRecord.startsAt,
      expiresAt: promoRecord.expiresAt,
      isActive: promoRecord.isActive,
      createdAt: promoRecord.createdAt,
      updatedAt: promoRecord.updatedAt,
    };

    const emptyAllocations = items.map((i) => ({
      productId: i.productId,
      subtotal: i.subtotal,
      discountAllocation: 0,
    }));

    if (!promotion.isActive) {
      return {
        valid: false,
        promotion,
        eligibleSubtotal: 0,
        discountAmount: 0,
        itemAllocations: emptyAllocations,
        errorCode: 'PROMOTION_INACTIVE',
        errorMessage: `Coupon "${normalizedCode}" is currently inactive`,
      };
    }

    const now = new Date();
    if (now < promotion.startsAt) {
      return {
        valid: false,
        promotion,
        eligibleSubtotal: 0,
        discountAmount: 0,
        itemAllocations: emptyAllocations,
        errorCode: 'PROMOTION_NOT_STARTED',
        errorMessage: `Coupon "${normalizedCode}" is not active yet`,
      };
    }

    if (now > promotion.expiresAt) {
      return {
        valid: false,
        promotion,
        eligibleSubtotal: 0,
        discountAmount: 0,
        itemAllocations: emptyAllocations,
        errorCode: 'PROMOTION_EXPIRED',
        errorMessage: `Coupon "${normalizedCode}" has expired`,
      };
    }

    // Global usage limit check
    if (promotion.usageLimit !== null && promotion.usageCount >= promotion.usageLimit) {
      return {
        valid: false,
        promotion,
        eligibleSubtotal: 0,
        discountAmount: 0,
        itemAllocations: emptyAllocations,
        errorCode: 'USAGE_LIMIT_EXCEEDED',
        errorMessage: `Coupon "${normalizedCode}" has reached its maximum usage limit`,
      };
    }

    // Per-user usage limit check
    if (userId && promotion.perUserLimit !== null) {
      const userUsageCount = await client.promotionUsage.count({
        where: {
          promotionId: promotion.id,
          userId: userId,
        },
      });

      if (userUsageCount >= promotion.perUserLimit) {
        return {
          valid: false,
          promotion,
          eligibleSubtotal: 0,
          discountAmount: 0,
          itemAllocations: emptyAllocations,
          errorCode: 'USER_USAGE_LIMIT_EXCEEDED',
          errorMessage: `You have already used coupon "${normalizedCode}" the maximum number of times`,
        };
      }
    }

    // Determine eligible items based on scope
    const eligibleIndices = new Set<number>();
    let eligibleSubtotal = 0;
    let orderSubtotal = 0;

    items.forEach((item, index) => {
      orderSubtotal += item.subtotal;
      let isEligible = false;

      if (promotion.scope === 'ORDER') {
        isEligible = true;
      } else if (promotion.scope === 'CATEGORY') {
        isEligible = Boolean(promotion.targetCategoryId && item.categoryId === promotion.targetCategoryId);
      } else if (promotion.scope === 'PRODUCT') {
        isEligible = Boolean(promotion.targetProductId && item.productId === promotion.targetProductId);
      }

      if (isEligible) {
        eligibleIndices.add(index);
        eligibleSubtotal += item.subtotal;
      }
    });

    if (eligibleIndices.size === 0 || eligibleSubtotal <= 0) {
      return {
        valid: false,
        promotion,
        eligibleSubtotal: 0,
        discountAmount: 0,
        itemAllocations: emptyAllocations,
        errorCode: 'NO_ELIGIBLE_ITEMS',
        errorMessage: `No items in cart qualify for coupon "${normalizedCode}"`,
      };
    }

    // Check minimum order subtotal requirement
    if (orderSubtotal < promotion.minOrderAmount) {
      return {
        valid: false,
        promotion,
        eligibleSubtotal,
        discountAmount: 0,
        itemAllocations: emptyAllocations,
        errorCode: 'MIN_ORDER_NOT_MET',
        errorMessage: `Minimum order amount of ¥${promotion.minOrderAmount.toLocaleString()} required to use coupon "${normalizedCode}"`,
      };
    }

    // Compute raw discount amount
    let rawDiscount = 0;
    if (promotion.type === 'PERCENTAGE') {
      rawDiscount = Math.floor((eligibleSubtotal * promotion.value) / 100);
    } else {
      rawDiscount = promotion.value;
    }

    // Apply max discount amount cap if specified
    if (promotion.maxDiscountAmount !== null && rawDiscount > promotion.maxDiscountAmount) {
      rawDiscount = promotion.maxDiscountAmount;
    }

    // Cap discount at eligible subtotal (never exceed eligible items total)
    const effectiveDiscount = Math.min(rawDiscount, eligibleSubtotal);

    // Allocate discount across items proportionally
    const itemAllocations = allocateDiscountAcrossItems(items, eligibleIndices, effectiveDiscount);

    return {
      valid: true,
      promotion,
      eligibleSubtotal,
      discountAmount: effectiveDiscount,
      itemAllocations,
    };
  }

  /**
   * Concurrency-safe promotion usage reservation during order creation.
   * Locks the promotion row FOR UPDATE to verify usage limits and increment usageCount.
   */
  async recordPromotionUsage(
    tx: Prisma.TransactionClient,
    orderId: string,
    promotionId: string,
    discountAmount: number,
    userId?: string | null
  ): Promise<void> {
    // Row-level lock to prevent concurrent over-usage
    const [promo] = await tx.$queryRaw<Array<{ id: string; usageCount: number; usageLimit: number | null }>>`
      SELECT id, "usageCount", "usageLimit" FROM "Promotion" WHERE id = ${promotionId} FOR UPDATE
    `;

    if (!promo) {
      throw new Error(`Promotion ${promotionId} not found during usage recording`);
    }

    if (promo.usageLimit !== null && promo.usageCount >= promo.usageLimit) {
      throw new Error('Promotion usage limit reached');
    }

    if (userId) {
      const promoFull = await tx.promotion.findUnique({
        where: { id: promotionId },
        select: { perUserLimit: true },
      });

      if (promoFull?.perUserLimit !== null && promoFull?.perUserLimit !== undefined) {
        const userUsageCount = await tx.promotionUsage.count({
          where: {
            promotionId,
            userId,
          },
        });

        if (userUsageCount >= promoFull.perUserLimit) {
          throw new Error('Per-user promotion usage limit exceeded');
        }
      }
    }

    // Increment usage count on promotion
    await tx.promotion.update({
      where: { id: promotionId },
      data: {
        usageCount: { increment: 1 },
      },
    });

    // Create usage record
    await tx.promotionUsage.create({
      data: {
        promotionId,
        orderId,
        userId: userId || null,
        discountAmount,
      },
    });
  }

  /**
   * Releases promotion usage when an unpaid order is cancelled.
   * Decrements usageCount, removes the PromotionUsage record, and clears order promotion fields.
   */
  async releasePromotionUsage(
    tx: Prisma.TransactionClient,
    orderId: string
  ): Promise<void> {
    const usage = await tx.promotionUsage.findUnique({
      where: { orderId },
    });

    if (!usage) {
      return;
    }

    // Decrement usage count on promotion
    await tx.promotion.update({
      where: { id: usage.promotionId },
      data: {
        usageCount: { decrement: 1 },
      },
    });

    // Delete usage record
    await tx.promotionUsage.delete({
      where: { orderId },
    });

    // Clear promotion fields on order
    await tx.order.update({
      where: { id: orderId },
      data: {
        promotionId: null,
        couponCode: null,
        discountAmount: 0,
      },
    });
  }
}

export const promotionEngine = new PromotionEngine();
