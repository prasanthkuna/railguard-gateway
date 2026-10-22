# Airwallex build: Payment Ops Incident Commander (Track 3)

Railguard is an open-source project by Prasanth Kuna (payments & backend engineer, solo builder).
This page covers the Airwallex payout rail, the payment-ops agent and the incident commander built for the
Airwallex Agentic Banking Hackathon (HackerEarth, Starter Kit 03). Pitch: [AIRWALLEX_AGENTIC_BANKING.md](./AIRWALLEX_AGENTIC_BANKING.md).

**The one guarantee:** when an Airwallex transfer goes UNKNOWN (timeout, 5xx, lost response), Railguard
never creates a second transfer for the same intent. It blocks retries from the agent *and* from
infrastructure, reconciles by `request_id`, and marks the payout CONFIRMED exactly once.

> Agents will move money. Railguard makes sure a timeout never becomes a double payment.

| Milestone | Date |
|-----------|------|
| Build window | Oct 25 – Nov 13, 2026 |
| Submission due | Nov 13, 2026 |
| Demo day (remote OK) | Nov 19, 2026 |

## Judge path (5 minutes)

1. **https://prebroadcast.vercel.app/incidents** (public, no sign-in).
   - **Chaos: force a timeout after create.** *Simulated* runs on the in-memory Airwallex simulator.
     *Live sandbox* runs against the real Airwallex sandbox (`api-demo.airwallex.com`, fake money, 1.00 USD):
     the create reaches Airwallex, the response is dropped, the agent is told to pay again, a queue redelivers
     the job, Railguard blocks both, reconciles by `request_id`, the sandbox moves the transfer to PAID and a poll
     confirms it. Read **Airwallex transfers created: 1** and **Create calls: 1**.
   - **Ask the payment-ops agent.** `Pay Acme $1,200 for invoice 42` → `APPROVAL_REQUIRED`; **Approve as human** → paid.
   - **Policy guard** story, recorded scenarios A/B/C, and the webhook log.
2. Raw JSON on the staging API (`https://staging-railguard-s4ii.encr.app`):
   `GET /v1/airwallex/runs` (Postgres-stored runs incl. relayed live runs), `GET /v1/airwallex/agent-demo`,
   `GET /v1/airwallex/incident-demo`, `GET /v1/airwallex/incidents`, `GET /v1/airwallex/webhook-events`.
3. Code: `packages/kernel/src/adapters/airwallex/` — `rail.ts` (rules 1–7), `incidentCommander.ts`, `agent.ts`,
   `policy.ts`, `chaos.ts`, `relay.ts`.
4. Tests: `bun install && bun test packages/kernel/src/adapters/airwallex` (53 tests) and `bun run test` (full suite).
5. Evidence: `evidence/airwallex-sandbox/chaos-live.json` (live chaos run), `manifest.json` (live smoke),
   `webhook.json` (sandbox webhook created via API).

Live sandbox runs are capped at 3 per hour for the public (12 with the operator token). The cap is enforced by
Airwallex itself: each hour has fixed chaos invoices, so their `request_id`s can only ever be used once.

## Architecture

```text
 plain request ──► Gemini payment-ops agent ──► typed tools only
                    (offline scripted model     create_payout · get_transfer · reconcile · list_incidents
                     for tests / no keys)                │
                                                        ▼
                                  Policy guard (code, not the model)
                         caps · new-payee hold · human approval bound to exact terms
                                                        │ grant
                                                        ▼
                   Incident commander ──► Airwallex rail ──► Airwallex Payouts API (sandbox)
                   UNKNOWN → block → reconcile by request_id → poll / signed webhook → CONFIRMED
                                                        │
                   Postgres (Encore): attempts, incidents, runs, webhook events
```

- The agent never sees Airwallex credentials or bank details. Payees are resolved by name from a verified directory.
- **Two deployables.** The Encore API (staging) holds no Airwallex keys: it serves the simulator, the agent console
  (Gemini via the existing `GEMINI_API_KEY` secret, capped per hour) and Postgres storage. The live sandbox runner is a
  Node route in the operator app (Vercel) that holds the sandbox keys as env vars. Each live run or verified webhook is
  relayed to the API as an **Ed25519-signed envelope**; the API verifies it with the committed public key
  (`relayPublicKey.ts`) before storing it.

## What is built

| Piece | Path |
|-------|------|
| Airwallex API client (login, token cache, create/get/list transfers, sandbox status simulation, error classification) | `packages/kernel/src/adapters/airwallex/client.ts` |
| Status mapping (Airwallex to Railguard lifecycle and label) | `.../airwallex/status.ts` |
| Webhook signature check (HMAC-SHA256 of `x-timestamp` + raw body, constant-time, 5 min window) | `.../airwallex/webhook.ts` |
| Payout attempt ledger (one row per intent / `request_id`, rehydratable) | `.../airwallex/attemptStore.ts` |
| `ExecutionRail` implementation (prepare / execute / observe / reconcile, safe retry) | `.../airwallex/rail.ts` |
| Incident commander (detect, block, reconcile, poll, restore, timeline, runbook, hash chain) | `.../airwallex/incidentCommander.ts` |
| **Payment-ops agent** (Gemini function calling over REST, deterministic offline model, model fallback chain) | `.../airwallex/agent.ts` |
| **Policy guard** (per-payee daily cap, daily cap, new-payee hold, approval above threshold bound to terms) | `.../airwallex/policy.ts` |
| **Chaos run** (timeout injected after create, simulated or live sandbox, hourly live slots) | `.../airwallex/chaos.ts` |
| Agent + policy demo story | `.../airwallex/agentDemo.ts` |
| Signed relay envelopes (Ed25519) | `.../airwallex/relay.ts`, `relayPublicKey.ts` |
| Sandbox simulator (fault injection, status transitions) | `.../airwallex/simulator.ts` |
| API: agent, agent-demo, chaos, runs, relay, webhook, webhook-events, incidents | `apps/api/airwallexOps.ts`, migration `014_airwallex_ops.up.sql` |
| Live sandbox runner (Vercel Node routes `/airwallex-live/{status,chaos,webhook}`) | `apps/operator/lib/airwallexLiveRunner.ts`, `apps/operator/app/airwallex-live/` |
| Operator UI: Incidents (chaos panel, agent console, policy guard, webhook log) | `apps/operator/app/incidents/page.tsx`, `apps/operator/components/airwallex/Track3.tsx` |
| Scripts: live smoke, live chaos, webhook setup, relay keygen, Vercel env push | `scripts/airwallex-*.ts` |

### Rules the rail enforces

1. **Deterministic `request_id`.** `rg_` + first 40 hex chars of `sha256("railguard:airwallex:" + intentId)`.
   The agent's intent id is `payee + invoice`, so a retried or rephrased request maps to the same `request_id`.
2. **Grant check before prepare.** The grant is minted by the policy guard, must be `allow`, belong to the intent,
   use the same currency and reserve at least the amount.
3. **Ambiguous means UNKNOWN, never FAILED.** A network error, timeout, 5xx, 409 or 429 on create, or
   `duplicate_request_id`, moves the attempt to `UNKNOWN`. Only definite 4xx validation/auth failures are rejected.
4. **Fail closed.** `execute` refuses while an attempt is CREATING, SUBMITTED, UNKNOWN, CONFIRMED, FAILED, REVERSED or DISPUTED.
5. **Reconcile by `request_id`** (`GET /api/v1/transfers?request_id=...`). A found transfer is adopted; amount,
   currency and beneficiary must match, otherwise the attempt is DISPUTED and escalated.
6. **One safe retry.** Only after a reconcile returned not-found, once the grace window has passed (2 min), and always
   with the **same** `request_id`. A second miss escalates to a human.
7. **Webhooks are verified before parsing.** Bad signature, missing headers, a stale timestamp or a missing secret all
   mean the event is rejected and payout state is untouched.

### Policy guard (the agent gets a structured denial, never a way around it)

| Code | When | Next step given to the agent |
|------|------|------------------------------|
| `APPROVAL_REQUIRED` | amount > 1,000 USD and no human approval for these exact terms (payee, amount, currency, invoice) | stop and ask a human; do not lower the amount |
| `PER_PAYEE_CAP` | payee would exceed 2,500 USD today (an approval cannot override a cap) | split across days or change policy |
| `DAILY_CAP` | all payouts would exceed 5,000 USD today | wait or change policy |
| `NEW_PAYEE_HOLD` | payee verified less than 24 h ago | wait or ask finance |
| `UNKNOWN_PAYEE` | payee not in the verified directory | finance adds it; agents cannot add bank details |
| `CURRENCY_NOT_ALLOWED`, `INVALID_AMOUNT` | outside policy | escalate |

Approvals come only from the human channel (operator UI / API). Extra tool arguments such as `approved: true` or a
`beneficiary_id` are ignored (tested).

### Status mapping

| Airwallex status | Railguard label | Lifecycle | Notes |
|------------------|-----------------|-----------|-------|
| IN_APPROVAL, SCHEDULED, OVERDUE, PROCESSING, CANCELLATION_REQUESTED | PENDING | SUBMITTED | |
| SENT | PENDING | SUBMITTED | Sent from Airwallex, not yet paid |
| PAID | CONFIRMED | settlement verified | Not final: a later `payout.transfer.failed` moves it to REVERSED |
| FAILED, CANCELLED | FAILED | FAILED_SAFE | No funds moved |
| APPROVAL_RECALLED / REJECTED / BLOCKED | FAILED | FAILED_SAFE | Never left Airwallex |
| anything else | UNKNOWN | UNKNOWN | Fail closed |

## Webhooks

- A sandbox webhook for `payout.transfer.{processing,sent,paid,failed,cancelled}` was created through the API
  (`POST /api/v1/webhooks/create`) by `scripts/airwallex-webhook-setup.ts`, pointing at the live runner
  `https://prebroadcast.vercel.app/airwallex-live/webhook`. The returned secret went straight into the local `.env` and
  the runner's env; it is never printed or committed (`evidence/airwallex-sandbox/webhook.json` records ids only).
- The runner verifies each delivery, then relays it (Ed25519-signed) to `POST /v1/airwallex/relay`, which logs it and
  applies it to the stored attempt.
- The API also exposes `POST /v1/airwallex/webhook` (raw body, same verifier). On staging it fails closed
  (`missing_secret`) until `AIRWALLEX_WEBHOOK_SECRET` is configured there; forged deliveries are logged as rejected.

## How to run

```bash
bun install
bun test packages/kernel/src/adapters/airwallex   # agent, policy, chaos, relay, rail, commander
bun run test                                       # full suite
```

Live sandbox (fake money). Local `.env` (values never printed):

| Env var | Where |
|---------|-------|
| `AIRWALLEX_CLIENT_ID`, `AIRWALLEX_API_KEY` | Sandbox web app > Developer > API keys |
| `AIRWALLEX_BENEFICIARY_ID` | Sandbox > Payouts > Beneficiaries |
| `AIRWALLEX_WEBHOOK_SECRET` | written by `scripts/airwallex-webhook-setup.ts` |
| `RAILGUARD_RELAY_PRIVATE_KEY` | written by `scripts/airwallex-relay-keygen.ts` (public half is committed) |
| `GEMINI_API_KEY`, `AIRWALLEX_AGENT_MODEL` (optional, default `gemini-3.8-flash`, falls back to `gemini-2.5-flash`, then offline) | Google AI Studio |
| `AIRWALLEX_BASE_URL` (optional) | Defaults to `https://api-demo.airwallex.com`; non-sandbox hosts are refused |

```bash
bun scripts/airwallex-sandbox-smoke.ts     # create, replay same request_id, reconcile -> manifest.json
bun scripts/airwallex-chaos-live.ts        # chaos run -> chaos-live.json, relayed to staging
bun scripts/airwallex-webhook-setup.ts https://prebroadcast.vercel.app/airwallex-live/webhook
bun scripts/airwallex-vercel-env.ts        # push runner env vars to the operator project (stdin, never printed)
```

On some Windows networks Bun's `fetch` stalls on `generativelanguage.googleapis.com` while Node works. Then bundle and
run under Node: `bun build scripts/airwallex-chaos-live.ts --target=node --outfile=.tmp/chaos-live.mjs && node --env-file=.env .tmp/chaos-live.mjs`.

## Demo video (under 5 min, AI voice — allowed for this hackathon)

1. **0:00 – 0:15 · Hook.** "An agent retried a timed-out payout and paid twice."
2. **0:15 – 0:45 · The agent.** Plain request, typed tools, policy denial `APPROVAL_REQUIRED`, human approves.
3. **0:45 – 1:45 · Live chaos.** Force timeout on the real sandbox: UNKNOWN, retry blocked (agent + queue), reconcile by
   `request_id`, PAID → CONFIRMED. **Airwallex transfers created: 1 · Create calls: 1**.
4. **1:45 – 2:15 · Evidence.** Stored run JSON, transfer id, same `request_id`; forged webhook rejected.
5. **2:15 – 2:45 · Policy guard.** Caps, new-payee hold, sneaky re-pay under the threshold blocked.
6. **2:45 – 3:15 · Code + tests.** Rules 1–7, the test run.
7. **Close.** "Agents will move money. Railguard makes sure a timeout never becomes a double payment."

**Rendered cut (2:47, 1920x1080, captions on).** Actual timings: hook 0:00-0:13, failure explained 0:13-0:26,
agent + policy denial + human approval 0:26-0:56, live chaos 0:56-1:34 (live sandbox run
`run_live_7e69a1ed1bbc_mvjwq247`, transfer `2a7f6ac2-8b11-4f08-88a0-1b6c4dab875a`: transfers created 1, create calls 1,
retries blocked 2, CONFIRMED), evidence JSON 1:41, forged webhook 1:51, policy guard 2:00, code 2:15, tests 2:25,
judge path 2:31, close 2:40. Voice: Gemini TTS (prebuilt voice Algieba), mastered with two-pass loudnorm
(I=-16 LUFS, TP=-1.5). Built with Remotion locally; the video sources and renders are not committed.
