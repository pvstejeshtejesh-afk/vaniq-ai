# Provider configuration guide

Vaniq.Ai uses **adapter interfaces** so telephony, LLM, speech, and payment providers can be
swapped without rewriting the app. Every adapter ships with a **deterministic mock** so the full
flow works with **zero credentials**. This document explains how to move from mock → live.

---

## Telephony (outbound calls)

**Interface:** `server/src/adapters/telephony.ts` → `TelephonyAdapter.placeCall(...)`

- **Mock (default):** `TELEPHONY_PROVIDER=mock`. Returns a fake `providerCallId`. **Never dials.**
- **Live:** implement `placeCall` against your provider (e.g. Twilio, Exotel, Plivo, Knowlarity,
  Ozonetel) and return the provider's call SID. The call service stores `providerCallId` for
  status reconciliation via webhooks.

To enable real calling:

```env
TELEPHONY_PROVIDER=<your-provider>
TELEPHONY_API_KEY=<key>
OUTBOUND_CALLING_ENABLED=true   # keep false until fully tested
```

> `OUTBOUND_CALLING_ENABLED` gates **live** adapters only. The mock always works so you can
> develop and demo safely. Do not flip this on until credentials, consent checks, calling-hour
> policy, and your test procedure are verified. You are responsible for TRAI/DLT and consent
> compliance for any real outbound traffic.

---

## LLM (conversation + summary)

**Interface:** `server/src/adapters/llm.ts` → `LLMAdapter.generateConversation / summarize`

- **Mock (default):** `LLM_PROVIDER=mock`. Deterministic — the same lead always yields the same
  transcript, duration, and summary (great for tests/demos).
- **Live:** implement `generateConversation` and `summarize` against your LLM (OpenAI, Anthropic,
  a self-hosted model, etc.). Set `LLM_PROVIDER` and `LLM_API_KEY`. Keep the system prompt driven
  by the employee's `systemPrompt`, `faqs`, and industry instructions; instruct the model to ask
  one question at a time and never invent prices/availability/medical advice.

---

## Speech — STT & TTS

**Interfaces:** `server/src/adapters/speech.ts` → `STTAdapter.transcribe`, `TTSAdapter.synthesize`

- **Mock (default):** `STT_PROVIDER=mock`, `TTS_PROVIDER=mock`.
- **Live:** implement against your speech providers (e.g. Google Speech, Azure, Sarvam, Whisper +
  a neural TTS). For Telugu/English/Tenglish, choose models that actually support those languages
  and wire the `language` hint passed into each call. Do not claim a language you haven't tested.

---

## Payments — Razorpay

**Interface:** `server/src/adapters/payments.ts` → `PaymentAdapter`

- **Mock (default):** used whenever `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` are **absent**. Order
  IDs are `order_mock_…`, signature verification always passes, and **no real money moves**. The
  frontend detects mock mode (`isMock: true`) and confirms immediately.
- **Live (test mode first):**
  ```env
  RAZORPAY_KEY_ID=rzp_test_xxxxxxxx
  RAZORPAY_KEY_SECRET=xxxxxxxx
  RAZORPAY_WEBHOOK_SECRET=xxxxxxxx
  ```
  1. `POST /api/payments/create-order` creates a real Razorpay order (wire the live Orders API call
     inside `RazorpayAdapter.createOrder` — currently a stub behind the interface).
  2. Open Razorpay Checkout on the frontend, collect `razorpay_payment_id` + `razorpay_signature`.
  3. `POST /api/payments/confirm` verifies `HMAC_SHA256(order_id|payment_id, KEY_SECRET)` and only
     then credits the wallet (idempotent per payment).
  4. Configure the webhook to `POST /api/webhooks/razorpay` with `RAZORPAY_WEBHOOK_SECRET`; the
     server verifies `HMAC_SHA256(raw_body, secret)` and processes events idempotently.

**Never commit real keys.** Use `server/.env` (git-ignored) and keep `.env.example` as the
placeholder template. Amounts are always integer **paise**.

---

## Notes on the mock LLM summary

The mock scores intent as `answeredQuestions / totalQuestions × 100` and returns
`qualified` at ≥ 50%. It is explicitly labelled assistive, never a guaranteed prediction. A live
LLM should follow the same contract and include a human-readable `intentBasis`.
