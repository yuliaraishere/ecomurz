# Refund Lifecycle

## Flow

```text
Cancellation approval ─┐
Return receipt ─────────┼─> calculate refundable balance
Manual admin refund ────┘      │
                               ├─ reject invalid/excess amount
                               ▼
                         create PENDING refund
                               │
                         call payment provider
                               │
                 ┌─────────────┴─────────────┐
                 ▼                           ▼
              SUCCEEDED                    FAILED
```

Provider updates may also move a pending record through `PROCESSING`. Webhook handling uses provider event IDs to stay idempotent.

## Monetary Invariants

- `refundableAmount = capturedAmount - sum(SUCCEEDED refunds)`.
- A requested amount must be a positive whole integer and cannot exceed `refundableAmount`.
- JPY is represented as a zero-decimal currency throughout the database, service, and provider payload.
- A return-generated refund links to `returnId`; cancellation and manual refunds remain linked to the order and payment.
- Provider IDs and statuses are retained for audit and reconciliation.

## Failure Handling

A provider failure is recorded as `FAILED` and does not reduce the successful refundable balance. Retrying must create or update records through the refund service so balance validation is repeated against current authoritative data.
