# Security & production-readiness checklist

## Implemented in this codebase

- **Password hashing** — bcrypt (10 rounds). Passwords never stored or logged in plain text.
- **Session auth** — JWT in an `httpOnly`, `SameSite=Lax` cookie; `Secure` flag driven by
  `COOKIE_SECURE`. Token verified server-side on every private request.
- **Server-side tenant isolation** — every private route resolves the caller's `businessId` from
  the verified session and scopes the query. A business cannot read another business's employees,
  leads, calls, appointments, wallet, or analytics (covered by tests).
- **Input validation** — all request bodies validated with Zod; invalid input → `400` with a
  structured error, no stack traces leaked.
- **Safe error handling** — central error handler returns a consistent envelope; unknown errors
  are logged generically and return `500` without internals or secrets.
- **Rate limiting** — global limiter plus a stricter limiter on auth endpoints (brute-force slow-down).
- **Security headers** — Helmet.
- **Webhook signature verification** — Razorpay webhooks verified with HMAC-SHA256 + timing-safe
  compare; invalid signature rejected; events processed idempotently.
- **Payment signature verification** — wallet is credited only after server-side signature
  verification, and idempotently (no double credit).
- **Consent & opt-out** — leads require `granted` consent to be called; opt-out/do-not-call is
  enforced and irreversible via the API; calling-hour and calling-day rules checked per lead.
- **Audit log** — sensitive operations (register, login, business create, employee create,
  lead opt-out, payment confirm) recorded.
- **Secrets via environment** — nothing hardcoded; `.env.example` holds placeholders only.
- **Idempotency** — call placement and wallet credits are idempotent per key/call/payment.

## Before real production deployment (not yet done — flagged honestly)

- [ ] Store sessions/keys in a managed secret store; rotate `JWT_SECRET`.
- [ ] HTTPS everywhere; set `COOKIE_SECURE=true`; strict CORS allow-list.
- [ ] Add CSRF protection appropriate to your cookie/SPA setup (SameSite=Lax is a baseline).
- [ ] Persist to MongoDB (or equivalent) with backups; the default in-memory store is volatile.
- [ ] Move call processing to a durable job queue with retries (currently inline for the mock).
- [ ] Data retention & deletion controls for transcripts/recordings; restrict access to them.
- [ ] Encrypt recordings at rest; only surface with lawful basis + consent.
- [ ] Independent legal review of **TRAI/DLT, consent, and Indian data-protection** obligations
      before any real outbound calling. This project does **not** claim legal compliance.
- [ ] Add structured logging + monitoring + alerting.
- [ ] Lock down CORS, add request size limits, and add integration tests to CI.
