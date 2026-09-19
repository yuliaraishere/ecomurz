# Returns, Refunds, and Cancellation Architecture

## Boundaries

The feature deliberately separates three concerns:

- **Cancellation** stops an order before shipment. Paid cancellations require admin review, refund processing, and inventory restoration.
- **Return** tracks physical goods after delivery, down to order-item quantity.
- **Refund** tracks money returned through a payment provider. It may originate from a cancellation, a received return, or an authorized manual adjustment.

An order remains the aggregate that connects these records, but each concern owns its own status and timestamps. This avoids overloading `Order.status` with financial or reverse-logistics state.

## Request and Data Flow

```text
Customer /returns ── user-scoped query ─┐
                                        ├─ ReturnRepository ── Prisma ── PostgreSQL
Admin /admin/returns ─ global query ─────┘

Customer/Admin action
  → authenticated server action
  → cancellation, return, or refund service
  → domain policy/state-machine validation
  → transactional persistence + inventory/payment side effects
  → route revalidation (/returns, /admin/returns, order detail)
```

## Authorization

- Customer return listings constrain the Prisma query by `order.userId`.
- Customer mutations resolve the current user on the server; authenticated requests are checked against order ownership, while guest-order flows continue to rely on their existing public-order reference behavior.
- Admin queue access and admin mutations call `requireAdmin`, which resolves the authoritative role from PostgreSQL.
- Client-provided status, refund balance, and inventory quantities are never authoritative.

## Repository Contract

`ReturnRepository` exposes:

- `getReturnsByUserId(userId, params)` for the customer history page.
- `getAllReturns(params)` for the admin operations queue.
- `getReturnById(returnId)` for detail workflows and future integrations.

The Prisma implementation loads the order snapshot, return items and their historical order-item data, plus linked refunds. List methods share normalized pagination and optional status filtering.

## Consistency Rules

- Return requests never restore inventory.
- Inventory is restored only when the warehouse receives a return.
- Refund amount is bounded by captured payment minus successful prior refunds.
- Refund and inventory mutations are performed through domain services, not page components or repositories.
- Inventory restoration services are idempotent.
