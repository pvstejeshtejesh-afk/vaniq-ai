# Vaniq.Ai

**AI voice employees for Indian businesses.** Every lead gets a fast response from an AI
employee that never misses a follow-up — speaking **Telugu, English & Tenglish**, qualifying
customers, booking appointments, and saving call summaries to a business dashboard.

> Primary market: Andhra Pradesh & Telangana, India.

---

## What this is

A full-stack SaaS application:

- **`server/`** — Express + TypeScript REST API. Auth, tenant isolation, AI employees, leads,
  calls (mock telephony), appointments, analytics, wallet/billing (mock Razorpay), webhooks.
- **`web/`** — React + Vite + TypeScript + Tailwind marketing site and authenticated dashboard.
- Swappable data layer: **in-memory** by default (runs with zero external services), **MongoDB**
  (Mongoose) as an opt-in for persistence.
- Provider **adapters with mock implementations** for telephony, LLM, STT, TTS, and payments, so
  the entire flow works end-to-end without any third-party credentials.

> **Real voice calls and real payments are disabled by default.** See
> [What needs credentials](#what-needs-credentials).

---

## Quick start (local)

Prerequisites: **Node.js ≥ 20** and npm.

```bash
# 1) Backend
cd server
cp .env.example .env        # optional — defaults work out of the box
npm install
npm run dev                 # API on http://localhost:4000

# 2) Frontend (in a second terminal)
cd web
npm install
npm run dev                 # web on http://localhost:5173 (proxies /api to :4000)
```

Open **http://localhost:5173**, click **Get Started**, register, complete onboarding, then:
create an AI employee → activate it → add a lead with consent → **Call now** → review the
transcript, summary, intent score, and the wallet charge.

### Run the tests

```bash
cd server
npm test          # 40 integration tests (Vitest + Supertest), all providers mocked
npm run typecheck # backend type safety
```

```bash
cd web
npm run build     # typecheck + production build
```

---

## Using MongoDB (optional persistence)

The default in-memory store resets on restart. For persistent data:

```bash
# server/.env
STORAGE=mongo
MONGODB_URI=mongodb://localhost:27017/vaniq
```

Then `npm run dev` in `server/` connects via Mongoose and creates indexes automatically.

---

## Deploy (Render + Vercel + Atlas, free tiers)

The repo is set up for a split deploy: **API on Render**, **UI on Vercel**, **data on
MongoDB Atlas**. A [`render.yaml`](render.yaml) blueprint and [`web/vercel.json`](web/vercel.json)
are included.

### 1. MongoDB Atlas (data)
1. Create a free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas).
2. Database Access → add a user. Network Access → allow your deploy platform (or `0.0.0.0/0`).
3. Connect → Drivers → copy the connection string (looks like
   `mongodb+srv://user:pass@cluster…/vaniq`).

### 2. Render (API)
1. Dashboard → **New → Blueprint** → connect this repo. Render reads `render.yaml` and
   provisions the API (Node, free plan, health check at `/api/health`).
2. When prompted, set the two `sync: false` vars:
   - `MONGODB_URI` — the Atlas string from step 1 (or leave `STORAGE=memory` for a demo).
   - `CORS_ORIGIN` — your Vercel URL from step 3 (e.g. `https://vaniq-ai.vercel.app`).
3. Deploy. Note the API URL, e.g. `https://vaniq-api.onrender.com`.

### 3. Vercel (frontend)
1. **Import Project** → this repo → set **Root Directory** to `web` (framework auto-detects Vite).
2. Add one environment variable (build-time):
   - `VITE_API_BASE` = `https://vaniq-api.onrender.com/api` (your Render URL + `/api`).
3. Deploy. Open the URL, register, and the dashboard talks to the Render API.

> **Split-domain cookies:** because the UI and API are on different domains, Render runs with
> `COOKIE_SECURE=true` + `COOKIE_SAMESITE=none` (set by `render.yaml`) so the session cookie
> is sent cross-site. Locally nothing changes — dev keeps `lax`.

> **Free-plan caveat:** Render's free web service sleeps after inactivity and redeploys wipe
> the in-memory store. For anything real, keep `STORAGE=mongo` + Atlas (already the blueprint
> default once you paste `MONGODB_URI`).

---

## Project structure

```
server/
  src/
    index.ts            # entrypoint (builds store, starts app)
    app.ts              # Express app + all routes
    config.ts           # Zod-validated environment config
    types.ts            # shared domain types
    lib/                # password, jwt, phone normalization, errors, ids
    middleware/         # auth, tenant guard, validation, rate-limit, error handler
    adapters/           # telephony, llm, speech (STT/TTS), payments — interfaces + mocks
    services/           # call processing, appointments, analytics, wallet
    store/              # Store interface + memory & mongo implementations
    tests/              # Vitest integration tests
web/
  src/
    pages/              # public marketing + auth + onboarding
    app/                # authenticated dashboard pages
    components/         # UI primitives (Spinner, Toast, EmptyState, …)
    lib/                # api client, auth context, types
docs/                   # API, provider, and security documentation
```

---

## What works today

- Registration, login, logout, session (`httpOnly` cookie + JWT), bcrypt password hashing.
- Business onboarding with Indian-phone normalization and validation.
- **Server-side tenant isolation** on every private route.
- AI employee CRUD: name, purpose, personality, languages (te/en/tenglish), qualification
  questions, voice tier, activate/pause/delete.
- Lead lifecycle: create, duplicate prevention, consent & opt-out enforcement, do-not-call.
- Call workflow via **mock telephony**: eligibility → queue (idempotent) → simulated conversation
  → transcript + structured summary (requirement, answers, intent score with basis, next action).
- Appointments with **server-side conflict checking**, booking and cancellation.
- Analytics computed from **real records** (no hardcoded numbers) with date filters + trend chart.
- Wallet, usage ledger, per-call charges (integer paise), configurable per-minute pricing.
- Payment order creation + **signature-verified** confirmation; Razorpay **mock** until keys are set.
- Webhook endpoint with **signature verification** and **idempotent** processing.

## What needs credentials (documented, not faked)

| Capability | Status | How to enable |
|---|---|---|
| Real outbound calls | **Disabled** | Set telephony provider keys + `OUTBOUND_CALLING_ENABLED=true` (see `docs/PROVIDERS.md`) |
| Live LLM / STT / TTS | Mock | Add provider API keys; adapters implement the same interfaces |
| Razorpay live/test | Mock | Set `RAZORPAY_KEY_ID/SECRET/WEBHOOK_SECRET` |
| MongoDB persistence | Off by default | `STORAGE=mongo` + `MONGODB_URI` |

---

## Documentation

- [`docs/API.md`](docs/API.md) — REST endpoints, request/response examples, metric definitions.
- [`docs/PROVIDERS.md`](docs/PROVIDERS.md) — configuring telephony, LLM, speech, Razorpay.
- [`docs/SECURITY.md`](docs/SECURITY.md) — security & production-readiness checklist.
- [`PROJECT_AUDIT.md`](PROJECT_AUDIT.md) — audit of the starting state.
- [`IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md) — phased plan and status.

---

## Continuous integration

Every push and pull request to `main` runs [`.github/workflows/ci.yml`](.github/workflows/ci.yml):

- **Backend** — `npm ci` → `npm run typecheck` → `npm test` (40 integration tests, providers mocked).
- **Frontend** — `npm ci` → `npm run build` (typecheck + Vite production build).

No secrets are required for CI — all external providers are mocked, so the pipeline runs green
on a clean clone. Node 20.

---

## Compliance note

Vaniq.Ai enforces consent, opt-out, and configurable calling hours on every lead. However,
**Indian telecom / TRAI and data-protection requirements must be independently verified before
any production deployment.** This project does not claim legal compliance. Do not make
unsolicited calls to arbitrary numbers.
