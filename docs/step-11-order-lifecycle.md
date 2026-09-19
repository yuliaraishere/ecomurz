# Step 11: Order Fulfillment, Delivery Lifecycle & Order State Machine

This document outlines the architectural design, lifecycle rules, security model, and integration contracts for the RUPA order fulfillment system.

---

## 1. Order State Machine & Transition Matrix

The order lifecycle is governed by an authoritative state machine in `features/orders/domain/order-state-machine.ts`. Order status cannot be arbitrarily mutated; every transition must satisfy explicit transition rules.

### Allowed Status Transitions

```text
               [Checkout Created]
                        │
                        ▼
                 PENDING_PAYMENT ──────────────► CANCELLED (Customer/System)
                        │
                        ▼ (Payment verified)
                      PAID ────────────────────► CANCELLED (Admin/System)
                        │
                        ▼ (Merchant begins fulfillment)
                   PROCESSING ─────────────────► CANCELLED (Admin/System)
                        │
                        ▼ (Packaging complete)
                     PACKED
                        │
                        ▼ (Dispatched to courier, sets shippedAt & trackingNumber)
                    SHIPPED
                        │
                        ▼ (Courier confirms delivery, sets deliveredAt)
                   DELIVERED
                        │
                        ▼ (Customer confirms receipt, sets completedAt)
                   COMPLETED
```

### Transition Table

| Source Status | Allowed Target Statuses | Triggering Actor |
| :--- | :--- | :--- |
| `PENDING_PAYMENT` | `PAID`, `CANCELLED` | Payment Gateway (`PAID`), Customer / System (`CANCELLED`) |
| `PAID` | `PROCESSING`, `CANCELLED` | Merchant/Admin (`PROCESSING`), Admin (`CANCELLED`) |
| `PROCESSING` | `PACKED`, `CANCELLED` | Merchant/Admin (`PACKED`), Admin (`CANCELLED`) |
| `PACKED` | `SHIPPED` | Merchant/Admin (`SHIPPED`) |
| `SHIPPED` | `DELIVERED` | Courier System (`DELIVERED`) |
| `DELIVERED` | `COMPLETED` | Customer (`COMPLETED`) |
| `COMPLETED` | *(None - Terminal)* | N/A |
| `CANCELLED` | *(None - Terminal)* | N/A |

Any transition not explicitly declared in this table (e.g., `COMPLETED → PROCESSING`, `SHIPPED → CANCELLED`, `PAID → PENDING_PAYMENT`) throws `InvalidOrderTransitionError` and immediately aborts the transaction.

---

## 2. Cancellation Rules & Refund Boundaries

- **Customer Cancellation**:
  - Permitted **exclusively** while an order is in `PENDING_PAYMENT`.
  - Upon cancellation, the active inventory reservation is atomically released (`releaseInventoryService`), returning items to `availableQty`.
- **Post-Payment Cancellation**:
  - Customer cancellation after `PAID` is blocked at the domain layer (`isCustomerCancellable(status) === false`).
  - Because no refund infrastructure exists yet in this step, simulating fake refunds is strictly prohibited.
  - Admin/System cancellation is supported in the service layer for exception handling.

---

## 3. Immutable Order Status History (Audit Trail)

Every state transition writes an immutable audit record to the `OrderStatusHistory` table inside the exact same Prisma transaction as the `Order` update:

```prisma
model OrderStatusHistory {
  id         String   @id @default(cuid())
  orderId    String
  order      Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  fromStatus String?
  toStatus   String
  note       String?
  actorType  String   // CUSTOMER, SYSTEM, ADMIN, PAYMENT, INVENTORY
  actorId    String?
  createdAt  DateTime @default(now())

  @@index([orderId])
  @@index([createdAt])
}
```

Records are append-only; historical entries are never updated or deleted.

---

## 4. Fulfillment Tracking Fields & Timestamp Semantics

The `Order` model includes specific lifecycle timestamps:
- `shippedAt`: Automatically set to `NOW()` upon transitioning `PACKED → SHIPPED`.
- `deliveredAt`: Automatically set to `NOW()` upon transitioning `SHIPPED → DELIVERED`.
- `completedAt`: Automatically set to `NOW()` upon transitioning `DELIVERED → COMPLETED`.
- `cancelledAt`: Automatically set to `NOW()` upon transitioning to `CANCELLED`.
- `trackingNumber`: Stored when `PACKED → SHIPPED` occurs, supporting optional courier references.

---

## 5. Integration Contracts

### Payment Integration (Steps 9 & 10)
- Payment success (`processDummyPaymentService` / `paymentWebhookService`) checks if order is already `PAID`.
- If transitioning `PENDING_PAYMENT → PAID`, it commits physical stock (`consumeInventoryService`) and records an `OrderStatusHistory` record with `actorType: 'PAYMENT'`.
- Duplicate webhook calls execute idempotently without duplicate status or history writes.

### Inventory Integration (Step 10)
- Cancelling a `PENDING_PAYMENT` order triggers `releaseInventoryService`, returning `reservedQty` back to `availableQty` and setting the reservation status to `RELEASED`.

---

## 6. Security & Authorization Model

- **Server-Authoritative**: Client payloads submitting `fromStatus` or arbitrary target statuses are rejected. Current status is always retrieved authoritatively from PostgreSQL.
- **Strict User Isolation**: Customer mutations (`customerCancelOrderAction`, `customerConfirmDeliveryAction`) verify that `order.userId === currentUser.id`. Unauthorized attempts return 404 / `UNAUTHORIZED`.
- **Zero Client Trust**: All mutations run in atomic Prisma database transactions.

---

## 7. Legacy Order Compatibility

- Historical orders containing Step 8 statuses (such as `Diproses`) are safely normalized via `normalizeLegacyOrderStatus()` to `PROCESSING` at domain and UI boundaries.
- Historical database records are preserved without destructive mutations.

---

## 8. Future Roadmap

- **Admin Fulfillment Portal**: Step 11 fulfills the service layer contracts (`markOrderAsProcessing`, `markOrderAsPacked`, `markOrderAsShipped`, etc.) with `actorType: 'ADMIN'`, ready for the future admin UI.
- **Refund Integration**: When a real payment gateway (Stripe/Midtrans) is introduced, the `PAID → CANCELLED` transition can be integrated with an automated refund provider.
