# Airwallex Agentic Banking Hackathon: submission draft

**Event:** Airwallex Agentic Banking Hackathon (HackerEarth), online, solo entry.
**Tracks:** Starter Kit 03 "Payment Ops Incident Commander" (main). Kit 11 "x402 Business Agents" as a second track (it also qualifies for the Metal Award: Metal + Airwallex tooling).
**Deadline:** project submissions due **Nov 13, 2026** (the official page gives no time; a listing says 11:59 PM IST, so aim for **Nov 12, 6:00 PM IST**). Finalists Nov 15. Demo day Nov 19 in San Francisco, remote allowed.
**Rules re-checked Oct 24, 2026** at <https://airwallex.hackerearth.com/>. Applications now close **Oct 25**, accepted teams hear on **Oct 27**, and the build period starts then. Submit a working demo, a video walkthrough under 5 minutes, and a repo link with setup steps. AI voice is allowed.

Railguard is an open-source project by Prasanth Kuna, a payments and backend engineer building solo.

---

## Title

**Railguard: Payment Ops Incident Commander**

## Tagline

Agents will move money. Railguard makes sure a timeout never becomes a double payment.

## The story (problem)

A payment agent sends a supplier payout. The request reaches Airwallex, but the response times out.
The agent sees an error and does what any retry loop does: it pays again. The queue redelivers the
job, and that is a third try. The supplier gets paid twice and finance spends a week clawing it back.

Teams usually treat a timeout as a failure. It is not a failure. It is **UNKNOWN**: the money may
already be moving. Railguard is the layer between the agent and Airwallex that knows the difference.

## What it does

- **One intent = one `request_id`.** Each payout has a deterministic Airwallex `request_id` built
  from the payee and the invoice. A rephrased or retried request maps to the same id.
- **Timeouts are UNKNOWN, never FAILED.** A timeout, 5xx, 409, 429 or `duplicate_request_id` holds
  the payout. Retries from the agent and from the queue are blocked.
- **Reconcile by `request_id`.** The incident commander looks the transfer up at Airwallex
  (`GET /api/v1/transfers?request_id=`), adopts it if it exists (amount, currency and beneficiary
  must match), and marks it CONFIRMED once, from a poll or a verified webhook.
- **One safe retry, only when proven safe.** If Airwallex has nothing after the grace window, the
  rail retries once with the **same** `request_id`. A second miss goes to a human.
- **Policy guard in code, not in the prompt.** The Gemini payment-ops agent only has typed tools.
  Above 1,000 USD it gets `APPROVAL_REQUIRED` and a human approves those exact terms. Per-payee
  and daily caps, a 24-hour hold on new payees, and a verified payee directory cannot be talked around.
- **Signed webhooks.** HMAC-SHA256 over timestamp + raw body, constant-time compare, a 5-minute
  window. Forged deliveries are rejected and payout state does not change.

## Proof (live Airwallex sandbox, fake money)

- Live chaos run `run_live_7e69a1ed1bbc_mvjwq247`, transfer `2a7f6ac2-8b11-4f08-88a0-1b6c4dab875a`:
  **transfers created 1, create calls 1, retries blocked 2, CONFIRMED.**
  File: `evidence/airwallex-sandbox/chaos-live.json`.
- Live smoke: the same `request_id` replayed at Airwallex returns `duplicate_request_id` and no
  second transfer appears. File: `evidence/airwallex-sandbox/manifest.json`.
- Sandbox webhook created through the API. File: `evidence/airwallex-sandbox/webhook.json` (ids only).
- Kit 11 on Metal testnet + Airwallex sandbox: `evidence/metal-testnet/kit11-live.json`,
  public page <https://railguard-site.vercel.app/proof/metal-testnet>.

## Try it (judges)

| Time | Do this | You should see |
|------|---------|----------------|
| 1 min, no keys | `bun install && bun scripts/airwallex-judge-demo.ts` | `transfers created 1`, `create calls sent 1`, `retries blocked 2`, `PASS: no scenario paid twice.` |
| 2 min, browser | <https://prebroadcast.vercel.app/incidents>, then **Chaos: force a timeout after create** (Simulated or Live sandbox) | Airwallex transfers created **1**, create calls **1** |
| 1 min, browser | Same page, **Ask the payment-ops agent**: `Pay Acme $1,200 for invoice 42` | `APPROVAL_REQUIRED`, then **Approve as human**, then paid once |
| 1 min | `bun test packages/kernel/src/adapters/airwallex` | all pass |
| raw JSON | `GET https://staging-railguard-s4ii.encr.app/v1/airwallex/runs` | stored runs, including relayed live sandbox runs |

Full engineering notes: [docs/grants/AIRWALLEX_BUILD.md](../../grants/AIRWALLEX_BUILD.md).
Kit 11: [docs/grants/AIRWALLEX_KIT11_METAL.md](../../grants/AIRWALLEX_KIT11_METAL.md).

## How it is built

```text
 plain request -> Gemini payment-ops agent -> typed tools only
                  (scripted offline model     create_payout, get_transfer, reconcile, list_incidents
                   when there are no keys)            |
                                                      v
                              Policy guard (code, not the model)
                     caps, new-payee hold, human approval bound to exact terms
                                                      | grant
                                                      v
               Incident commander -> Airwallex rail -> Airwallex Payouts API (sandbox)
               UNKNOWN -> block -> reconcile by request_id -> poll / signed webhook -> CONFIRMED
                                                      |
               Postgres (Encore): attempts, incidents, runs, webhook events
```

- TypeScript on Bun. The kernel adapter lives in `packages/kernel/src/adapters/airwallex/`
  (`rail.ts`, `incidentCommander.ts`, `agent.ts`, `policy.ts`, `chaos.ts`, `relay.ts`, `webhook.ts`).
- Encore API with Postgres stores attempts, incidents, runs and webhook events. It holds no
  Airwallex keys.
- The live sandbox runner is a Node route in the operator app on Vercel. It holds the sandbox keys
  as env vars and relays each run as an Ed25519-signed envelope, which the API verifies before storing.
- Airwallex APIs used: authentication, transfers create / get / list by `request_id`, sandbox
  transfer status simulation, webhooks create, FX conversions and simulated deposits (Kit 11).
- Gemini function calling for the agent, with a fallback chain and a deterministic offline model
  for tests and the public demo.

## Challenges

- **A timeout is the hardest case to test honestly.** We built a chaos wrapper that lets the real
  create reach the Airwallex sandbox and then drops the response, so the UNKNOWN path runs against
  the real API, not a mock.
- **Public live runs without leaking keys or money.** Live runs are capped per hour by fixed chaos
  invoices whose `request_id`s Airwallex itself will only accept once.
- **Keeping the model out of the money path.** The agent can ask, but only code decides. Extra tool
  arguments like `approved: true` or a raw `beneficiary_id` are ignored, and that is tested.
- **`PAID` is not final.** A later `payout.transfer.failed` moves a CONFIRMED payout to REVERSED,
  so the status mapping never treats PAID as final.

## What's next

- Move the attempt ledger behind the same Postgres row lock the kernel uses for on-chain rails.
- Batch payouts: one incident commander across a payout file, with per-line UNKNOWN handling.
- Approvals in Slack with the exact terms hash shown to the approver.
- Production Airwallex keys only after an external review. Today everything runs in the sandbox.

## Demo video script (under 5 min; AI voice allowed here)

The rendered 2:47 cut already exists (Remotion, captions on, Gemini TTS voice). It is not committed.
If the build period adds anything, re-render with the same structure:

1. **0:00-0:15 Hook.** "An agent retried a timed-out payout and paid twice."
2. **0:15-0:45 The agent.** Plain request, typed tools, `APPROVAL_REQUIRED`, a human approves.
3. **0:45-1:45 Live chaos.** Force a timeout on the real sandbox. UNKNOWN, retry blocked (agent
   and queue), reconcile by `request_id`, PAID, then CONFIRMED. Read out "transfers created 1,
   create calls 1".
4. **1:45-2:15 Evidence.** Stored run JSON, transfer id, the same `request_id`, the forged webhook
   rejected.
5. **2:15-2:45 Policy guard.** Caps, new-payee hold, a sneaky re-pay under the threshold blocked.
6. **2:45-3:15 Judge path.** `bun scripts/airwallex-judge-demo.ts` prints PASS in one second.
7. **3:15-3:45 Kit 11 (optional).** Three Metal testnet agents under one 20 USDZ total, the
   refusal when supplier costs rise, the approval, and the EUR fee paid from Airwallex.
8. **Close.** "Agents will move money. Railguard makes sure a timeout never becomes a double payment."

## Submission form (paste)

- **Project name:** Railguard: Payment Ops Incident Commander
- **Tracks:** Starter Kit 03 Payment Ops Incident Commander; Kit 11 x402 Business Agents (Metal Award)
- **Team:** solo (Prasanth Kuna)
- **Repository:** https://github.com/prasanthkuna/railguard-gateway
- **Live demo:** https://prebroadcast.vercel.app/incidents
- **Video:** (YouTube or Drive link, under 5 min)
- **Setup:** `bun install && bun scripts/airwallex-judge-demo.ts` (no keys); live sandbox steps in `docs/grants/AIRWALLEX_BUILD.md`
- **Short description (≤ 300 chars):** A guard between AI payment agents and Airwallex Payouts. A timeout becomes UNKNOWN, not FAILED. Retries are blocked, the transfer is found again by request_id, and it is marked CONFIRMED once. Policy lives in code, and humans approve the exact terms.
