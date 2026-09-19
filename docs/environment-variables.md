# Environment Variables Reference — RUPA Marketplace

This document provides a reference dictionary of all environment variables used by the RUPA platform, their security classification, and deployment rules.

---

## 1. Classification Overview

- **Public Variables (`NEXT_PUBLIC_*`)**: Bundled into client-side JavaScript, accessible in web browsers and edge functions. **Never store secret keys, passwords, or service credentials here.**
- **Server-Only Variables**: Only accessible within Node.js / Server Components, Server Actions, Route Handlers, and Background tasks. Never exposed to browsers.

---

## 2. Complete Environment Variables Dictionary

| Variable Name | Scope | Sensitivity | Description & Recommended Values |
|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Public | Non-sensitive | Base URL of the marketplace (e.g. `https://rupa.asia` or `http://localhost:3000`). Used for OAuth redirects and canonical links. |
| `NEXT_PUBLIC_APP_ENV` | Public | Non-sensitive | Environment identifier: `'development'`, `'preview'`, or `'production'`. |
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Non-sensitive | Supabase project API gateway endpoint (`https://[PROJECT_ID].supabase.co`). |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public | Non-sensitive | Supabase public anonymous publishable key (`sb_publishable_...`). Used by browser client to initiate authentication. |
| `SUPABASE_SECRET_KEY` | Server-Only | **CRITICAL SECRET** | Supabase backend secret / service-role key (`sb_secret_...`). Bypasses RLS for administrative background sync. **Never expose to browser.** |
| `SUPABASE_JWKS_URL` | Server-Only | Non-sensitive | JWKS public key endpoint for verifying Supabase JWT authentication tokens. |
| `DATABASE_URL` | Server-Only | **CRITICAL SECRET** | Supabase PostgreSQL transaction pooler connection string (Port 6543, `pgbouncer=true`, `connection_limit=15`, `pool_timeout=60`). |
| `DIRECT_URL` | Server-Only | **CRITICAL SECRET** | Direct database session connection string (Port 5432) for running Prisma DDL migrations. |
| `CATALOG_REPOSITORY_MODE` | Server-Only | Configuration | Active catalog repository implementation: `'prisma'` (production) or `'mock'` (in-memory dev). |
| `EMAIL_PROVIDER` | Server-Only | Configuration | Active transactional email provider: `'resend'` (production) or `'mock'` (local test). |
| `RESEND_API_KEY` | Server-Only | **CRITICAL SECRET** | Resend API key (`re_...`). Authorizes transactional email dispatch. |
| `RESEND_FROM_EMAIL` | Server-Only | Configuration | Authoritative sender address (e.g. `RUPA Marketplace <orders@rupa.asia>`). Must belong to a verified domain on Resend. |
| `SEARCH_PROVIDER` | Server-Only | Configuration | Active search engine provider: `'algolia'` (production) or `'mock'` (deterministic testing). |
| `ALGOLIA_APP_ID` | Server-Only / Public | Non-sensitive | Algolia application identifier. |
| `ALGOLIA_SEARCH_API_KEY` | Public / Server-Only | Non-sensitive | Search-only query API key. Restrict permissions strictly to search queries. |
| `ALGOLIA_ADMIN_API_KEY` | Server-Only | **CRITICAL SECRET** | Administrative API key for index synchronization and document reindexing. **Never expose to client.** |
| `ALGOLIA_INDEX_NAME` | Server-Only | Configuration | Search index target name (e.g. `rupa_products_prod` or `rupa_products_dev`). |
| `TRANSLATION_PROVIDER` | Server-Only | Configuration | Active translation provider: `'google'` (production) or `'mock'`. |
| `GOOGLE_TRANSLATE_API_KEY` | Server-Only | **CRITICAL SECRET** | Google Cloud API key for automated translation backfills. |
| `PAYMENT_WEBHOOK_SECRET` | Server-Only | **CRITICAL SECRET** | Secret for verifying incoming payment provider webhook HMAC signatures. |
| `SHIPPING_WEBHOOK_SECRET` | Server-Only | **CRITICAL SECRET** | Secret for verifying courier partner tracking webhook signatures. |

---

## 3. Secret Rotation Procedure

If any server-only credential is leaked or compromised:
1. **Supabase Secret Key**: Rotate in Supabase Dashboard > Project Settings > API > JWT Secret.
2. **Database Password**: Rotate in Database Settings > Database Password, then immediately update `DATABASE_URL` and `DIRECT_URL` in Vercel Environment Variables and redeploy.
3. **Resend API Key**: Revoke in Resend Dashboard > API Keys, generate a new key with sending-only scope, and update Vercel variables.
4. **Algolia Admin Key**: Regenerate in Algolia Dashboard > Settings > API Keys, then update Vercel environment variables.
