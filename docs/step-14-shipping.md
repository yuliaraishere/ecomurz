# Step 14: Shipping & Courier Integration

## 1. Architectural Overview

Step 14 introduces the **Shipping & Courier Integration** subsystem for the RUPA multilingual Asian marketplace. Building directly on the production payment architecture (Step 13), order fulfillment state machine (Step 11), and admin operational dashboard (Step 12), this module decouples courier fulfillment from core order persistence using an extensible provider abstraction.

The subsystem is server-authoritative for all shipping rates and courier operations. The client checkout interface requests quotes dynamically from the server; all final calculations and rate validations execute against the registered `ShippingProvider` on the backend.

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
                               │     getShippingProvider()      │
                               │  (SHIPPING_PROVIDER=dummy|...) │
                               └───────┬────────────────────────┘
                                       │
                                       ▼
                         ┌───────────────────────────┐
                         │   DummyShippingProvider   │
                         │ (Deterministic JPY Rates) │
                         │   REGULAR:  ¥180          │
                         │   EXPRESS:  ¥360          │
                         │   SAME_DAY: ¥520          │
                         └─────────────┬─────────────┘
                                       │
                                       ▼
                         ┌───────────────────────────┐
                         │   Pending / Paid Order    │
                         │ - shippingMethodId: '...' │
                         │ - shippingPrice: ¥360     │
                         │ - currency: 'JPY'         │
                         └─────────────┬─────────────┘
                                       │ (Payment Success -> PAID)
                                       ▼
                         ┌───────────────────────────┐
                         │      shippingService      │
                         │     .createShipment()     │
                         └─────────────┬─────────────┘
                                       │
                                       ▼
                         ┌───────────────────────────┐
                         │      Shipment Record      │
                         │  - status: READY_TO_SHIP  │
                         │  - tracking: RUPA-TRK-... │
                         │  - orderId: 1:1 relation  │
                         └───────┬───────────┬───────┘
                                 │           │
           ┌─────────────────────┘           └────────────────────┐
           ▼                                                      ▼
┌───────────────────────────────┐               ┌────────────────────────────────────┐
│   Carrier Simulation / Admin  │               │    Courier Webhook Event Stream    │
│  - adminCreateShipmentAction  │               │        /api/shipping/webhook       │
│  - adminSimulateShipmentAction│               │  - Provider signature verification │
│  - Transition lifecycle       │               │  - ShippingWebhookEvent idempotency│
└───────────────────────────────┘               │  - Order & Shipment sync           │
                                                └────────────────────────────────────┘
```

---

## 2. Database Schema Extensions

### 1. `Shipment` Model
Linked via a strict 1:1 unique relation to `Order`:
```prisma
model Shipment {
  id                 String    @id @default(cuid())
  orderId            String    @unique
  order              Order     @relation(fields: [orderId], references: [id], onDelete: Cascade)
  provider           String    @default("dummy")
  providerShipmentId String?   @unique
  serviceCode        String
  serviceName        String
  trackingNumber     String?   @unique
  status             String    @default("READY_TO_SHIP")
  shippingCost       Int
  currency           String    @default("JPY")
  estimatedDelivery  DateTime?
  shippedAt          DateTime?
  deliveredAt        DateTime?
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt

  @@index([orderId])
  @@index([trackingNumber])
  @@index([status])
  @@index([provider])
}
```

### 2. `ShippingWebhookEvent` Model
Provides cryptographic, database-enforced idempotency for all incoming shipping webhooks:
```prisma
model ShippingWebhookEvent {
  id          String   @id @default(cuid())
  provider    String
  eventId     String
  eventType   String
  processedAt DateTime @default(now())

  @@unique([provider, eventId])
  @@index([provider])
}
```

Migration `20260909015935_add_shipment_and_shipping_webhook_events` was applied without data loss to Supabase PostgreSQL.

---

## 3. Shipping Provider Abstraction & Architecture

Located cleanly under `features/shipping/`:
- `types.ts`: Domain models (`ShipmentStatus`, `ShippingRateOption`, `ShipmentRecord`, `TrackingResult`, etc.).
- `providers/shipping-provider.ts`: Abstract `ShippingProvider` contract:
  - `getRates(input: GetShippingRatesInput): Promise<GetShippingRatesResult>`
  - `createShipment(input: CreateShipmentInput): Promise<CreateShipmentResult>`
  - `getTracking(input: { trackingNumber: string }): Promise<TrackingResult>`
  - `handleWebhook(payload: unknown, headers?: Record<string, string | string[] | undefined>): Promise<ShippingWebhookResult>`
- `providers/dummy-shipping-provider.ts`: High-fidelity courier simulation with deterministic Japanese Yen rates, dynamic tracking ID generation (`RUPA-TRK-XXXX-YYYY`), and event simulator.
- `providers/shipping-provider-factory.ts`: Dynamic factory pattern inspecting `process.env.SHIPPING_PROVIDER` with safe fallback to `dummy`.
- `domain/shipment-state-machine.ts`: Deterministic transition matrix and validation helpers:
  - `PENDING` → `READY_TO_SHIP` | `CANCELLED`
  - `READY_TO_SHIP` → `SHIPPED` | `CANCELLED`
  - `SHIPPED` → `IN_TRANSIT` | `DELIVERY_FAILED` | `RETURNED`
  - `IN_TRANSIT` → `OUT_FOR_DELIVERY` | `DELIVERY_FAILED` | `RETURNED`
  - `OUT_FOR_DELIVERY` → `DELIVERED` | `DELIVERY_FAILED` | `RETURNED`
  - Terminal statuses: `DELIVERED`, `CANCELLED`, `RETURNED`.
- `services/shipping-service.ts`: Core orchestrator managing atomic persistence, payment eligibility guards, order state synchronization, and idempotency.
- `actions/shipping-actions.ts`: Next.js Server Actions for checkout rates, tracking, and admin simulator.

---

## 4. Server-Authoritative Shipping Rates

In `features/orders/services/create-order-service.ts`:
1. The server receives user items and delivery address.
2. It requests rates from `getShippingProvider().getRates({ address, items })`.
3. The selected rate option (`regular`, `express`, `same_day`) is matched server-side and its exact price is injected into the order total.
4. Any client attempt to tamper with shipping fees or totals is ignored.

Deterministic JPY Rates:
- **REGULAR**: ¥180 (2–3 business days)
- **EXPRESS**: ¥360 (1–2 business days)
- **SAME_DAY**: ¥520 (Same day delivery in Tokyo/Kanto)

---

## 5. Shipment Eligibility Guard

Orders must have a verified payment before a shipment can be created:
- **Eligible**: `PAID`, `PROCESSING`, `PACKED`.
- **Ineligible**: `PENDING_PAYMENT` (rejected with `ORDER_UNPAID`), `CANCELLED` (rejected with `ORDER_CANCELLED`), `FAILED`.

---

## 6. Courier Webhook & Synchronization

Route: `/api/shipping/webhook`
- Accepts `POST` requests with raw JSON body and headers.
- Resolves the provider via factory.
- Enforces database idempotency using `ShippingWebhookEvent (provider, eventId)`.
- Updates `Shipment` status and timestamps (`shippedAt`, `deliveredAt`).
- Synchronizes the corresponding `Order` status (`SHIPPED`, `DELIVERED`).
- Records audit entries into `OrderStatusHistory` with `actorType: 'SHIPPING'`.
- Gracefully handles out-of-order or late webhooks for already-`DELIVERED` shipments without failing or rolling back.

---

## 7. Customer & Admin UI

1. **Customer Shipment Tracker** (`components/shipping/customer-shipment-tracker.tsx`):
   - Interactive 5-step visual progress bar: Prepared → Shipped → In Transit → Out for Delivery → Delivered.
   - Live badge indicators and courier tracking number with copy assistance.
   - Integrated directly into the customer transaction detail page `/[locale]/transactions/[id]`.

2. **Admin Shipment Management & Simulation Controls** (`components/admin/admin-shipment-controls.tsx`):
   - Instant shipment creation for paid orders without existing shipments.
   - Step-by-step courier lifecycle simulation buttons (`Mark Shipped`, `In Transit`, `Out for Delivery`, `Delivered`).
   - Exception testing buttons (`Delivery Failed`, `Returned to Sender`).
   - Integrated directly into the admin order management view `/[locale]/admin/orders/[id]`.

3. **Multilingual Localization Across All 8 Locales**:
   - Complete `Shipping` namespace added to `id`, `en`, `ja`, `tl`, `vi`, `th`, `hi`, and `zh`.

---

## 8. Verification & Test Suite

Automated verification was executed via `scratch/test-step14-shipping.ts`:
- **30 / 30 tests passed cleanly**.
- Regression suites verified:
  - Step 11 Order Fulfillment: 16/16 passed.
  - Step 12 Admin Operations: 21/21 passed.
  - Step 13 Payment Gateway: 23/23 passed.
- Production build: `npm run build` compiled with 0 errors across 149 static pages and dynamic API routes.
