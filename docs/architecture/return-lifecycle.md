# Return Lifecycle

## State Machine

```text
RETURN_REQUESTED ──approve──> RETURN_APPROVED ──ship──> RETURN_IN_TRANSIT
       │                            │                          │
       ├──reject──> RETURN_REJECTED └──cancel──> RETURN_CANCELLED
       └──cancel──> RETURN_CANCELLED                           │
                                                              ├──receive
                                                              ▼
                                                        RETURN_RECEIVED
                                                              │
                                                              └──refund/restock──> COMPLETED
```

`RETURN_REJECTED`, `RETURN_CANCELLED`, and `COMPLETED` are terminal.

## Invariants by Transition

| Transition | Actor | Inventory | Refund |
| --- | --- | --- | --- |
| Request | Customer | Unchanged | None |
| Approve | Admin | Unchanged | None |
| Mark in transit | Customer or admin | Unchanged | None |
| Receive | Admin | Restore returned quantities once | Calculate/process proportional refund |
| Reject | Admin | Unchanged | None |
| Cancel | Customer or admin | Unchanged | None |

## Eligibility and Quantity Rules

- Only an order in `DELIVERED` can start a return.
- Every requested item must belong to the order.
- Quantity must be positive.
- The sum of active/completed requests for an order item cannot exceed the purchased quantity.
- Rejected and cancelled requests do not consume the remaining returnable quantity.

The `ReturnItem` record keeps the order-item reference, product ID, quantity, and item-level reason so partial and repeated returns remain auditable.
