# Step 17 — Product & Catalog Management

## Overview

Step 17 transforms the RUPA marketplace catalog from a read-oriented system into a fully administrable commerce catalog. It introduces product lifecycle management, SKU/slug generation, multilingual content editing, price history tracking, and category administration—all without breaking existing inventory, order, or payment subsystems.

## Architecture

### Separation of Concerns

```
Catalog Management ──── Product CRUD, lifecycle, pricing, translations
Inventory Management ── Stock levels, reservations, adjustments
Order History ────────── Immutable snapshots of purchased items
```

- Product management does not replace the Inventory subsystem.
- Historical `OrderItem` snapshots are never mutated by catalog changes.
- Stock mutations always go through `features/inventory/`, not directly via `Product.stock`.

### Domain Layer

#### State Machine

**Product States:**
```
DRAFT → ACTIVE → ARCHIVED
              ↗
ARCHIVED → ACTIVE
```

**Category States:**
```
ACTIVE ↔ ARCHIVED
```

Invalid transitions throw `InvalidCatalogStateTransitionError`.

#### SKU Normalizer

- Uppercases input, strips non-alphanumeric characters (except hyphens)
- Validates format: 3–50 characters, starts with letter
- Enforces database uniqueness

#### Slug Generator

- Converts names to URL-safe slugs
- Strips diacritics, replaces whitespace with hyphens
- Enforces database uniqueness

### Repository Layer

| Repository | Purpose | Filtering |
|---|---|---|
| `PrismaCatalogRepository` | Public storefront queries | `status = 'ACTIVE'` only |
| `AdminCatalogRepository` | Admin dashboard queries | All statuses, with inventory joins |

`PrismaCatalogRepository` supports lookup by both `id` and `slug` for SEO-friendly URLs.

### Service Layer

#### `AdminCatalogService`

Full CRUD for products and categories:

| Operation | Key Behavior |
|---|---|
| `createProduct` | SKU/slug uniqueness, inventory initialization, initial price history, audit log |
| `updateProduct` | Records `ProductPriceHistory` on price changes, upserts translations |
| `archiveProduct` | Validates state machine, sets `archivedAt` timestamp |
| `restoreProduct` | Validates state machine, clears `archivedAt` |
| `deleteProduct` | Blocked if `OrderItem` records exist (snapshot immutability) |
| `createCategory` | Slug uniqueness, audit log |
| `updateCategory` | Translation upserts, audit log |
| `archiveCategory` | State machine validated |
| `restoreCategory` | State machine validated |
| `deleteCategory` | Blocked if products reference the category |

#### `AdjustInventoryService`

- Updates `Inventory.availableQty` AND `Product.stock` in a single transaction
- Records `CatalogAuditLog` entry for every adjustment

### Checkout Integration

`create-order-service.ts` rejects products with `status !== 'ACTIVE'` at checkout time, preventing purchase of draft or archived items.

## Database Schema

### New Models

```prisma
model CategoryTranslation {
  id         String   @id @default(cuid())
  categoryId String
  locale     String
  name       String
  description String?
  category   Category @relation(fields: [categoryId], references: [id])
  @@unique([categoryId, locale])
}

model ProductPriceHistory {
  id        String   @id @default(cuid())
  productId String
  price     Int
  currency  String   @default("JPY")
  changedBy String?
  changedAt DateTime @default(now())
  product   Product  @relation(fields: [productId], references: [id])
}

model CatalogAuditLog {
  id         String   @id @default(cuid())
  entityType String
  entityId   String
  action     String
  details    Json?
  performedBy String?
  performedAt DateTime @default(now())
}
```

### Modified Models

**Product** — added `sku`, `slug`, `status` (`DRAFT`/`ACTIVE`/`ARCHIVED`), `currency` (`JPY`), `archivedAt`

**Category** — added `slug`, `description`, `status` (`ACTIVE`/`ARCHIVED`), `archivedAt`, `translations` relation

## Admin UI

### Routes

| Route | Description |
|---|---|
| `/admin/products` | Product dashboard with status filter, search, category filter |
| `/admin/products/new` | Product creation form |
| `/admin/products/[id]` | Tabbed product editor |
| `/admin/categories` | Category management with inline editing |

### Product Editor Tabs

1. **General & Pricing** — Name, SKU, slug, price, category, status, image URL
2. **Multilingual Content** — 8-locale switcher (id, en, ja, zh, tl, vi, th, hi) with name/description per locale
3. **Inventory Adjustment** — Current stock display, adjustment form with reason
4. **Price History** — Chronological audit log of all price changes

## Localization

All 8 locale files updated with `Admin.products` and `Admin.categories` translation keys:
- `id`, `en`, `ja`, `zh`, `tl`, `vi`, `th`, `hi`

## Verification

### Test Suite: 66/66 PASSED

| Suite | Tests | Description |
|---|---|---|
| Slug Generator | 4 | URL-safe generation, accent stripping |
| SKU Normalizer | 4 | Uppercase, validation, format enforcement |
| Catalog State Machine | 5 | Valid/invalid transitions for products and categories |
| Database Seed Verification | 5 | SKU, slug, status, currency on seeded products |
| Storefront ACTIVE-only | 3 | Public repository filters non-ACTIVE products |
| Admin Catalog Repository | 6 | Admin queries return all statuses with joins |
| Product Lifecycle & Price | 19 | Full CRUD, price history, translation upsert |
| Inventory Adjustment | 5 | Stock sync, audit logging |
| Category Management | 4 | CRUD, archive/restore, delete protection |
| Snapshot Immutability | 9 | OrderItem price snapshots survive catalog changes |

### Build Verification

- TypeScript compilation: ✓ Pass
- Type checking: ✓ Pass
- Static page generation: Pre-existing `/en/login` route issue (not Step 17 related)

## Files

### New Files

| File | Purpose |
|---|---|
| `features/catalog/domain/slug-generator.ts` | URL-safe slug generation |
| `features/catalog/domain/sku-normalizer.ts` | SKU normalization and validation |
| `features/catalog/domain/catalog-state-machine.ts` | Product/Category lifecycle |
| `features/catalog/repositories/admin-catalog-repository.ts` | Admin dashboard queries |
| `features/catalog/services/admin-catalog-service.ts` | Catalog CRUD operations |
| `features/catalog/actions/admin-catalog-actions.ts` | Server Actions for admin UI |
| `features/inventory/services/adjust-inventory-service.ts` | Stock adjustment service |
| `app/[locale]/admin/products/page.tsx` | Product dashboard |
| `app/[locale]/admin/products/new/page.tsx` | Product creation form |
| `app/[locale]/admin/products/[id]/page.tsx` | Product detail wrapper |
| `app/[locale]/admin/products/[id]/product-editor-client.tsx` | Tabbed product editor |
| `app/[locale]/admin/categories/page.tsx` | Category dashboard |
| `app/[locale]/admin/categories/categories-client.tsx` | Category CRUD client |
| `prisma/migrations/20260909035400_add_product_and_catalog_management/migration.sql` | Schema migration |

### Modified Files

| File | Change |
|---|---|
| `prisma/schema.prisma` | New fields and models |
| `prisma/seed.ts` | FK cascade cleanup, SKU/slug/status/currency |
| `features/catalog/domain/product.ts` | Added sku, slug, status, currency fields |
| `features/catalog/domain/category.ts` | Added slug, description, status, translations |
| `features/catalog/repositories/prisma-catalog-repository.ts` | ACTIVE-only filtering |
| `features/orders/services/create-order-service.ts` | Non-ACTIVE product rejection |
| `components/admin/admin-nav.tsx` | Products/Categories navigation |
| `messages/*.json` (×8) | Admin catalog translation keys |
