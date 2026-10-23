# MoonPay PayBox plugin: submission draft (Railguard Guard)

**Status:** plugin built and **conformance passed** (PayBox starter v1.0.2, 3 tools). The
**upload is waiting** for Prasanth.

**Rules re-checked Oct 24, 2026** at <https://paybox.moonpay.com/challenge> and the starter README:
- Chapter 1 is over. **Chapter 2 is not announced yet** ("a new mission every full moon"). When it
  opens, check its theme and dates, and re-run `pnpm test` with the latest starter.
- Plugins are one bundled `dist/plugin.mjs` (stdio MCP, Node 24). Each tool call gets a fresh
  process with a 10 s budget and no saved state. Payments are proposed, never signed by the plugin.
- x402 in PayBox: **Base mainnet USDC or Solana mainnet only**. That is real money, so this
  repo makes no live payment. The user approves any payment inside PayBox.

## Title

**Railguard Guard: check the price before your agent pays**

## Tagline

An x402 spend guard for PayBox: allowed hosts, a per-call cap and a payee check, before PayBox
even asks you to approve.

## Story

x402 makes paying for an API as easy as one HTTP call. That is also the risk: an agent can be
pointed at a look-alike host, a price can jump, or a seller can swap the payee. Railguard Guard
reads the 402 quote first and checks it against rules the owner set. It proposes the payment only
if every rule passes, for exactly the quoted amount. Otherwise it tells the agent why, and nothing
is proposed.

## How it is built

- The official PayBox starter (unchanged runtime files), plus `src/guard.ts` (pure checks) and
  `src/plugin.ts` (3 tools).
- It parses x402 v1 bodies and v2 `payment-required` headers, and accepts only the Base USDC
  `exact` option.
- Uses a deterministic request id per endpoint and purpose, so the agent's logs and Railguard's
  logs line up.
- Read-only tools are annotated as read-only. The proposal tool is not destructive: PayBox still
  asks the user.

## Challenges

- No saved state between calls, so a daily budget cannot live in the plugin. The per-call cap is
  enforced here, and the budget belongs in Railguard's kernel (next step).
- Fitting a network fetch plus checks inside the 10 s budget: one fetch with a timeout, no retries.

## What's next

- Daily budget and approvals via the hosted Railguard API (signed, no secrets in the plugin).
- Solana x402 option, using `packages/rails/solana` checks.

## Demo script (2 min)

1. Show the policy (`railguard_policy`).
2. `check_paid_request` on an allowed host: ALLOW with the price and payee.
3. The same call on a look-alike host: `HOST_NOT_ALLOWED`.
4. An endpoint priced above the cap: `OVER_PER_CALL_CAP`, nothing proposed.
5. `propose_guarded_paid_request` on the allowed host: the PayBox approval screen appears. Stop
   there unless Prasanth chooses to approve a real (mainnet) payment himself.

## Only Prasanth can do

1. Sign in to PayBox (MoonPay account, KYC if asked).
2. When Chapter 2 opens, read its rules. Then run `pnpm install && pnpm test` in
   `packages/rails/paybox-plugin` and upload `dist/plugin.mjs`.
3. Set `RAILGUARD_ALLOWED_HOSTS` and `RAILGUARD_PER_CALL_CAP_ATOMIC` in the plugin settings.
4. Any live x402 payment is real money on Base mainnet. Only he decides whether to approve it.
