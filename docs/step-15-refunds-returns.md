# Step 15: Refunds, Returns & Cancellation

## 1. Architectural Overview

Step 15 establishes a robust, production-oriented **Refunds, Returns & Cancellation** domain for the RUPA multilingual Asian marketplace.

Building directly upon the foundations established in Steps 8–14 (Supabase Auth, Prisma 6 + PostgreSQL, atomic inventory reservations, order fulfillment state machine, production payment gateways, and courier shipping integration), this architecture enforces a key domain design principle:

> **Cancellation, refund, and return are separate business concepts. They are never collapsed into an overloaded single `Order.status = REFUNDED` state.**

```text
Order (Order Lifecycle)
├── Payment (Payment Lifecycle)
│   └── Refund (Monetary Return Lifecycle: PENDING → SUCCEEDED | FAILED)
├── Shipment (Courier Lifecycle: READY_TO_SHIP → ... → DELIVERED)
├── Cancellation (Order Termination: REQUESTED → APPROVED | REJECTED | CANCELLED)
└── Return (Post-Delivery Goods Return)
    ├── ReturnItem (Item-level quantity & reason tracking)
    └── Refund (Linked monetary refund)
```

---

## 2. Core Domain Components

### 2.1 Cancellation Domain (`features/cancellations`)
- **Domain Policy (`cancellation-policy.ts`)**:
  - `canDirectlyCancel(status)`: Only orders in `PENDING_PAYMENT` can be directly cancelled by the customer.
  - `canRequestCancellation(status)`: Paid pre-shipment orders (`PAID`, `PROCESSING`, `PACKED`) can request cancellation for administrative review.
  - `isCancellationProhibited(status)`: Once an order has entered `SHIPPED` or `DELIVERED`, cancellation is strictly prohibited. For delivered goods, customers must use the Return workflow.
- **Service (`cancellation-service.ts`)**:
  - `cancelUnpaidOrder`: Directly cancels orders before payment collection, immediately releasing `ACTIVE` inventory reservations.
  - `requestCancellation`: Submits customer cancellation request with structured reason and optional customer note. Idempotent on duplicate submissions.
  - `approveCancellation`: Admin approves cancellation, which:
    1. Authoritatively calculates remaining refundable balance.
    2. Processes a full refund via the payment provider.
    3. Restores consumed inventory back to `availableQty` and `Product.stock`.
    4. Transitions order status to `CANCELLED`.
    5. Appends structured entry to `OrderStatusHistory`.
  - `rejectCancellation`: Admin rejects request with operational explanation; order continues normal fulfillment.

### 2.2 Refund Domain (`features/refunds`)
- **Server-Authoritative Balance Calculation**:
  - Computes `refundableAmount = capturedAmount - totalSuccessfulRefunds`.
  - Enforces that any refund amount `amount <= refundableAmount`.
- **Zero-Decimal JPY Authoritative Currency**:
  - Japanese Yen is a zero-decimal currency. All amounts in database, application code, and payment gateway payloads are whole integers without cent multiplication (`amount * 100` is strictly avoided).
- **Payment Provider Refund Abstraction**:
  - `refundPayment` added to `PaymentProvider` interface.
  - `DummyPaymentProvider`: Generates deterministic `DUMMY-REFUND-...` references and completes immediately.
  - `StripePaymentProvider`: Dispatches real Stripe refund requests in zero-decimal JPY with graceful sandbox/offline fallback.
  - Stripe Webhooks: Handles `charge.refunded`, `refund.created`, `refund.updated` idempotently via `PaymentWebhookEvent`.

### 2.3 Return Domain (`features/returns`)
- **Strict Eligibility**:
  - Returns can **only** be initiated when order status is `DELIVERED`.
- **Item-Level Tracking**:
  - Customers can select specific items and quantities to return.
  - Validates that returned quantity does not exceed purchased quantity or the remaining returnable quantity across multiple return requests.
- **Inventory Restoration Timing**:
  - Inventory is **NEVER** restored on return request, approval, or in-transit.
  - Inventory is restored **ONLY** upon physical package receipt and inspection at the warehouse (`RETURN_RECEIVED`).
- **Return Lifecycle State Machine**:
  ```text
  RETURN_REQUESTED → RETURN_APPROVED → RETURN_IN_TRANSIT → RETURN_RECEIVED → COMPLETED
         │                  │                  │
         ├─► RETURN_REJECTED├─► RETURN_CANCELLED└─► RETURN_CANCELLED
         └─► RETURN_CANCELLED
  ```
- **Service (`return-service.ts`)**:
  - `requestReturn`: Submits customer return request for selected order items.
  - `approveReturn`: Admin approves return and notifies customer to dispatch return package.
  - `markReturnInTransit`: Customer or admin records return shipment.
  - `receiveReturn`: Admin receives physical package, restores returned inventory, automatically calculates and processes proportional refund, and completes the return.
  - `rejectReturn`: Admin rejects ineligible return request.
  - `cancelReturn`: Customer or admin cancels pending return request.

---

## 3. Database Schema Extensions (Prisma 6 + PostgreSQL)

```prisma
model Cancellation {
  id           String    @id @default(cuid())
  orderId      String    @unique
  order        Order     @relation(fields: [orderId], references: [id], onDelete: Cascade)
  status       String    @default("REQUESTED") // REQUESTED, APPROVED, REJECTED, CANCELLED
  reason       String
  customerNote String?
  adminNote    String?
  actorType    String    // CUSTOMER, ADMIN, SYSTEM
  actorId      String?
  requestedAt  DateTime  @default(now())
  approvedAt   DateTime?
  rejectedAt   DateTime?
  cancelledAt  DateTime?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  @@index([status])
}

model Refund {
  id               String    @id @default(cuid())
  orderId          String
  order            Order     @relation(fields: [orderId], references: [id], onDelete: Cascade)
  paymentId        String
  payment          Payment   @relation(fields: [paymentId], references: [id], onDelete: Cascade)
  providerRefundId String?   @unique
  amount           Int
  currency         String    @default("JPY")
  reason           String?
  status           String    @default("PENDING") // PENDING, PROCESSING, SUCCEEDED, FAILED, CANCELLED
  returnId         String?
  return           Return?   @relation(fields: [returnId], references: [id], onDelete: SetNull)
  processedAt      DateTime?
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  @@index([orderId])
  @@index([paymentId])
  @@index([providerRefundId])
  @@index([status])
}

model Return {
  id           String       @id @default(cuid())
  orderId      String
  order        Order        @relation(fields: [orderId], references: [id], onDelete: Cascade)
  status       String       @default("RETURN_REQUESTED") // RETURN_REQUESTED, RETURN_APPROVED, RETURN_REJECTED, RETURN_IN_TRANSIT, RETURN_RECEIVED, COMPLETED, RETURN_CANCELLED
  reason       String
  customerNote String?
  adminNote    String?
  requestedAt  DateTime     @default(now())
  approvedAt   DateTime?
  rejectedAt   DateTime?
  receivedAt   DateTime?
  completedAt  DateTime?
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt
  items        ReturnItem[]
  refunds      Refund[]

  @@index([orderId])
  @@index([status])
}

model ReturnItem {
  id          String    @id @default(cuid())
  returnId    String
  return      Return    @relation(fields: [returnId], references: [id], onDelete: Cascade)
  orderItemId String
  orderItem   OrderItem @relation(fields: [orderItemId], references: [id], onDelete: Restrict)
  productId   String
  quantity    Int
  reason      String?
  createdAt   DateTime  @default(now())

  @@index([returnId])
  @@index([orderItemId])
}
```

---

## 4. UI & Multilingual Integration

### 4.1 Customer Storefront (`/transactions/[id]`)
- **Direct Cancel (`PENDING_PAYMENT`)**: Quick one-click cancellation releasing active inventory holds.
- **Request Cancellation Dialog (`PAID`, `PROCESSING`, `PACKED`)**: Modal with structured reason selection (`CHANGED_MIND`, `ORDERED_BY_MISTAKE`, `FOUND_CHEAPER`, `DELIVERY_TOO_LONG`, `OTHER`) and optional customer note.
- **In-Transit Notice (`SHIPPED`)**: Clear guidance explaining that shipped parcels cannot be cancelled and returns must be requested after delivery.
- **Request Return Modal (`DELIVERED`)**: Multi-item selection with remaining returnable quantity caps, condition notes, and reason dropdowns.
- **Return Tracking Cards**: Shows return package status, "Mark In Transit" confirmation, and refund status.
- **Refunds Audit Summary**: Transparent record of refunds credited to customer account.
- **Returns History (`/[locale]/returns`)**: Authenticated, paginated list of every return owned by the current user, including localized status, item quantities, request date, and a link to the source order.

### 4.2 Admin Operations Dashboard (`/admin/orders/[id]`)
- **Cancellation Controls**:
  - Review customer cancellation requests with approve/reject actions.
  - Direct pre-shipment admin cancellation with automatic refund and inventory restock.
- **Returns Management**:
  - List return requests with items and condition notes.
  - Approve or reject return requests.
  - "Receive Return & Restore Stock" action that restocks inventory and triggers proportional refunds.
- **Refunds Audit & Manual Issuance**:
  - Authoritative balance badge showing remaining refundable JPY balance.
  - Manual partial or full refund dialog with client and server balance caps.
- **Global Returns Queue (`/[locale]/admin/returns`)**:
  - Server-authoritative admin access enforcement.
  - Status filters and pagination across all orders.
  - Customer, reason, item, date, and status context with direct links to the actionable order detail.

### 4.3 Return Repository

- `return-repository.ts` defines the data-access contract and list/detail DTOs.
- `prisma-return-repository.ts` implements customer-owned, global admin, and return-by-ID queries.
- Customer ownership is enforced in the database query through the related order's `userId`; the page never fetches another customer's rows and filters them afterward.
- Pagination inputs are normalized and page size is capped at 100.

### 4.4 8-Language Localization
Added complete `Cancellation` and `Return` translation keys across all supported locales:
- `en` (English)
- `id` (Indonesian)
- `ja` (Japanese)
- `tl` (Tagalog)
- `vi` (Vietnamese)
- `th` (Thai)
- `hi` (Hindi)
- `zh` (Chinese)

Detailed design references:

- [`architecture/returns-refunds-architecture.md`](architecture/returns-refunds-architecture.md)
- [`architecture/return-lifecycle.md`](architecture/return-lifecycle.md)
- [`architecture/refund-lifecycle.md`](architecture/refund-lifecycle.md)

---

## 5. Verification & Test Coverage

### Automated Test Suite (`scratch/test-step15-refunds-returns.ts`)
- **Total Assertions**: 81 / 81 Passed (100%)
- **Section 1**: Cancellation Policy & Unpaid Order Cancellation (12/12)
- **Section 2**: Paid Pre-Shipment Cancellation & Stock Restoration (14/14)
- **Section 3**: Refund Domain, Balance Invariants & Providers (11/11)
- **Section 4**: Return Lifecycle & Physical Receipt Stock Restoration (23/23)
- **Section 5**: Repositories & Domain Integration (13/13), including customer ownership scoping, admin status filtering, and return detail relations

### Full System Regression Testing
- **Step 11 (Order Lifecycle)**: 16 / 16 Passed
- **Step 12 (Admin Operations)**: 21 / 21 Passed
- **Step 13 (Multilingual Search & Product Discovery)**: 41 / 41 Passed
- **Step 14 (Shipping & Courier Integration)**: 30 / 30 Passed
- **TypeScript**: `npx tsc --noEmit` completed with code 0.
- **Changed-file lint**: `oxlint` completed with code 0 for all Step 15 files touched by this implementation. The repository-wide lint command still reports unrelated pre-existing debt outside this change.
- **Next.js Production Build**: `npm run build` completed with code 0 and generated 221 localized/static pages plus dynamic routes.
