# Production Smoke Test Checklist — RUPA Marketplace

This document provides a systematic verification checklist to validate a newly deployed preview or production environment on Vercel.

---

## 1. Storefront & Multilingual Routing

Verify homepage and localized routing renders properly across all 8 supported locales:
- [ ] Indonesian: `https://[DOMAIN]/id`
- [ ] English: `https://[DOMAIN]/en`
- [ ] Japanese: `https://[DOMAIN]/ja`
- [ ] Tagalog: `https://[DOMAIN]/tl`
- [ ] Vietnamese: `https://[DOMAIN]/vi`
- [ ] Thai: `https://[DOMAIN]/th`
- [ ] Hindi: `https://[DOMAIN]/hi`
- [ ] Chinese: `https://[DOMAIN]/zh`

---

## 2. Multilingual Search & Discovery

Verify searching in any language resolves to the single canonical product concept (`ayam-kampung-segar`):
- [ ] Search `"ayam"` (ID) -> resolves to *Ayam Kampung Segar*
- [ ] Search `"chicken"` (EN) -> resolves to *Fresh Free-Range Chicken*
- [ ] Search `"鶏"` (JA) -> resolves to *新鮮な地鶏*
- [ ] Search `"manok"` (TL) -> resolves to *Sariwang Manok*
- [ ] Search `"gà"` (VI) -> resolves to *Thịt Gà Tươi*
- [ ] Search `"ไก่"` (TH) -> resolves to *ไก่บ้านสด*
- [ ] Search `"मुर्गा"` (HI) -> resolves to *ताजा चिकन*
- [ ] Search `"走地鸡"` (ZH) -> resolves to *新鲜走地鸡*

---

## 3. Shopping Cart & Inventory Validation

- [ ] Add item to cart from product page (`/products/[id]`).
- [ ] Verify cart count badge updates in header.
- [ ] Increase quantity, decrease quantity, and remove item from cart (`/cart`).
- [ ] Verify attempt to add more than available stock is rejected with clear error message.

---

## 4. Checkout & Order Lifecycle

- [ ] Fill shipping recipient form with address, phone, and postal code.
- [ ] Apply valid coupon code (e.g. `WELCOME10`), verify discount calculation in JPY.
- [ ] Select shipping courier method and payment provider (QRIS / Credit Card / Dummy).
- [ ] Place order -> verify order transitions to `PENDING_PAYMENT` and stock is reserved.
- [ ] Complete payment -> verify order transitions to `PAID` and inventory is consumed.
- [ ] Verify order confirmation email is dispatched.

---

## 5. Fulfillment, Shipping & Returns

- [ ] Log in as Admin (`/admin/orders`).
- [ ] Advance order status: `PAID` -> `PROCESSING` -> `PACKED` -> `SHIPPED` (assign tracking number).
- [ ] Advance order status: `SHIPPED` -> `DELIVERED`.
- [ ] Log in as Customer (`/transactions/[id]`).
- [ ] Submit Return Request for delivered order.
- [ ] Log in as Admin (`/admin/returns`), approve return and mark received.
- [ ] Verify proportional refund is created and inventory restored.

---

## 6. Admin Analytics & Reporting

- [ ] Access `/admin/analytics`.
- [ ] Switch period filters (`TODAY`, `LAST_7_DAYS`, `THIS_MONTH`, `THIS_YEAR`).
- [ ] Verify KPI cards show integer JPY calculations without floats or NaN.
- [ ] Download CSV export for each dataset (Sales, Products, Orders, Refunds, Inventory, Promotions) and verify formula injection escaping.

---

## 7. REST APIs & Health Check

- [ ] `GET /api/health` returns `200 OK` with `{ "ok": true, "status": "healthy" }`.
- [ ] `GET /api/products` returns paginated product listings.
- [ ] `GET /api/products/ayam-kampung-segar?locale=ja` returns localized Japanese product details.
- [ ] `GET /api/search?q=chicken` returns matching canonical results.
- [ ] `GET /api/orders` unauthenticated returns `401 UNAUTHORIZED`.
