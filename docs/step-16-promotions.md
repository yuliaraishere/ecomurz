# Step 16: Promotions & Coupons Architecture

## Overview

Step 16 implements a production-grade **Promotions & Coupons Subsystem** for the RUPA multilingual Asian marketplace. It introduces coupon validation, server-authoritative discount calculation, integer proportional item allocation, atomic usage tracking with concurrency locks, checkout UI integration, partial return refund adjustments, and admin promotion operations across all 8 supported locales.

---

## 1. Architectural Principles

1. **Server-Authoritative Calculation**:
   - The client UI may preview promotions and submit coupon codes, but the server alone validates eligibility against the PostgreSQL database and calculates discounts, subtotals, and totals.
2. **Canonical Marketplace Currency (JPY)**:
   - All arithmetic uses integer math (`Math.floor`). No floating-point rounding errors, no cents, and no currency conversion artifacts.
   - Percentage discounts use: `Math.floor((eligibleSubtotal * promotion.value) / 100)`.
3. **Single Coupon Policy**:
   - Exactly one coupon can be applied per order (no coupon stacking).
4. **Integer Proportional Allocation**:
   - When a promotion applies to multiple cart items, the total discount is allocated proportionally to each eligible item's subtotal using floor arithmetic and remainder distribution, guaranteeing:
     $$\sum \text{item.discountAllocation} = \text{order.discountAmount}$$
     $$\text{item.discountAllocation} \le \text{item.subtotal}$$
5. **Partial Refund / Return Invariant**:
   - When items are returned, the customer is refunded their actual net paid amount:
     $$\text{netItemRefund} = \text{item.productPrice} \times \text{qty} - \left\lfloor \frac{\text{item.discountAllocation} \times \text{qty}}{\text{item.quantity}} \right\rfloor$$
   - The customer is never refunded the full undiscounted original price for a discounted item.
6. **Concurrency-Safe Usage Quotas**:
   - Promotions with global usage limits lock the promotion record with PostgreSQL `FOR UPDATE` inside the order creation transaction to prevent race conditions and over-allocation.
   - Per-user limits check `PromotionUsage` records linked to the authenticated user ID.
7. **Unpaid Cancellation Rollback**:
   - When an unpaid order (`PENDING_PAYMENT`) is cancelled, the `PromotionUsage` slot is released, and `Promotion.usageCount` is decremented so quotas and limits are returned to the pool.

---

## 2. Database Schema (Prisma)

### `Promotion` Model
- `id`: Unique cuid identifier.
- `code`: Normalized coupon code (unique, uppercase, trimmed).
- `name`: Display name of promotion.
- `description`: Optional promotion details.
- `type`: `PERCENTAGE` or `FIXED_AMOUNT`.
- `value`: Percentage integer (1–100) or fixed amount in JPY.
- `scope`: `ORDER`, `CATEGORY`, or `PRODUCT`.
- `targetCategoryId`: Foreign key to `Category` (optional, for category scope).
- `targetProductId`: Foreign key to `Product` (optional, for product scope).
- `minOrderAmount`: Minimum merchandise subtotal required (JPY).
- `maxDiscountAmount`: Maximum discount cap (JPY).
- `usageLimit`: Total global redemptions allowed (null for unlimited).
- `usageCount`: Current redemptions count.
- `perUserLimit`: Maximum redemptions per authenticated user.
- `startsAt` / `expiresAt`: Validity time window.
- `isActive`: Boolean activation switch.

### `PromotionUsage` Model
- `id`: Unique cuid identifier.
- `promotionId`: Reference to `Promotion`.
- `userId`: Reference to `User` (optional for guests).
- `orderId`: Unique reference to `Order`.
- `discountAmount`: JPY discount amount recorded.
- `usedAt`: Timestamp.

### Changes to Existing Models
- `Order`:
  - `discountAmount`: JPY integer discount (default 0).
  - `promotionId`: Optional foreign key to `Promotion`.
  - `couponCode`: Normalized coupon code string.
- `OrderItem`:
  - `discountAllocation`: JPY integer discount allocated to this item snapshot (default 0).

---

## 3. Directory Structure

```text
features/promotions/
├── domain/
│   ├── coupon-normalizer.ts        # Case-insensitive whitespace-trimmed normalization
│   └── promotion-allocator.ts      # Integer proportional discount distribution with remainder resolution
├── services/
│   ├── promotion-engine.ts         # Validation, discount computation, atomic usage, and rollback
│   └── admin-promotion-service.ts  # Admin promotion creation, status toggles, and listing
├── actions/
│   └── promotion-actions.ts        # Server Actions (validateCouponAction, admin actions)
├── types.ts                        # TypeScript interfaces & error codes
└── index.ts                        # Barrel export

components/
├── checkout/
│   └── coupon-input.tsx            # Customer checkout coupon input and badge
└── admin/
    ├── admin-nav.tsx               # Admin navigation with Promotions tab
    ├── admin-promotion-controls.tsx # Admin promotion creation modal
    └── admin-promotion-toggle.tsx  # Interactive active/inactive toggle button

app/[locale]/
├── checkout/page.tsx               # Checkout page with live discount calculation and summary
└── admin/promotions/page.tsx       # Admin promotion management dashboard
```

---

## 4. Verification & Testing

- **Comprehensive Test Suite**: `scratch/test-step16-promotions.ts` (66/66 assertions passed)
  - Unit tests for coupon code normalization
  - Integer proportional allocation and remainder distribution
  - Percentage, fixed, capped, min-order, inactive, expired, scheduled, scoped validation
  - Concurrency locks and per-user usage limits
  - Full end-to-end order creation with discount persistence
  - Unpaid order cancellation and usage rollback
  - Partial return net refund invariant
  - Admin promotion creation, status toggling, and listing
- **Regression Test Suites**:
  - Step 15 (`scratch/test-step15-refunds-returns.ts`): 76/76 assertions passed
  - Step 14 (`scratch/test-step14-shipping.ts`): 30/30 assertions passed
  - Step 13 (`scratch/test-step13-payment-gateway.ts`): 23/23 assertions passed
  - Step 12 (`scratch/test-step12-admin-operations.ts`): 21/21 assertions passed
  - Step 11 (`scratch/test-step11-order-lifecycle.ts`): 16/16 assertions passed
- **Next.js Production Build**:
  - `npm run build` completed with 0 errors across 157 static and dynamic routes.
