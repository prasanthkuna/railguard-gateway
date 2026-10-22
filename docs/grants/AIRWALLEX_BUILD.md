# Airwallex build: Payment Ops Incident Commander (Track 3)

Railguard is an open-source project by Prasanth Kuna (payments & backend engineer, solo builder).
This page covers the Airwallex payout rail and the incident commander built for the Airwallex
Agentic Banking Hackathon (HackerEarth, Starter Kit 03). Pitch: [AIRWALLEX_AGENTIC_BANKING.md](./AIRWALLEX_AGENTIC_BANKING.md).

**The one guarantee:** when an Airwallex transfer goes UNKNOWN (timeout, 5xx, lost response), Railguard
never creates a second transfer for the same intent. It blocks retries, reconciles by `request_id`, and
marks the payout CONFIRMED exactly once.

| Milestone | Date |
|-----------|------|
| Build window | Oct 25 – Nov 13, 2026 |
| Submission due | Nov 13, 2026 |
| Demo day (remote OK) | Nov 19, 2026 |

## What is built

| Piece | Path |
|-------|------|
| Airwallex API client (login, token cache, create/get/list transfers, error classification, timeouts) | `packages/kernel/src/adapters/airwallex/client.ts` |
| Status mapping (Airwallex to Railguard lifecycle and label) | `packages/kernel/src/adapters/airwallex/status.ts` |
| Webhook signature check (HMAC-SHA256 of `x-timestamp` + raw body, constant-time, 5 min window) | `packages/kernel/src/adapters/airwallex/webhook.ts` |
| Payout attempt ledger (one row per intent / `request_id`) | `packages/kernel/src/adapters/airwallex/attemptStore.ts` |
| `ExecutionRail` implementation (prepare / execute / observe / reconcile, safe retry) | `packages/kernel/src/adapters/airwallex/rail.ts` |
| Incident commander (detect, block, reconcile, timeline, runbook, hash chain) | `packages/kernel/src/adapters/airwallex/incidentCommander.ts` |
| Sandbox simulator (fault injection: timeout after/before create, 503) | `packages/kernel/src/adapters/airwallex/simulator.ts` |
| Offline demo scenarios A/B/C | `packages/kernel/src/adapters/airwallex/demo.ts` |
| Tests (mocked HTTP layer) | `packages/kernel/src/adapters/airwallex/airwallex.test.ts` |
| Env-configured rail for the registry (replaces the disabled stub) | `packages/integrations/src/rails/airwallexRail.ts` |
| Public API demo: `GET /v1/airwallex/incident-demo` (simulated, read-only) | `apps/api/airwallexIncidents.ts` |
| Operator UI: **Incidents** view | `apps/operator/app/incidents/page.tsx` |
| Live sandbox smoke (writes non-secret evidence) | `scripts/airwallex-sandbox-smoke.ts` |

### Rules the rail enforces

1. **Deterministic `request_id`.** `rg_` + first 40 hex chars of `sha256("railguard:airwallex:" + intentId)`.
   The same intent always maps to the same Airwallex `request_id`, and Airwallex dedupes it for 7 days.
2. **Grant check before prepare.** The grant must be `allow`, belong to the intent, use the same currency and
   reserve at least the amount.
3. **Ambiguous means UNKNOWN, never FAILED.** A network error, timeout, 5xx, 409 or 429 on create, or
   `request_id_duplicate`, moves the attempt to `UNKNOWN` (`BROADCAST_UNKNOWN`). Only definite 4xx
   validation/auth failures are `REJECTED_BEFORE_BROADCAST`.
4. **Fail closed.** `execute` throws `DuplicatePayoutBlockedError` while an attempt is CREATING, SUBMITTED,
   UNKNOWN, CONFIRMED, FAILED, REVERSED or DISPUTED.
5. **Reconcile by `request_id`** (`GET /api/v1/transfers?request_id=...`). If a transfer is found, it is adopted.
   Amount, currency and beneficiary must match the intent; otherwise the attempt is DISPUTED and escalated.
6. **One safe retry.** Allowed only after a reconcile returned not-found, once the grace window has passed
   (default 2 min), and always with the **same** `request_id`. A second miss escalates to a human.
7. **Webhooks are verified before parsing.** Bad signature, missing headers, a stale timestamp or a missing
   secret all mean the event is rejected and payout state is untouched.

### Status mapping

| Airwallex status | Railguard label | Lifecycle | Notes |
|------------------|-----------------|-----------|-------|
| IN_APPROVAL, SCHEDULED, OVERDUE, PROCESSING, CANCELLATION_REQUESTED | PENDING | SUBMITTED | |
| SENT | PENDING | SUBMITTED | Included at the bank, not yet paid |
| PAID | CONFIRMED | settlement verified | Not final: a later `payout.transfer.failed` moves it to REVERSED |
| FAILED, CANCELLED | FAILED | FAILED_SAFE | No funds moved |
| APPROVAL_RECALLED / REJECTED / BLOCKED | FAILED | FAILED_SAFE | Never left Airwallex |
| anything else | UNKNOWN | UNKNOWN | Fail closed |

### Incident commander

- `pay(intent, grant)`: runs the rail. On UNKNOWN it opens an `UNKNOWN_AFTER_SUBMIT` incident. A second
  `pay` for the same intent is recorded as `RETRY_BLOCKED`.
- `scan()`: opens incidents for UNKNOWN attempts and for pending transfers older than 15 min (`STUCK_PENDING`).
- `reconcile(incidentId)`: lookup by `request_id`, then adopt, wait, safe retry or escalate.
- `handleWebhook({rawBody, timestamp, signature})`: verify, apply the `payout.transfer.*` status, resolve.
- Each incident has a timeline (each entry is hash-chained to the previous one), a runbook for its kind,
  `createCalls` (proof of no duplicate) and `retriesBlocked`.

## How to run

```bash
bun install
bun test packages/kernel/src/adapters/airwallex   # 30 tests, mocked HTTP layer
bun run test                                       # full suite
```

Public demo (simulated, no credentials, no money):

- API: `https://staging-railguard-s4ii.encr.app/v1/airwallex/incident-demo`
- Operator UI: `https://prebroadcast.vercel.app/incidents`

Live sandbox smoke (Airwallex sandbox = fake money). Add these to your local `.env`; values are never printed:

| Env var | Where |
|---------|-------|
| `AIRWALLEX_CLIENT_ID` | Airwallex sandbox web app > Developer > API keys |
| `AIRWALLEX_API_KEY` | Airwallex sandbox web app > Developer > API keys |
| `AIRWALLEX_BENEFICIARY_ID` | Sandbox > Payouts > Beneficiaries (create one test beneficiary) |
| `AIRWALLEX_WEBHOOK_SECRET` | Sandbox > Developer > Webhooks (for the live webhook endpoint, next step) |
| `AIRWALLEX_BASE_URL` (optional) | Defaults to `https://api-demo.airwallex.com`; non-sandbox hosts are refused |
| `AIRWALLEX_SOURCE_CURRENCY`, `AIRWALLEX_SMOKE_CURRENCY`, `AIRWALLEX_SMOKE_AMOUNT` (optional) | Default USD / USD / 1.00 |

```bash
bun scripts/airwallex-sandbox-smoke.ts
# writes evidence/airwallex-sandbox/manifest.json (request_id, transfer id, statuses, no secrets)
```

The smoke creates one transfer, checks that a second `execute` is blocked locally, replays the same
`request_id` at Airwallex (expects `request_id_duplicate`, no second transfer), and reconciles by `request_id`.

## Next steps inside the build window (Oct 25 – Nov 13)

1. Run the live sandbox smoke and commit `evidence/airwallex-sandbox/manifest.json`.
2. Add a signed webhook receiver (`POST /v1/airwallex/webhook`, raw body) backed by the
   `AIRWALLEX_WEBHOOK_SECRET` Encore secret. The verifier and handler already exist and are tested.
3. Persist attempts in Postgres (same shape as `PayoutAttempt`) so incidents survive restarts.
4. Point the Incidents view at live sandbox attempts, with a toggle between simulated and live.
5. Record the video.

## Demo script (Nov 13 submission, under 5 min, own voice)

1. **0:00 – 0:30 · Problem.** An agent pays a supplier on Airwallex, the create call times out, and the
   naive retry pays twice.
2. **0:30 – 1:30 · Scenario A (operator Incidents view).** The create landed but the response was lost, so the
   payout is UNKNOWN. The agent retries and gets *Duplicate payout blocked*. Reconcile by `request_id` finds the
   transfer, and the signed `payout.transfer.paid` webhook marks it CONFIRMED. Point at
   **Airwallex transfers created: 1** and **Create calls: 1**.
3. **1:30 – 2:30 · Scenario B.** The create never arrived. Reconcile waits out the grace window, finds nothing,
   and retries once with the same `request_id`. Result: one transfer, CONFIRMED.
4. **2:30 – 3:00 · Scenario C.** A forged webhook is rejected (`bad_signature`) and state is unchanged.
5. **3:00 – 4:00 · Live sandbox.** Run `bun scripts/airwallex-sandbox-smoke.ts` and show the transfer in the
   Airwallex sandbox dashboard with the same `request_id`, plus the replay rejected as duplicate.
6. **4:00 – 4:30 · Code + tests.** `rail.ts` rules 1–7 and `bun test packages/kernel/src/adapters/airwallex`.

## Judge path (5 minutes)

1. Open `https://prebroadcast.vercel.app/incidents` (public, simulated) and read scenarios A, B and C.
2. Open the raw JSON at `https://staging-railguard-s4ii.encr.app/v1/airwallex/incident-demo`.
3. Read `packages/kernel/src/adapters/airwallex/rail.ts` (the rules) and `incidentCommander.ts`.
4. Run `bun test packages/kernel/src/adapters/airwallex`.
5. Check `evidence/airwallex-sandbox/manifest.json` once the live sandbox smoke has been run.
