# Prisma Production Guide — RUPA Marketplace

This document outlines Prisma ORM production operations, migration workflows, connection pooling, and performance considerations for serverless execution on Vercel.

---

## 1. Migration Strategy for Production

### Authoritative Deployment Command
In production CI/CD pipelines or pre-deployment hooks, only run:
```bash
npx prisma migrate deploy
```

### Prohibited Commands in Production
> [!CAUTION]
> The following commands must **NEVER** be executed against a production database:
> - `npx prisma migrate dev` (can trigger database resets or prompt interactively)
> - `npx prisma db push --force-reset` (destroys all existing tables and data)
> - `npx prisma migrate reset` (drops database tables)

### Migration Integrity Verification
Before deploying a new release, check pending migrations using:
```bash
npx prisma migrate status
```
If all migrations have been applied, Prisma will output:
`Database schema is up to date!`

---

## 2. Serverless Client Reuse & Connection Management

On serverless platforms like Vercel, functions spin up and tear down rapidly. To prevent exhausting database connection limits:

```typescript
// lib/prisma.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    transactionOptions: {
      maxWait: 10_000, // Maximum wait time to acquire connection: 10s
      timeout: 60_000, // Maximum transaction execution duration: 60s
    },
  });

// Persist client across invocations in both development and serverless production containers
globalForPrisma.prisma = prisma;
```

---

## 3. Transaction Isolation & Idempotency

All multi-step commerce mutations (e.g. order placement + inventory reservation + coupon decrement) are executed inside interactive Prisma transactions:
```typescript
await prisma.$transaction(async (tx) => {
  // 1. Reserve inventory atomically
  // 2. Validate coupon and record usage
  // 3. Create immutable OrderItem snapshots
  // 4. Create Order and initial OrderStatusHistory entry
}, {
  maxWait: 10000,
  timeout: 30000,
});
```
If any step fails, the entire transaction rolls back cleanly, ensuring 100% data consistency.
