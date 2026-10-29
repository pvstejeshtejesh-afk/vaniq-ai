# PROJECT_AUDIT — Vaniq.Ai

_Date of audit: 2026-10-29_

## 1. Repository inventory

| Path | What it is | Status |
|------|-----------|--------|
| `voice-agent/venv/` | A Python 3.11 **virtual environment** (only `pip` and `setuptools` installed). | Not project code. No Python source files exist. |
| `Screenshot 2026-09-30 *.png` (8 files) | Screenshots of a **competitor marketing site ("Outpero")** — hero, pricing, industries carousel, how-it-works, feature blocks. | Design/UX **reference only**, not source code. |
| Everything else | — | Nothing. |

### Verified by inspection
- `voice-agent/` contains **only** `venv/`. `voice-agent/*.*` matches **no files**.
- `venv/` contains no `*.py` outside of site-packages (`pip`, `setuptools`, `pkg_resources`). No application code, no `requirements.txt`, no entry point.
- No `package.json`, `tsconfig.json`, `.env*`, Dockerfile, database schema, test, or documentation anywhere in the repo.
- Not a git repository.

## 2. Framework / architecture present
**None.** There is no established stack to preserve. The `venv` implies an *intended* Python voice-agent experiment, but no code was committed.

## 3. Completed features
**None.** No runnable features exist.

## 4. Incomplete / missing
Everything from the product spec (see `IMPLEMENTATION_PLAN.md`) is missing:
auth, business onboarding, AI employees, leads, calls, voice adapters, appointments,
analytics, wallet/billing, security hardening, tests, docs, deployment config.

## 5. Bugs / security problems
Not applicable — no code. The only note is that the `venv` is committed inside a
folder that has no code, which adds noise; it is left untouched (not deleted) and
simply ignored by tooling.

## 6. Runnability / tests
Nothing to run or test prior to this work.

## 7. Decision
Because there is no existing code, I scaffold a **greenfield full-stack application**
that matches the visual language of the reference screenshots (rebranded to **Vaniq.Ai**)
and implements the functional spec. Engineering decisions made to keep it **genuinely
runnable and testable today** without live third-party credentials:

- **Data layer is swappable.** A repository interface with two implementations:
  - `memory` (default for dev/demo/tests) — real, in-process persistence so the app runs with zero external services.
  - `mongo` (Mongoose) — enabled by setting `STORAGE=mongo` + `MONGODB_URI`. Used for production.
- **External providers are adapters with mock implementations** (telephony, LLM, STT, TTS, payments). Live adapters are isolated behind interfaces and documented, but never claim to work without credentials.
- **Real money / real calls are impossible by default.** `OUTBOUND_CALLING_ENABLED=false` and Razorpay runs in a clearly-marked mock unless test keys are supplied.

Nothing was deleted. No secrets are stored or logged.
