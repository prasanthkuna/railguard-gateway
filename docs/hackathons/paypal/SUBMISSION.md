# Devpost submission draft: PayPal AI Hackathon

> Draft for Prasanth to review and paste into Devpost. Add the YouTube link after the demo video is uploaded.
>
> **Live run (10 Nov 2026, 8:06 PM IST):** passed against a United States PayPal sandbox business app. Scripted agent (`scripted-offline`). Three payouts CONFIRMED at PayPal: INV-1001 `YRUFL6J3GL6P2`, INV-1002 `3DB7ZVA7EQPPW` (after human approval), INV-1005 `YRNQ62VPPNKUU` (response lost, retry blocked, reconciled via PayPal's duplicate `sender_batch_id` link, 1 create + 1 replay). INV-1003/1004/1006 denied (`PAYEE_CHANGED`, `UNKNOWN_PAYEE`, `DAILY_BUDGET`). Budget 1,725.00 / 2,000.00 USD. One payout per invoice. Evidence: `docs/hackathons/paypal/evidence/paypal-sandbox-latest.json`.

**Project name:** Railguard for PayPal Payouts

**Tagline:** Let an AI agent pay invoices through PayPal, without ever paying twice, paying a changed payee, or guessing when PayPal goes quiet.

**Links**
- Repo (Apache-2.0): https://github.com/prasanthkuna/railguard-gateway (code in `packages/rail-paypal`, docs in `docs/hackathons/paypal`)
- Demo video (YouTube, under 3 min): TODO
- Run it: `bun install && bun run paypal:demo` (offline) or `bun run paypal:demo -- --live` (PayPal sandbox)

## Inspiration

AI agents are starting to pay real bills. The dangerous moments are not the happy path. They are the edges:
an invoice that quietly swaps the PayPal email, a payout that is too big, and the timeout where nobody knows if the money went out.
A naive agent retries, and the supplier is paid twice. A careful human checks first. We wanted the agent to behave like the careful human, every time.

## What it does

An AI accounts-payable agent reads an invoice inbox and pays through PayPal Payouts. Every payout goes through Railguard first:

- **Refuses** unknown payees, changed payee details (a classic invoice-fraud trick), wrong currencies, payouts over the cap and payouts over the daily budget.
- **Asks a human** above 500 USD. The approval is bound to the exact payee, PayPal account, amount, currency and invoice, so the agent cannot change the terms after approval.
- **Never pays twice.** Each invoice gets one fixed `PayPal-Request-Id`. If PayPal does not answer, the payout is `UNKNOWN`, the money is frozen in the budget, retries are blocked, and Railguard reconciles with PayPal using that same request id.
- **Trusts PayPal, not the agent.** The final state comes from PayPal's item `transaction_status`. Webhooks are verified with PayPal and then re-read, never trusted on their own.

The demo ends with a hard check: one PayPal payout per invoice.

## How we built it

- **TypeScript on Bun**, inside Railguard's open-source kernel. The new package `packages/rail-paypal` implements Railguard's `ExecutionRail` interface (prepare, execute, observe, reconcile) for PayPal Payouts.
- **PayPal APIs (sandbox):** OAuth client credentials, `POST /v1/payments/payouts` with `PayPal-Request-Id`, `GET /v1/payments/payouts/{id}`, and `POST /v1/notifications/verify-webhook-signature`.
- **Reconcile by request id:** PayPal keeps a request id for 30 days and returns the original result when it is sent again. Railguard replays the byte-identical request (body hash checked) to recover a lost response. If PayPal reports a duplicate `sender_batch_id`, Railguard follows PayPal's link to the original batch.
- **AI:** The agent has five tools (read invoices, pay, get payout, reconcile, budget status) and no tool to approve, add payees or raise limits. Google Gemini 2.5 Flash can drive it when `GEMINI_API_KEY` is set. The recorded live sandbox run used the scripted model (`scripted-offline`) with the same tools; no Gemini key was configured for that run.
- **Chaos drill:** in live mode the client really sends one payout to the PayPal sandbox and then drops the response, so the timeout path is tested against real PayPal.
- **Tests:** 22 unit and end-to-end tests (`bun test packages/rail-paypal`) with a PayPal simulator that copies PayPal's request-id replay and duplicate-batch rules, plus fixtures from the live sandbox error shape.

**AI tools used:** The live demo agent was the scripted model, not Gemini. Gemini 2.5 Flash is wired as an optional agent runtime (function calling) when a key is set. TODO (Prasanth): list any AI coding assistant you used while building, and how.

## What changed during the hackathon

Railguard existed before the hackathon as a payment guard for crypto rails. Everything PayPal is new and was built during the
submission period: the PayPal client, the Payouts execution rail, request-id reconcile, the status mapping, the budget freeze,
webhook verification, the AP agent with Gemini, the PayPal simulator, the chaos drill, the tests and these docs (see the git history of `packages/rail-paypal`).

## Challenges we ran into

- **There is no "find payout by request id" API.** We had to reconcile by replaying the exact same request, and prove that this is safe: same request id, same body, inside PayPal's 30-day window.
- **"Success" is not the end.** A `SUCCESS` payout can later be `RETURNED` or `REVERSED`, and `UNCLAIMED` can last 30 days. The rail keeps watching and only frees or commits money on real states.
- **Timeouts are ambiguous.** Treating a timeout as "failed" causes double payments, and treating it as "paid" hides losses. We made `UNKNOWN` a first-class state that freezes money and blocks retries.
- **Sandbox sender country.** A first probe with India-based Default Application credentials was rejected (`PAYOUT_NOT_AVAILABLE`). India can receive and withdraw payouts but cannot send them. A United States Sandbox Business account and Merchant app unblocked the live run.
- **Live PayPal error shape.** Replaying a lost create does not always return the original batch body. PayPal answered `USER_BUSINESS_ERROR` (duplicate `sender_batch_id`) with the original-batch HATEOAS link under `details[].link` on `api.sandbox.paypal.com`, not on the top-level `links` array. The client now reads that shape and rewrites the sandbox host alias.

## Accomplishments we're proud of

- A real AI agent that tries to do the wrong thing in five different ways and is stopped each time with a clear reason and next step.
- The double-payment check holds against the simulator (22 unit/e2e tests) and against the PayPal sandbox: one payout per invoice, and the lost-response invoice recovered as a single CONFIRMED batch (`YRNQ62VPPNKUU`) after an idempotent replay.

## What we learned

Idempotency is not a header. It is a promise you must keep across timeouts, retries, restarts and webhooks.

## What's next for Railguard for PayPal

- Store attempts in Railguard's Postgres ledger so a restarted agent resumes reconcile.
- Approval requests in Slack or email with the exact terms attached.
- PayPal Orders for agent purchases (buyer side), with the same UNKNOWN and reconcile rules.
- Per-vendor limits learned from payment history.
