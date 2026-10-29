# IMPLEMENTATION_PLAN — Vaniq.Ai

Prioritized, phased plan. Each phase ends runnable + tested. "Done" means implemented
**and** verified, not mocked on-screen.

Status legend: `TODO` · `WIP` · `DONE`

---

## Phase 0 — Audit & skeleton  `DONE`
- [x] Inspect repo (empty Python `venv` + competitor screenshots only).
- [x] `PROJECT_AUDIT.md`, `IMPLEMENTATION_PLAN.md`.
- [x] Monorepo skeleton: `server/` (Express+TS) + `web/` (Vite+React+TS+Tailwind).

## Phase 1 — Backend core that runs  `DONE`
- [x] Swappable data layer: `memory` (default, zero-dep) / `mongo` (Mongoose, opt-in).
- [x] Environment config + validation (Zod), `.env.example`.
- [x] Error envelope, request logging, security headers, rate limiting.
- [x] Health endpoint. Server boots with `npm run dev`.

## Phase 2 — Auth, onboarding, tenant isolation  `DONE`
- [x] Register / login / logout / me (JWT in httpOnly cookie, bcrypt password hashing).
- [x] Business profile model + onboarding endpoints.
- [x] Server-side tenant authorization middleware (every private route scoped to business).
- [x] Tests: registration, login, auth-gating, **cross-business isolation**.

## Phase 3 — AI employees, leads, calls  `DONE`
- [x] AIEmployee CRUD (name, purpose, personality, system prompt, languages, voice,
      qualification questions, FAQs, hours, max duration, escalation, outcomes, activate/pause).
- [x] Lead lifecycle: create (API/form), phone normalize/validate, consent + opt-out,
      duplicate prevention, queue eligibility.
- [x] Call records + status machine (queued→initiating→ringing→in_progress→completed/…).
- [x] Mock telephony adapter + job queue with retry/idempotency. No real calls ever.
- [x] Tests: employee config, lead duplicate prevention, consent/opt-out, call status updates.

## Phase 4 — Voice adapters & conversation  `DONE` (mock-backed)
- [x] Provider interfaces: telephony, LLM, STT, TTS. Deterministic mock implementations.
- [x] Language config for Telugu / English / Tenglish. Summary + transcript generation.
- [x] Webhook signature verification + idempotent event processing.
- [x] Tests: webhook signature verification, summary/qualification parsing.

## Phase 5 — Appointments, summaries, analytics  `DONE`
- [x] Appointment availability + conflict checking + booking/cancellation.
- [x] Structured call summary: requirement, answers, intent score (with basis), outcome.
- [x] Analytics computed from real records: leads, calls, connect rate, qualified,
      appointments, avg duration, conversion; date filters; empty states.
- [x] Tests: appointment conflict prevention, analytics calculations.

## Phase 6 — Wallet & billing (Razorpay test-mode ready)  `DONE` (mock + interface)
- [x] Wallet, usage ledger, per-call usage records, configurable pricing (paise integers).
- [x] Payment intent creation + **signature-verified** webhook → credit wallet (idempotent).
- [x] Mock Razorpay when keys absent; live adapter interface + docs when present.
- [x] Tests: wallet transactions, payment confirmation, usage calculation.

## Phase 7 — Frontend (marketing + app)  `DONE`
- [x] Marketing site matching reference: Home, Features, Industries, How It Works,
      Pricing, FAQ, Login, Get Started.
- [x] Auth pages wired to real backend (register, login, logout, forgot/reset password).
- [x] App shell + Overview, AI Employees (with full edit screen), Leads, Calls, Appointments,
      Analytics, Wallet, Integrations, Business Settings, Profile & Security.
- [x] Server-side pagination + search + status filters on Leads and Calls; CSV export.
- [x] Every visible UI action works or is clearly marked coming-soon (integrations sync).

## Phase 8 — Security, docs, deployment  `DONE` (production items credential-gated)
- [x] Security headers, rate limiting, CSRF-aware cookie setup, safe error handling,
      audit log for sensitive ops, consent/opt-out + calling-hour enforcement.
- [x] README, API docs, provider guide, security checklist, Dockerfile, compose.
- [x] Password reset (hashed single-use tokens), profile update, change password.
- [x] Integrations CRUD (tenant-scoped, audited); calls CSV export.
- [x] In-process job queue with retry + idempotency (swappable for Redis/BullMQ).
- [x] 40 backend tests passing; frontend `tsc` + `vite build` clean.
- [ ] CI pipeline; production MongoDB hardening; live-provider verification (blocked on
      external credentials — see below).

---

## Blocked on external credentials (not implementable to "live" without them)
- **Telephony / STT / TTS live calls** — need provider API keys. Interface + mock done;
  docs in `docs/PROVIDERS.md`. Real outbound calling stays disabled by default.
- **Razorpay live/test keys** — mock + signature verification done; add keys to go live.
- **LLM provider key** — deterministic mock used by default; swap via config.
- **MongoDB** — app defaults to in-memory store; set `STORAGE=mongo` + URI for persistence.
