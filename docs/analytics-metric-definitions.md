# RUPA Marketplace — Analytics Metric Definitions

This document details the exact formulas, source models, filtering conditions, and edge-case handling for all reporting metrics.

---

## 1. Gross Merchandise Sales (GMS)
- **Definition**: The total merchandise value of successfully placed and paid orders before discounts and shipping.
- **Source Tables**: `Order`, `OrderItem`, `Payment`.
- **Currency**: Integer JPY.
- **Timezone**: `Asia/Tokyo` (based on `Order.createdAt`).
- **Filters**:
  - `status` in `['PAID', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED', 'COMPLETED']` OR has associated `Payment` with `status == 'PAID'`.
  - Excludes unpaid cancelled orders (`status == 'CANCELLED'` and no paid payments).
- **Formula**:
  $$\text{GMS} = \sum \text{Order.subtotal}$$

---

## 2. Net Merchandise Sales
- **Definition**: Merchandise revenue after subtracting promotional coupon discounts.
- **Source Tables**: `Order`.
- **Currency**: Integer JPY.
- **Formula**:
  $$\text{Net Merchandise Sales} = \max(0, \text{GMS} - \sum \text{Order.discountAmount})$$

---

## 3. Shipping Revenue
- **Definition**: Total shipping charges collected on paid orders.
- **Source Tables**: `Order`.
- **Currency**: Integer JPY.
- **Formula**:
  $$\text{Shipping Revenue} = \sum \text{Order.shippingPrice} \quad \text{for qualifying paid orders}$$

---

## 4. Refund Amount
- **Definition**: Total funds successfully returned to customers.
- **Source Tables**: `Refund`.
- **Currency**: Integer JPY.
- **Filters**: `status == 'SUCCEEDED'` and `createdAt` within reporting range.
- **Formula**:
  $$\text{Refund Amount} = \sum \text{Refund.amount} \quad (\text{where status} = \text{'SUCCEEDED'})$$
- **Edge Cases**: Pending or failed refunds are excluded from deducted revenue.

---

## 5. Net Revenue
- **Definition**: The final authoritative financial revenue retained by the marketplace.
- **Currency**: Integer JPY.
- **Formula**:
  $$\text{Net Revenue} = \max(0, \text{Net Merchandise Sales} + \text{Shipping Revenue} - \text{Refund Amount})$$

---

## 6. Average Order Value (AOV)
- **Definition**: The average net revenue generated per paid transaction.
- **Currency**: Integer JPY (rounded).
- **Formula**:
  $$\text{AOV} = \begin{cases} \mathrm{round}\left(\frac{\text{Net Revenue}}{\text{Paid Order Count}}\right) & \text{if Paid Order Count} > 0 \\ 0 & \text{otherwise} \end{cases}$$

---

## 7. Operational Order Funnel
- **Definition**: Order progression through fulfillment stages.
- **Source Tables**: `Order`.
- **Stages**:
  1. `Payment Pending` (`PENDING_PAYMENT`)
  2. `Paid` (`PAID`)
  3. `Processing` (`PROCESSING`)
  4. `Packed` (`PACKED`)
  5. `Shipped` (`SHIPPED`)
  6. `Delivered` (`DELIVERED`)
  7. `Completed` (`COMPLETED`)

---

## 8. Return Rate
- **Definition**: Proportion of delivered orders that resulted in return requests.
- **Source Tables**: `Return`, `Order`.
- **Formula**:
  $$\text{Return Rate (\%)} = \begin{cases} \left(\frac{\text{Total Return Requests}}{\text{Delivered \& Completed Orders}}\right) \times 100 & \text{if delivered} > 0 \\ 0 & \text{otherwise} \end{cases}$$

---

## 9. Refund Rate
- **Definition**: Proportion of gross sales refunded to customers.
- **Source Tables**: `Refund`, `Order`.
- **Formula**:
  $$\text{Refund Rate (\%)} = \begin{cases} \left(\frac{\text{Successful Refund Amount}}{\text{Gross Merchandise Sales}}\right) \times 100 & \text{if GMS} > 0 \\ 0 & \text{otherwise} \end{cases}$$

---

## 10. Cancellation Rate
- **Definition**: Proportion of all created orders that ended in cancellation.
- **Source Tables**: `Cancellation`, `Order`.
- **Formula**:
  $$\text{Cancellation Rate (\%)} = \begin{cases} \left(\frac{\text{Total Cancellations}}{\text{Total Created Orders}}\right) \times 100 & \text{if total orders} > 0 \\ 0 & \text{otherwise} \end{cases}$$

---

## 11. Repeat Purchase Rate
- **Definition**: Proportion of active purchasing customers who have completed more than 1 lifetime order.
- **Source Tables**: `Order`, `User`.
- **Formula**:
  $$\text{Repeat Purchase Rate (\%)} = \begin{cases} \left(\frac{\text{Repeat Customers in Period}}{\text{Total Active Buyers in Period}}\right) \times 100 & \text{if active buyers} > 0 \\ 0 & \text{otherwise} \end{cases}$$

---

## 12. Fulfillment Durations
- **Time to Ship**:
  $$\text{Time to Ship (hours)} = \frac{\sum (\text{Shipment.shippedAt} - \text{Order.paidAt})}{\text{Shipped Count}}$$
- **Time to Delivery**:
  $$\text{Time to Delivery (hours)} = \frac{\sum (\text{Shipment.deliveredAt} - \text{Shipment.shippedAt})}{\text{Delivered Count}}$$
