# Security Hardening Guide — RUPA Marketplace

This document outlines the security controls, headers, authentication safeguards, and webhook protections implemented across the RUPA platform.

---

## 1. HTTP Security Headers

Security headers are globally configured in `next.config.ts`:

| Header | Production Value | Security Rationale |
|---|---|---|
| `X-Content-Type-Options` | `nosniff` | Prevents MIME-type sniffing attacks. |
| `X-Frame-Options` | `SAMEORIGIN` | Protects against UI clickjacking by restricting framing to same-origin. |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limits referer leakage to external domains while preserving path context on same-origin. |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Disables access to sensitive browser device features. |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` | Enforces HTTPS strictly for all subdomains for 1 year. |
| `Content-Security-Policy` | Custom directive policy | Controls approved sources for scripts, styles, images, and network connections. |

### Content-Security-Policy Directives:
```text
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval';
style-src 'self' 'unsafe-inline';
img-src 'self' blob: data: https://images.unsplash.com https://*.supabase.co;
font-src 'self' data:;
connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.algolia.net https://*.algolianet.com https://*.algolia.io https://api.resend.com;
frame-ancestors 'self';
base-uri 'self';
form-action 'self';
```

---

## 2. Authentication & Authorization Boundaries

1. **Server-Authoritative Role Verification**:
   - Client-provided roles, user IDs, or metadata are never trusted.
   - `requireAdmin()` and `getCurrentUser()` resolve user identity strictly through Supabase Auth JWT and verify the authoritative `role` column in the PostgreSQL database.
2. **Customer Ownership Enforced**:
   - Endpoints such as `GET /api/orders/:id` and Server Actions enforce `order.userId === currentUser.id`. Unauthorized access attempts are rejected with `403 FORBIDDEN`.
3. **Session Cookie Hardening**:
   - Cart cookie (`rupa_cart_api`) and Supabase Auth session tokens use `httpOnly: true`, `sameSite: 'lax'`, and `secure: true` in production environments.

---

## 3. Webhook Security & Idempotency

- **Webhook Signatures**: Payment and shipping webhooks verify HMAC signatures or provider validation headers (`x-payment-provider`, `stripe-signature`, `x-shipping-provider`) before processing payloads.
- **Idempotency**: Duplicate webhook payloads are acknowledged with HTTP `200 OK` without triggering duplicate inventory deductions or double refunds.
- **Safe Logging**: Webhook error logs sanitize sensitive personal information and omit raw auth tokens or payment card details.
