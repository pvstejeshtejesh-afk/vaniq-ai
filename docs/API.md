# Vaniq.Ai API

Base URL: `http://localhost:4000/api`

All authenticated endpoints use a session cookie (`vaniq_token`, httpOnly). Send
`credentials: 'include'` from the browser. Errors return a consistent envelope:

```json
{ "error": { "code": "bad_request", "message": "…", "details": [] } }
```

Common status codes: `200` OK · `201` Created · `400` validation/business rule ·
`401` unauthenticated · `403` forbidden/tenant · `404` not found · `409` conflict ·
`429` rate-limited · `500` internal.

---

## Auth — `/api/auth`

### `POST /api/auth/register`
```json
// request
{ "name": "Asha", "email": "asha@biz.in", "password": "password123" }
// 201 response
{ "user": { "id": "usr_…", "name": "Asha", "email": "asha@biz.in" } }
```
Sets the `vaniq_token` session cookie.

### `POST /api/auth/login`
```json
{ "email": "asha@biz.in", "password": "password123" }
```
`200` on success, `401` on bad credentials.

### `POST /api/auth/logout` → `{ "ok": true }` (clears cookie)

### `GET /api/auth/me`
```json
{ "user": { … }, "business": { … } | null }
```

### `POST /api/auth/forgot-password` `{ "email": "asha@biz.in" }`
Always returns `200 { "ok": true }` (does not reveal whether the email exists). Creates a
single-use, 30-minute reset token. **Dev mode** (`NODE_ENV !== 'production'`) also returns
`{ "devResetToken": "…" }` so the flow is testable without an email provider; in production
this must be delivered via email and is omitted.

### `POST /api/auth/reset-password` `{ "token": "…", "password": "newpass123" }`
`200` on success. Invalid, expired or already-used tokens → `400`. The token is stored hashed
(SHA-256) and can only be used once.

---

## Profile & security — `/api/profile`

- `PATCH /api/profile` `{ "name": "New Name" }` — update display name.
- `POST /api/profile/change-password` `{ "currentPassword": "…", "newPassword": "…" }` —
  verifies the current password first; wrong current password → `400`.

---

## Business — `/api/business`

- `POST /api/business` — create (once per account). Indian phone is normalized to E.164.
  ```json
  // request
  { "name": "Sunrise Realty", "industry": "real_estate", "phone": "9876543210",
    "timezone": "Asia/Kolkata", "callingHours": { "start": "09:00", "end": "20:00" },
    "callingDays": [1,2,3,4,5,6] }
  ```
  `industry` ∈ `real_estate | clinic | coaching | car_dealership | financial_services | restaurant | other`.
- `GET /api/business` → `{ "business": … }` or `{ "business": null }` (used for onboarding state).
- `PATCH /api/business` — update fields.

---

## AI Employees — `/api/employees`

- `GET /api/employees` → `{ "employees": [...] }`
- `POST /api/employees` — create in `draft` state.
  ```json
  { "name": "Meera", "purpose": "qualifying property leads", "languages": ["te","en","tenglish"],
    "qualificationFields": [{ "key": "budget_range", "label": "Budget range", "type": "text" }],
    "pricingTier": "standard" }
  ```
- `GET /api/employees/:id`
- `PATCH /api/employees/:id` — update; `{ "status": "active" | "paused" | "draft" }` to control.
- `DELETE /api/employees/:id`

---

## Leads — `/api/leads`

- `GET /api/leads?page=&limit=&q=&status=` — server-side paginated. `page` (default 1),
  `limit` (default 25, max 200), `q` (search name/phone/status), `status` (filter).
  Response: `{ "leads": [...], "total": n, "page": n, "pages": n }`.
- `POST /api/leads` — phone normalized; duplicate phone → `409`.
  ```json
  { "name": "Rahul Reddy", "phone": "+91 98765 43210", "consent": "granted", "source": "meta_ads" }
  ```
  `consent` ∈ `granted | denied | unknown`. Only `granted` leads are call-eligible.
- `PATCH /api/leads/:id/optout` — marks do-not-call (irreversible via API).

---

## Calls — `/api/calls`

- `GET /api/calls?page=&limit=&q=&status=` — server-side paginated, same params as leads.
  Response: `{ "calls": [...], "total": n, "page": n, "pages": n }`.
- `GET /api/calls/export` — downloads all calls as CSV (`vaniq-calls.csv`).
- `GET /api/calls/:id`
- `POST /api/calls` — place a call for an eligible lead with an **active** employee.
  ```json
  { "leadId": "lead_…", "employeeId": "emp_…", "idempotencyKey": "optional-unique-key" }
  ```
  - Returns `400` if consent/eligibility/hours/status rules fail (reason in message).
  - `idempotencyKey` makes retries safe — returns the prior call (`200`, `idempotent: true`).
  - With the **mock** telephony adapter, the call is simulated and completes with a transcript
    and summary. No real number is dialled.
  - The call is processed through the job queue (retry + idempotency); the response includes
    the `jobId`.

**Call statuses:** `queued, initiating, ringing, in_progress, completed, no_answer, busy, failed, cancelled`.

**Summary shape:**
```json
{ "requirement": "3BHK apartment", "answers": { "budget_range": "₹80L – ₹1Cr" },
  "intentScore": 85, "intentBasis": "Based on 2 of 2 qualification questions answered…",
  "qualificationResult": "qualified", "recommendedNextAction": "Book a site visit / follow-up call" }
```
`intentScore` is an assistive signal, **not** a guarantee or prediction.

---

## Appointments — `/api/appointments`

- `GET /api/appointments`
- `POST /api/appointments` — **conflict-checked server-side**; overlap → `409`.
  ```json
  { "leadId": "lead_…", "startsAt": "2026-11-02T10:00:00Z", "endsAt": "2026-11-02T10:30:00Z", "title": "Site visit" }
  ```
- `PATCH /api/appointments/:id/cancel`

---

## Analytics — `/api/analytics?from=&to=`

`from`/`to` are optional ISO timestamps. Metrics (computed from real records):

| Metric | Definition |
|---|---|
| `totalLeads` | Leads created in range |
| `callsAttempted` | Call records created in range |
| `callsConnected` | Calls with status `completed` or `in_progress` |
| `completedConversations` | Calls with status `completed` |
| `qualifiedLeads` | Leads with status `qualified` |
| `appointmentsBooked` | Non-cancelled appointments |
| `avgCallDurationSec` | Mean duration over completed conversations |
| `callSuccessRate` | `callsConnected / callsAttempted` |
| `leadConversionRate` | `qualifiedLeads / totalLeads` |
| `usagePaise` | Sum of usage charges in range |
| `trend` | Daily completed-call counts |

---

## Wallet & Payments

- `GET /api/wallet` → `{ "wallet": { "balancePaise": … }, "transactions": [...] }`
- `POST /api/payments/create-order` `{ "amountPaise": 100000 }` → creates order (mock unless keys set).
- `POST /api/payments/confirm` `{ "orderId", "paymentId", "signature" }` — verifies signature
  server-side, credits wallet **idempotently**. Returns `{ "payment", "balancePaise" }`.

All monetary values are **integer paise**. Usage is charged per completed call:
`billableMinutes = ceil(durationSec / 60)` (min 1 for any connected call),
`cost = minutes × ratePaisePerMin`.

---

## Webhooks — `/api/webhooks/razorpay`

Verifies `x-razorpay-signature` against `RAZORPAY_WEBHOOK_SECRET` using HMAC-SHA256 of the raw
body. Invalid signature → `400`. Duplicate `x-razorpay-event-id` → `{ "duplicate": true }`
(idempotent). On a `payment.captured`-style payload it credits the matching order's wallet.

---

## Integrations — `/api/integrations`

Manage where leads come from and where summaries go. All routes are tenant-scoped.

- `GET /api/integrations` → `{ "integrations": [...] }`
- `POST /api/integrations` `{ "provider": "meta_ads", "label": "Meta lead ads", "config": { } }`
  → `201`. `provider` ∈ `meta_ads | website_form | webhook | whatsapp | google_sheets | crm`.
  Creates in `status: "connected"` state.
- `PATCH /api/integrations/:id` `{ "status": "disconnected" | "connected" }` — toggle state.
- `DELETE /api/integrations/:id`

The integration records are real (persisted, audited, tenant-scoped). The downstream data
sync to Meta/Sheets/CRM activates once provider credentials are added in production; see
`docs/PROVIDERS.md`.
