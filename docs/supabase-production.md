# Supabase Production Guide — RUPA Marketplace

This document details the configuration of **Supabase PostgreSQL** and **Supabase Auth** for production operation on the RUPA platform.

---

## 1. Dual-Port PostgreSQL Connection Architecture

Supabase provides two connection interfaces:

```
[ Next.js on Vercel (Lambdas) ]
           │
           ▼
[ Port 6543: Transaction Pooler (PgBouncer) ] ──> DATABASE_URL
  • Short-lived transactional queries
  • Connection pooling enabled (?pgbouncer=true)
  • connection_limit=15, pool_timeout=60
  • Prevents serverless connection saturation

[ CI/CD / Migration CLI ]
           │
           ▼
[ Port 5432: Direct Session Connection ] ──> DIRECT_URL
  • Long-lived DDL migrations (prisma migrate deploy)
  • Schema alterations, indexes, enum creation
  • Bypasses PgBouncer (which does not support prepared statements / DDL)
```

### Prisma Configuration in `schema.prisma`:
```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

---

## 2. Supabase Auth Production Architecture

### Authoritative Identity
- **Supabase Auth** is the sole source of truth for user accounts, passwords, sessions, JWTs, and email verification.
- Passwords are never stored in the RUPA application database; they are securely hashed by Supabase (Bcrypt).
- The PostgreSQL `User` table holds domain application fields (`role`, `fullName`, `phone`) keyed by the authoritative Supabase Auth `user.id`.

### Role-Based Authorization
- Roles are strictly verified server-side:
  ```typescript
  // features/auth/services/require-admin.ts
  export async function requireAdmin(): Promise<AuthUser> {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    if (user.role !== 'ADMIN') throw new ForbiddenError();
    return user;
  }
  ```
- Client-supplied `role` claims in cookies or request bodies are **never trusted**.

### Authentication Flow & Redirects
- Authentication routes (`/login`, `/register`) preserve return paths via `?redirectTo=...`.
- Session synchronization occurs transparently inside `middleware.ts` via `@supabase/ssr` `updateSession()`.

---

## 3. Backups & Disaster Recovery

- **Automated Daily Backups**: Enabled by default on Supabase Pro/Team plans.
- **Point-in-Time Recovery (PITR)**: Recommended for production e-commerce to allow restoring the database to any specific minute in case of accidental data corruption.
