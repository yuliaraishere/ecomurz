# Step 13: Production Payment Gateway Integration & Payment Reliability

## 1. Architectural Overview

Step 13 hardens and production-readies the payment subsystem of the RUPA multilingual Asian marketplace. It standardizes currency on **Japanese Yen (JPY)** across the entire stack, preserves and extends the `PaymentProvider` abstraction, introduces a server-authoritative **Provider Factory**, implements a production-ready **Stripe Payment Provider** with cryptographic webhook signature verification and zero-decimal currency handling, provides database-backed **Webhook Idempotency** via a new `PaymentWebhookEvent` table, and adds an authoritative **Return Reconciliation** landing page.

```text
                               ┌────────────────────────────────┐
                               │     Customer Checkout Form     │
                               └───────────────┬────────────────┘
                                               │ createOrderAction()
                                               ▼
                               ┌────────────────────────────────┐
                               │       createOrderService       │
                               └───────────────┬────────────────┘
                                               │
                                               ▼
                               ┌────────────────────────────────┐
                               │     getPaymentProvider()       │
                               │  (PAYMENT_PROVIDER=dummy|stripe│
                               └───────┬────────────────┬───────┘
                                       │                │
                        provider=dummy │                │ provider=stripe
                                       ▼                ▼
                         ┌───────────────────┐    ┌───────────────────┐
                         │DummyPaymentProvide│    │StripePaymentProvid│
                         │(Sandbox Simulation│    │(Zero-decimal JPY) │
                         └─────────┬─────────┘    └─────────┬─────────┘
                                   │                        │
                                   ▼                        ▼
                         ┌────────────────────────────────────┐
                         │   Pending Order & Payment Record   │
                         │  - currency: "JPY"                 │
                         │  - status: "PENDING"               │
                         │  - providerPaymentId (session ID)  │
                         └─────────────────┬──────────────────┘
                                           │
         ┌─────────────────────────────────┴─────────────────────────────────┐
         ▼                                                                   ▼
┌─────────────────────────────────┐                       ┌─────────────────────────────────────┐
│  Authoritative Webhook Handler  │                       │   Authoritative Return Reconcile    │
│    /api/payments/webhook        │                       │  /[locale]/payments/[id]/return     │
├─────────────────────────────────┤                       ├─────────────────────────────────────┤
│ 1. Verify HMAC-SHA256 signature │                       │ 1. Server fetches session status    │
│ 2. Check PaymentWebhookEvent    │                       │ 2. Avoid trusting URL query params  │
│    idempotency table            │                       │ 3. Atomic transition to PAID/FAILED │
│ 3. Atomic stock consume/release │                       │ 4. Atomic stock consume/release     │
│ 4. Log OrderStatusHistory       │                       │ 5. Render verified UI with receipt  │
└─────────────────────────────────┘                       └─────────────────────────────────────┘
```

---

## 2. Currency Standardization on Japanese Yen (JPY)

All previous residual currencies (such as `'IDR'`) have been eliminated across schema definitions, database records, order creation, repositories, and UI.

### Database Schema Updates
In `prisma/schema.prisma`:
```prisma
model Payment {
  id                String    @id @default(cuid())
  orderId           String
  provider          String    // "dummy" | "stripe" | etc.
  providerPaymentId String?   @unique
  status            String    // "PENDING" | "PROCESSING" | "PAID" | "FAILED" | "EXPIRED" | "CANCELLED" | "REFUNDED"
  amount            Int
  currency          String    @default("JPY")
  paidAt            DateTime?
  failedAt          DateTime?
  expiredAt         DateTime?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  order             Order     @relation(fields: [orderId], references: [id], onDelete: Cascade)

  @@index([orderId])
  @@index([status])
}
```

- **Migration**: `20260909012752_add_payment_hardening_and_webhook_events` applied to Supabase PostgreSQL.
- **Repositories & Actions Updated**:
  - `prisma-order-repository.ts`: Defaults payment creation currency to `'JPY'`.
  - `process-dummy-payment-service.ts`: Uses `'JPY'` and sets `paidAt`/`failedAt`.
  - `payment-actions.ts`: Uses `'JPY'` and exposes timestamp fields.
  - Storefront and Checkout: Formatted via `formatPrice` / `formatYen` (`ja-JP`, `JPY`, 0 decimals).

---

## 3. Payment Provider Abstraction & Provider Factory

### The PaymentProvider Interface
In `features/payments/providers/payment-provider.ts`:
```typescript
export interface PaymentProvider {
  readonly providerName: string;

  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult>;
  handleWebhook(
    payload: unknown,
    headers?: Record<string, string | string[] | undefined>
  ): Promise<WebhookResult>;
}
```

### Provider Factory
In `features/payments/providers/provider-factory.ts`:
- Resolves payment provider dynamically via `getPaymentProvider(providerName?)`.
- Reads `process.env.PAYMENT_PROVIDER` (defaults to `'dummy'`).
- Supports runtime registration via `registerPaymentProvider(name, provider)`.
- Gracefully falls back to `dummyPaymentProvider` if an unknown provider name is requested.

### Stripe Payment Provider (`StripePaymentProvider`)
In `features/payments/providers/stripe-payment-provider.ts`:
1. **Zero-Decimal JPY**:
   Japanese Yen does not have cents/sub-units. The provider sends `unit_amount: Math.round(input.amount)` without multiplying by 100, while multi-decimal currencies (like USD/EUR) are multiplied by 100.
2. **Sandbox Fallback Mode**:
   If `STRIPE_SECRET_KEY` is not present in the environment, the provider operates in a resilient sandbox mode, generating a `cs_test_` session reference and redirecting safely without throwing errors.
3. **Cryptographic Webhook Signature Verification**:
   When `STRIPE_WEBHOOK_SECRET` is configured, verifies the `stripe-signature` header (`t=...,v1=...`) using Node.js `crypto.createHmac('sha256', secret)` and `crypto.timingSafeEqual` to prevent timing attacks.
4. **Event Normalization**:
   - `checkout.session.completed` → `PAID`
   - `checkout.session.expired` → `EXPIRED`
   - `payment_intent.payment_failed` / `checkout.session.async_payment_failed` → `FAILED`

---

## 4. Database-Backed Webhook Idempotency

External gateways frequently send duplicate webhook deliveries due to network retries. To ensure absolute safety against duplicate stock consumption or multiple state transitions, Step 13 introduces a dedicated idempotency table in PostgreSQL.

### PaymentWebhookEvent Schema
In `prisma/schema.prisma`:
```prisma
model PaymentWebhookEvent {
  id          String   @id @default(cuid())
  provider    String
  eventId     String
  eventType   String
  processedAt DateTime @default(now())

  @@unique([provider, eventId])
  @@index([provider])
}
```

### Atomic Processing in `PaymentService.processWebhook`
1. Provider verifies signature and parses `eventId`, `providerPaymentId`, and `status`.
2. Checks `prisma.paymentWebhookEvent.findUnique({ where: { provider_eventId: { provider, eventId } } })`. If already present, returns `{ received: true, processed: true, message: 'Idempotent' }`.
3. Inside a single `prisma.$transaction`:
   - Inserts the `PaymentWebhookEvent` record.
   - If `PAID`: calls `consumeInventoryService({ orderId, tx })`, sets `payment.status = 'PAID'`, `payment.paidAt = new Date()`, updates `order.status = 'PAID'`, and writes an `OrderStatusHistory` entry (`actorType: 'PAYMENT'`).
   - If `FAILED` or `EXPIRED`: calls `releaseInventoryService({ orderId, tx })`, sets `payment.status` and `failedAt` or `expiredAt`.

---

## 5. Payment State Machine & Retry Lifecycle

The payment entity has a distinct lifecycle supporting retries:

```text
    ┌──────────┐
    │ PENDING  │◄────────────┐ (Retry Payment / New Attempt)
    └────┬─────┘             │
         │                   │
         ├───────────────────┤
         ▼                   │
    ┌──────────┐             │
    │PROCESSING│             │
    └────┬─────┘             │
         ├──────────────┐    │
         ▼              ▼    │
     ┌──────┐      ┌─────────┴┐
     │ PAID │      │  FAILED  │ / EXPIRED
     └──────┘      └──────────┘
```

- **Atomic Re-reservation**: When retrying payment for an order whose previous reservation expired or was released on failure, `PaymentService.createOrRetryPayment` checks if active reservations exist. If missing, it calls `reserveInventoryService` to atomically re-reserve inventory before creating the new `PENDING` payment attempt.
- **Stock Depletion Protection**: If stock was consumed by another customer in the interim, the retry operation throws an `InsufficientStockError`, returning `{ success: false, error: 'INSUFFICIENT_STOCK' }` without leaving dangling payments.

---

## 6. Authoritative Return URL Reconciliation

When a user finishes payment on an external gateway, the gateway redirects back to:
`/[locale]/payments/[id]/return?session_id=...&provider=...`

### Security Guarantees
- The return endpoint **never trusts client URL parameters** such as `?status=success`.
- The server component `app/[locale]/payments/[id]/return/page.tsx` executes authoritative status reconciliation via `paymentService.reconcilePayment({ orderPublicId: id, providerPaymentId: session_id, providerName })`.
- If the payment is confirmed:
  - Consumes inventory.
  - Transitions order and payment to `PAID`.
  - Sets `paidAt` timestamp.
  - Renders a clean success card (`PaymentReturnView`) with order total in JPY, gateway provider badge, gateway reference, and direct link to the order fulfillment timeline (`/transactions/${id}`).
- If the payment is unconfirmed, expired, or failed:
  - Renders failure notice with a single-click "Coba Bayar Lagi / Retry Payment" button that invokes `retryOrderPaymentAction` and redirects directly to a fresh gateway checkout session.

---

## 7. Verification & Automated Test Suite

The implementation was validated using automated test suites covering all edge cases:

### Step 13 Test Suite (`scratch/test-step13-payment-gateway.ts` — 23/23 Passing):
1. **DB Currency Verification**: Schema and Payment model default to `JPY`.
2. **Provider Interface Conformance**: Dummy and Stripe providers implement all `PaymentProvider` methods.
3. **Provider Factory (Default)**: Resolves Dummy provider when `PAYMENT_PROVIDER` is unset.
4. **Provider Factory (Explicit Stripe)**: Resolves Stripe provider when requested.
5. **Provider Factory Fallback**: Gracefully falls back to Dummy on unknown provider name.
6. **Custom Provider Registration**: Dynamic provider registration via `registerPaymentProvider`.
7. **Stripe Zero-Decimal JPY**: Correctly avoids `* 100` multiplication for JPY.
8. **Stripe Multi-Decimal Standard**: Correctly multiplies USD/EUR by 100.
9. **Stripe Sandbox Fallback**: Operates cleanly without `STRIPE_SECRET_KEY`.
10. **Stripe Webhook HMAC-SHA256 Signature**: Valid signature header passes cryptographic verification.
11. **Stripe Webhook Tampered Rejection**: Tampered payload fails verification.
12. **Stripe Event Mapping (Completed)**: `checkout.session.completed` maps to `PAID`.
13. **Stripe Event Mapping (Expired)**: `checkout.session.expired` maps to `EXPIRED`.
14. **Stripe Event Mapping (Failed)**: `payment_intent.payment_failed` maps to `FAILED`.
15. **Database Idempotency**: `PaymentWebhookEvent` table catches duplicate events and prevents duplicate processing.
16. **Webhook Success Lifecycle**: Synchronizes order to `PAID`, consumes inventory, logs `actorType: 'PAYMENT'`.
17. **Webhook Failure Lifecycle**: Transitions payment to `FAILED`, releases inventory reservations.
18. **Payment Retry Lifecycle**: Atomically re-reserves stock and creates new `PENDING` JPY payment attempt.
19. **Payment Retry Out of Stock Guard**: Gracefully aborts with `INSUFFICIENT_STOCK` when stock is depleted.
20. **Authoritative Return Reconciliation**: Server-side verification updates DB without trusting client parameters.
21. **Order Creation Service Integration**: `createOrderService` integrates provider factory and JPY.
22. **Admin Order Detail Inspection**: Admin query returns JPY currency and `paidAt` timestamp.
23. **Webhook API Route E2E**: Webhook API service processes payload and headers idempotently.

### Regression Test Suites:
- `scratch/test-step11-order-lifecycle.ts`: **16/16 tests passing**.
- `scratch/test-step12-admin-operations.ts`: **21/21 tests passing**.
- Production Build: `npm run build` completed with **0 errors**, generating all 148 static and dynamic routes.
