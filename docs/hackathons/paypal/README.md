# Railguard × PayPal: safe payouts for AI agents

An AI accounts-payable agent pays invoices through **PayPal Payouts (sandbox)**. Railguard sits between the agent
and PayPal. It checks every payout before money moves, it never pays twice, and it never guesses when PayPal goes quiet.

Code: [`packages/rail-paypal`](../../../packages/rail-paypal) · Tests: `bun test packages/rail-paypal` · Evidence: [`evidence/`](./evidence)

## What it shows

| Step | What the agent tries | What Railguard does |
| --- | --- | --- |
| 1 | Pays 4 inbox invoices | Pays INV-1001. Refuses INV-1002 (`APPROVAL_REQUIRED`, over 500 USD), INV-1003 (`PAYEE_CHANGED`: the invoice swaps in a new PayPal email) and INV-1004 (`UNKNOWN_PAYEE`) |
| 2 | Pays INV-1002 after a human approves those exact terms | Pays it. The approval is bound to payee, receiver, amount, currency and invoice |
| 3 | Pays INV-1005; PayPal takes the payout but the response is lost | Marks it `UNKNOWN` and freezes the budget. It does not retry blindly |
| 4 | Pays INV-1006 | Refuses it (`DAILY_BUDGET`): frozen money still counts as spent |
| 5 | Retries INV-1005 | Blocks the retry (`BLOCKED_DUPLICATE`), then reconciles by PayPal-Request-Id and finds the one payout: `CONFIRMED` |

The run ends with a check that holds in every mode: **one PayPal payout per invoice**.

## How the rail works

`createPayPalExecutionRail` implements Railguard's `ExecutionRail` (prepare → execute → observe → reconcile):

- **Idempotency key.** Each payout intent gets a fixed `PayPal-Request-Id` (and a fixed `sender_batch_id`) derived from
  the intent id. PayPal keeps request ids for 30 days. Sending the same request id again returns the first result and never pays again.
- **Timeout = UNKNOWN.** A timeout, a lost connection or a 5xx after the request was sent means "we don't know". The attempt
  goes to `UNKNOWN`, the budget reservation is frozen, and new creates for that intent are blocked.
- **Reconcile by request id.** PayPal has no "search by request id". Railguard reconciles in this order:
  1. `GET /v1/payments/payouts/{batch_id}` if the batch id is known;
  2. replay the byte-identical create with the same `PayPal-Request-Id` (body hash checked, only inside 29 days). PayPal
     answers with the original batch, not a new payout;
  3. if PayPal answers "duplicate sender_batch_id", follow its link to the original batch.
- **Truth from PayPal.** The item `transaction_status` decides the state: `SUCCESS` → `CONFIRMED`; `UNCLAIMED`/`PENDING`/`ONHOLD` → pending;
  `FAILED`/`DENIED`/`BLOCKED` → failed (budget released); `RETURNED`/`REFUNDED`/`REVERSED` → reversed. If PayPal shows a different
  amount, currency or receiver, the attempt is `DISPUTED` and the money stays frozen.
- **Webhooks are hints.** `createPayPalWebhookHandler` verifies the signature with PayPal, drops repeated event ids, then re-reads the batch from PayPal.
- **Sandbox only.** The client calls `api-m.sandbox.paypal.com` only. HATEOAS links on `api.sandbox.paypal.com` are rewritten to that base; any other host is refused.

The AI agent (Gemini 2.5 Flash with function calling, or an offline scripted model) has five tools: `read_invoices`,
`pay_invoice`, `get_payout`, `reconcile_payout`, `budget_status`. It has no tool to approve, add payees or raise budgets.

## Live sandbox status (10 Nov 2026, 8:06 PM IST)

A live `bun run paypal:demo -- --live --save` run against a United States Sandbox Business app **passed**. This is a real PayPal sandbox result, not a simulation. The agent in this run was the scripted model (`scripted-offline`); `GEMINI_API_KEY` was not set.

| Invoice | Result | PayPal batch | Notes |
| --- | --- | --- | --- |
| INV-1001-2611101435 | `CONFIRMED` (item `SUCCESS`) | `YRUFL6J3GL6P2` | 180.00 USD, 1 create |
| INV-1002-2611101435 | `CONFIRMED` (item `SUCCESS`) | `3DB7ZVA7EQPPW` | 1,450.00 USD after a human approved the exact terms |
| INV-1003 / INV-1004 | `DENIED` | — | `PAYEE_CHANGED`, `UNKNOWN_PAYEE` |
| INV-1005-2611101435 | `CONFIRMED` (item `SUCCESS`) | `YRNQ62VPPNKUU` | Response dropped after PayPal accepted it (`UNKNOWN`, budget frozen); retry `BLOCKED_DUPLICATE`; reconcile followed PayPal's duplicate `sender_batch_id` link (`via: duplicate_batch_link`, 1 create + 1 replay) |
| INV-1006 | `DENIED` | — | `DAILY_BUDGET` (frozen money still counted) |

Budget: 1,725.00 of 2,000.00 USD used. PayPal create POSTs: 4. One payout per invoice: yes.

Evidence: [`evidence/paypal-sandbox-latest.json`](./evidence/paypal-sandbox-latest.json). An earlier US-app run left INV-1005 `UNKNOWN` because PayPal puts the duplicate-batch link under `details[].link` on `api.sandbox.paypal.com`; that is archived at [`evidence/paypal-sandbox-2026-11-10-pre-link-fix.json`](./evidence/paypal-sandbox-2026-11-10-pre-link-fix.json). A first Default Application probe was blocked (`PAYOUT_NOT_AVAILABLE`, India is receive-and-withdraw only): [`evidence/live-blocked-2026-11-10.json`](./evidence/live-blocked-2026-11-10.json).

## Run it

```bash
bun install
bun run paypal:demo                 # offline: PayPal simulator + scripted agent, no keys needed
bun run paypal:demo -- --live       # PayPal sandbox; uses Gemini if GEMINI_API_KEY is set
bun run paypal:demo -- --live --save   # also writes evidence/paypal-sandbox-latest.json
bun test packages/rail-paypal
```

Environment for `--live` (put them in `.env`, never commit it):

| Variable | Where to get it |
| --- | --- |
| `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` | developer.paypal.com → Apps & Credentials → **Sandbox** → create app (Payouts enabled) |
| `PAYPAL_SANDBOX_RECEIVER_EMAIL` | developer.paypal.com → Testing tools → Sandbox accounts → a **Personal** account email |
| `PAYPAL_SANDBOX_RECEIVER_EMAIL_2` (optional) | a second Personal sandbox account (otherwise both payees use the first one) |
| `GEMINI_API_KEY` (optional) | aistudio.google.com; without it the scripted model runs |
| `PAYPAL_AGENT_MODEL` (optional) | default `gemini-2.5-flash` |

In live mode, step 3 really sends the payout to the sandbox and then drops PayPal's response inside the client
(`createDropResponseAfterCreateFetch`), so the reconcile path is tested against real PayPal behaviour.
