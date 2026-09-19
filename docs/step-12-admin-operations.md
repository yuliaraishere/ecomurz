# Step 12: Admin Operations Dashboard & Order Management

## 1. Architectural Overview

Step 12 introduces a dedicated administrative operations surface for the RUPA marketplace. The admin dashboard allows authorized administrators to monitor operational health, inspect customer orders, advance fulfillment stages through the Step 11 state machine, inspect real-time inventory and stock holds, and track the immutable audit trail.

```text
                               ┌─────────────────────────┐
                               │  Browser (Admin / User) │
                               └────────────┬────────────┘
                                            │ Session Cookies (JWT)
                                            ▼
                               ┌─────────────────────────┐
                               │       middleware.ts     │
                               └────────────┬────────────┘
                                            │ Checks /:locale/admin
                                            ▼
                               ┌─────────────────────────┐
                               │    app/[locale]/admin   │
                               │  layout.tsx (Server)    │
                               └────────────┬────────────┘
                                            │ Calls requireAdmin()
                                            ▼
                               ┌─────────────────────────┐
                               │  Supabase Auth + Prisma │
                               │  User.role === 'ADMIN'  │
                               └───────┬───────────┬─────┘
                     Authorized (ADMIN)│           │ Unauthorized / Customer
                                       ▼           ▼
                   ┌────────────────────────┐  ┌────────────────────────┐
                   │   Admin Operations UI  │  │   AdminAccessDenied    │
                   │  - Dashboard Metrics   │  │   (403 Forbidden Page) │
                   │  - Paginated Orders    │  └────────────────────────┘
                   │  - Order Detail        │
                   │  - Inventory Overview  │
                   └───────────┬────────────┘
                               │ State Transitions / Queries
                               ▼
        ┌────────────────────────────────────────────────────────┐
        │                 Domain Services Layer                  │
        │  - transitionOrderService()   (State Machine Validated)│
        │  - adminOrderRepository       (Filtered & Paginated)   │
        │  - adminInventoryRepository   (Authoritative Stock)    │
        └──────────────────────────┬─────────────────────────────┘
                                   │
                                   ▼
        ┌────────────────────────────────────────────────────────┐
        │                PostgreSQL (Supabase)                   │
        │  - User (role: CUSTOMER | ADMIN)                       │
        │  - Order (with status, tracking, fulfillment dates)    │
        │  - OrderStatusHistory (actorType: ADMIN, actorId)      │
        │  - Inventory & InventoryReservation                    │
        └────────────────────────────────────────────────────────┘
```

---

## 2. Authorization & User Roles

### Database Representation
In `prisma/schema.prisma`:
```prisma
model User {
  id        String   @id
  role      String   @default("CUSTOMER")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  orders    Order[]

  @@index([role])
}
```

- **Default Role**: All existing and newly created users receive `role: "CUSTOMER"`.
- **Migration**: `20260909010740_add_user_role_and_admin_indexes` applied safely with `@default("CUSTOMER")`.
- **Centralized Guard**:
  - `requireAdmin()` in `features/auth/services/require-admin.ts`:
    1. Authenticates session via Supabase server client (`auth.getUser()`).
    2. Queries PostgreSQL `User` record to resolve authoritative `role`.
    3. Throws `UnauthorizedError` if unauthenticated, or `ForbiddenError` if `role !== 'ADMIN'`.
  - Never trusts client-side parameters, cookies, or request bodies for role determination.

---

## 3. Admin Routing & Structure

Admin routes are organized under the localized path pattern `/[locale]/admin`:

| Route | Purpose | Access Control |
| :--- | :--- | :--- |
| `/[locale]/admin` | Operational Overview & KPI Summary Cards | `requireAdmin()` |
| `/[locale]/admin/orders` | Paginated Order List with Search & Filters | `requireAdmin()` |
| `/[locale]/admin/orders/[id]` | Full Order Inspection & Fulfillment Action Controls | `requireAdmin()` |
| `/[locale]/admin/inventory` | Real-time Inventory Health & Low-Stock Alerts | `requireAdmin()` |

Non-admin access (both unauthenticated visitors and customers) renders `AdminAccessDenied` without leaking administrative data or internal order details.

---

## 4. Operational Dashboard & KPI Metrics

Calculated directly from authoritative PostgreSQL database state (no client-side caches):
- **Pending Payments**: Orders in `PENDING_PAYMENT` status.
- **Paid Orders**: Orders in `PAID` awaiting warehouse picking.
- **Processing Orders**: Orders in `PROCESSING` currently being picked.
- **Packed Orders**: Orders in `PACKED` ready for courier dispatch.
- **Shipped Orders**: Orders in `SHIPPED` with courier in transit.
- **Delivered Orders**: Orders in `DELIVERED` awaiting customer acceptance.
- **Completed Orders**: Orders in `COMPLETED` terminal status.
- **Cancelled Orders**: Orders in `CANCELLED` terminal status.
- **Low Stock Products**: Products where `availableQty <= LOW_STOCK_THRESHOLD` (`5`).
- **Out of Stock Products**: Products where `availableQty === 0`.

---

## 5. Order Management & Server-Side Filtering

- **Server-Side Pagination**: Configurable page size (default: 15), total records, and page navigation.
- **Search Capabilities**:
  - `publicId` (e.g. `RUPA-...`)
  - Recipient customer name (case-insensitive substring match)
  - Recipient customer phone number
  - Courier tracking number
- **Filters**:
  - Fulfillment status (`PENDING_PAYMENT`, `PAID`, `PROCESSING`, `PACKED`, `SHIPPED`, `DELIVERED`, `COMPLETED`, `CANCELLED`, or `ALL`)
  - Payment status (`PENDING`, `PAID`, `FAILED`, `CANCELLED`, or `ALL`)
  - Date range (`today`, `last7days`, `last30days`, or `all`)
  - Shipping method

---

## 6. Fulfillment Controls & State Machine Integration

All administrative status transitions pass through the authoritative domain service `transitionOrderService`:
- `PAID` → `PROCESSING`: Dispatched to warehouse staff for picking.
- `PROCESSING` → `PACKED`: Packaged with items verified.
- `PACKED` → `SHIPPED`: Courier tracking number attached and `shippedAt` timestamp set.
- `SHIPPED` → `DELIVERED`: Delivery confirmed by courier and `deliveredAt` timestamp set.
- `DELIVERED` → `COMPLETED`: Administrative or customer confirmation; `completedAt` timestamp set.
- `PENDING_PAYMENT` → `CANCELLED`: Permitted cancellation; releases reserved inventory back to available stock.
- **Cancellation Boundary**: Orders in `PAID`, `PROCESSING`, `PACKED`, `SHIPPED`, or `DELIVERED` cannot be cancelled from the UI without an active refund provider.
- **No Arbitrary Prisma Updates**: Direct mutations like `prisma.order.update({ data: { status } })` from UI components are strictly prohibited.

---

## 7. Status History & Actor Attribution

Every transition appends an immutable row to `OrderStatusHistory`:
- `actorType: 'ADMIN'`
- `actorId: authenticatedAdmin.id`
- `fromStatus` and `toStatus`
- `note`: Operational context or custom administrative note
- `createdAt`: Authoritative UTC timestamp

---

## 8. Inventory Visibility & Low Stock Alerts

Implemented via `adminInventoryRepository.getInventoryOverview()`:
- **Authoritative Stock Counts**: Direct from `Inventory.availableQty` and `Inventory.reservedQty`.
- **Active Hold Counts**: Number of active reservations currently holding stock for pending orders.
- **Configurable Low-Stock Threshold**: Defined centrally via `LOW_STOCK_THRESHOLD` (default: 5) in `features/inventory/config.ts`.
- **Read-Only Scope**: For Step 12, the inventory page is strictly read-only to preserve concurrency safety and transactional guarantees.

---

## 9. Customer vs. Admin Data Separation

- **Customer Boundaries**: Customers interact via `features/orders/actions/get-my-orders-action.ts` and `prismaOrderRepository.getOrdersByUserId(user.id)`, ensuring isolation where customers only see their own orders.
- **Admin Boundaries**: Administrative order queries (`adminOrderRepository`) and mutations (`features/orders/actions/admin-order-actions.ts`) strictly execute `requireAdmin()` on the server.

---

## 10. Future Roadmap

1. **Manual Inventory Adjustments**: Audited inventory replenishment service with transaction logs and reason codes.
2. **Refunds & Payment Gateway**: Controlled post-payment cancellation and partial/full refunds when real payment providers are integrated.
3. **Courier API Integration**: Automated tracking number validation and live parcel tracking webhooks.
4. **Analytics & Financial Reporting**: Revenue reports, average order value (AOV), and cohort analysis.
