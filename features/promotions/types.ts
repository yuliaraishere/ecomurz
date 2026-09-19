export type PromotionType = 'PERCENTAGE' | 'FIXED_AMOUNT';
export type PromotionScope = 'ORDER' | 'CATEGORY' | 'PRODUCT';

export interface Promotion {
  id: string;
  code: string;
  name: string;
  description: string | null;
  type: PromotionType;
  value: number; // Percentage (1-100) or Fixed JPY Amount
  scope: PromotionScope;
  targetCategoryId: string | null;
  targetProductId: string | null;
  minOrderAmount: number;
  maxDiscountAmount: number | null;
  usageLimit: number | null;
  usageCount: number;
  perUserLimit: number | null;
  startsAt: Date;
  expiresAt: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PromotionUsage {
  id: string;
  promotionId: string;
  userId: string | null;
  orderId: string;
  discountAmount: number;
  usedAt: Date;
}

export interface CartItemForDiscount {
  productId: string;
  categoryId: string;
  quantity: number;
  price: number; // JPY
  subtotal: number; // quantity * price (JPY)
}

export interface ItemDiscountAllocation {
  productId: string;
  subtotal: number;
  discountAllocation: number; // JPY integer
}

export interface DiscountCalculationResult {
  valid: boolean;
  promotion?: Promotion;
  eligibleSubtotal: number;
  discountAmount: number;
  itemAllocations: ItemDiscountAllocation[];
  errorMessage?: string;
  errorCode?: PromotionErrorCode;
}

export type PromotionErrorCode =
  | 'PROMOTION_NOT_FOUND'
  | 'PROMOTION_INACTIVE'
  | 'PROMOTION_NOT_STARTED'
  | 'PROMOTION_EXPIRED'
  | 'USAGE_LIMIT_EXCEEDED'
  | 'USER_USAGE_LIMIT_EXCEEDED'
  | 'MIN_ORDER_NOT_MET'
  | 'NO_ELIGIBLE_ITEMS'
  | 'INVALID_PROMOTION_CONFIG';

export interface CreatePromotionInput {
  code: string;
  name: string;
  description?: string | null;
  type: PromotionType;
  value: number;
  scope: PromotionScope;
  targetCategoryId?: string | null;
  targetProductId?: string | null;
  minOrderAmount?: number;
  maxDiscountAmount?: number | null;
  usageLimit?: number | null;
  perUserLimit?: number | null;
  startsAt: Date;
  expiresAt: Date;
  isActive?: boolean;
}

export interface UpdatePromotionStatusInput {
  id: string;
  isActive: boolean;
}
