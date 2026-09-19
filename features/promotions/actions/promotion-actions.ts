'use server';

import { getCurrentUser } from '@/features/auth/services/current-user';
import { requireAdmin } from '@/features/auth/services/require-admin';
import { promotionEngine } from '../services/promotion-engine';
import { adminPromotionService } from '../services/admin-promotion-service';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import type { CartItemForDiscount, CreatePromotionInput } from '../types';

export async function validateCouponAction(
  code: string,
  clientItems: Array<{ productId: string; quantity: number }>
) {
  try {
    const user = await getCurrentUser();

    if (!clientItems || clientItems.length === 0) {
      return {
        success: false,
        errorMessage: 'Cart is empty',
      };
    }

    // Look up real product prices and category IDs from DB
    const productIds = clientItems.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, categoryId: true, price: true },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    const cartItemsForDiscount: CartItemForDiscount[] = [];
    for (const item of clientItems) {
      const p = productMap.get(item.productId);
      if (!p) continue;
      cartItemsForDiscount.push({
        productId: p.id,
        categoryId: p.categoryId,
        quantity: item.quantity,
        price: p.price,
        subtotal: p.price * item.quantity,
      });
    }

    const result = await promotionEngine.validateAndCalculateDiscount(
      code,
      cartItemsForDiscount,
      user?.id
    );

    if (!result.valid) {
      return {
        success: false,
        errorCode: result.errorCode,
        errorMessage: result.errorMessage,
      };
    }

    return {
      success: true,
      code: result.promotion?.code,
      name: result.promotion?.name,
      type: result.promotion?.type,
      value: result.promotion?.value,
      discountAmount: result.discountAmount,
      eligibleSubtotal: result.eligibleSubtotal,
    };
  } catch (error: any) {
    return {
      success: false,
      errorMessage: error.message || 'Failed to validate coupon',
    };
  }
}

export async function adminCreatePromotionAction(input: CreatePromotionInput) {
  await requireAdmin();
  const created = await adminPromotionService.createPromotion(input);
  revalidatePath('/admin/promotions');
  return { success: true, promotion: created };
}

export async function adminUpdatePromotionStatusAction(id: string, isActive: boolean) {
  await requireAdmin();
  const updated = await adminPromotionService.updatePromotionStatus(id, isActive);
  revalidatePath('/admin/promotions');
  return { success: true, promotion: updated };
}

export async function adminListPromotionsAction() {
  await requireAdmin();
  return await adminPromotionService.listPromotions();
}
