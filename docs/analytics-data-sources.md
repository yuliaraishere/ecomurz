# RUPA Marketplace — Analytics Data Sources & Model Mapping

This document provides a comprehensive mapping of every analytics widget and metric to the underlying PostgreSQL Prisma models and fields.

---

## 1. Metric to Database Model Mapping

| Metric Group | Specific Metric | Primary Database Model | Fields Utilized | Filter & Aggregation Logic |
| :--- | :--- | :--- | :--- | :--- |
| **Sales** | Gross Merchandise Sales | `Order`, `Payment` | `Order.subtotal`, `Order.status`, `Payment.status` | Filter by `createdAt` in range; include qualifying paid orders; sum `subtotal`. |
| | Promotional Discounts | `Order` | `Order.discountAmount` | Sum `discountAmount` across paid orders in range. |
| | Net Merchandise Sales | `Order` | `Order.subtotal`, `Order.discountAmount` | `Math.max(0, GMS - discounts)`. |
| | Shipping Revenue | `Order` | `Order.shippingPrice` | Sum `shippingPrice` on qualifying paid orders. |
| | Refund Amount | `Refund` | `Refund.amount`, `Refund.status` | Sum `amount` where `status == 'SUCCEEDED'` in range. |
| | Net Revenue | Multiple | Computed | `(Net Merchandise Sales + Shipping Revenue) - Refund Amount`. |
| | Average Order Value (AOV) | Computed | Computed | `Math.round(Net Revenue / Paid Orders Count)`. |
| **Orders** | Status Funnel & Breakdown | `Order` | `Order.status`, `Order.createdAt` | `prisma.order.groupBy({ by: ['status'] })`. |
| **Products** | Top Products Ranking | `OrderItem`, `ReturnItem` | `OrderItem.productName`, `OrderItem.subtotal`, `OrderItem.quantity`, `OrderItem.discountAllocation` | Aggregated per `productId` from immutable `OrderItem` snapshots. |
| | Product Stock | `Inventory` | `Inventory.availableQty` | Real-time stock joined via `Product.inventory`. |
| **Categories** | Category Sales & Volume | `OrderItem`, `Product`, `Category` | `OrderItem.subtotal`, `Product.categoryId`, `Category.name` | Aggregated by `categoryId`. |
| **Inventory** | Inventory Health & Alerts | `Inventory`, `Product` | `Inventory.availableQty`, `Inventory.reservedQty` | Grouped by status: `OUT_OF_STOCK` (0), `LOW_STOCK` (≤ 5), `HEALTHY` (> 5). |
| **Promotions** | Coupon Redemptions | `PromotionUsage`, `Promotion` | `PromotionUsage.discountAmount`, `Promotion.code`, `Promotion.name` | Aggregated by `promotionId`. |
| **Returns** | Return Requests & Units | `Return`, `ReturnItem` | `Return.status`, `ReturnItem.quantity` | Grouped by status and item quantities. |
| **Refunds** | Refund Counts & Success Rate | `Refund` | `Refund.status`, `Refund.amount` | Filtered by `createdAt` in range. |
| **Cancellations**| Cancellation Reasons & Rate | `Cancellation` | `Cancellation.status`, `Cancellation.reason`, `Cancellation.actorType` | Grouped by `reason` and status. |
| **Fulfillment** | Time to Ship / Delivery | `Shipment`, `Order`, `OrderStatusHistory` | `Shipment.shippedAt`, `Shipment.deliveredAt`, `Order.createdAt` | Difference in hours between status events. |
| | Carrier Performance | `Shipment` | `Shipment.carrierName`, `Shipment.status` | Grouped by carrier name. |
| **Customers** | Customer Counts & Repeat Rate | `User`, `Order` | `User.role`, `Order.userId`, `Order.createdAt` | Scoped to `User.role == 'CUSTOMER'`, privacy-preserving (no PII). |

---

## 2. Historical Immutability & Catalog Decoupling
A key architectural guarantee established in Step 17 and enforced in Step 18 is that **catalog price or name edits never rewrite historical sales metrics**.

- When an order is placed, `OrderItem` persists a permanent snapshot of `productName`, `productPrice`, `quantity`, `subtotal`, and `discountAllocation`.
- The analytics query layer strictly aggregates sales from these `OrderItem` rows.
- If an admin edits a product price from ¥1,000 to ¥1,500 in the catalog, historical sales reports for past weeks or months continue to show the exact revenue collected (¥1,000).

---

## 3. Unsupported Web/Behavioral Metrics (Documented Limitations)
The current transactional commerce dataset does not contain event-level clickstream or session data. Consequently, the following metrics are **not supported** and have not been fabricated:
- Website conversion rate (visitors → buyers)
- Cart abandonment rate
- Search query drop-off / conversion rate
- Session duration & bounce rate
- Customer Lifetime Value (CLV) predictive models
- Marketing ad attribution / ROAS

To implement these metrics in the future, client-side telemetry (e.g. Snowplow, Segment, or custom event logging into a data warehouse) would need to be introduced.
