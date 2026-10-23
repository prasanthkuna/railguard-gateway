# Airwallex Kit 11 "x402 Business Agents" + Metal Award

Railguard's entry for the Airwallex Agentic Banking Hackathon (applied on Track 3) also runs Kit 11 and
uses Metal + Airwallex tooling, which the $15K Metal Award asks for.

## What the kit asks for, and where it is

| Kit 11 requirement | Where |
| --- | --- |
| Three agents (sourcing, support, treasury) on one Metal account, each under its own mandate | `labs/metal-kit11/live.ts` (`issueMandate`, `bind`), `initialAllocation` in `kit11.ts` |
| Budgets 10 / 4 / 6 *USDZ, sourcing cap 3 cents, query 5 cents, upstream 2 cents; all in code | `packages/kernel/src/adapters/metal/kit11.ts` |
| The account caps each budget, not the sum: hold the 20 in code | `validateAllocation` in `budget.ts` (runs before every replace) |
| Payees listed for sourcing and treasury, open for support | `validateAllocation` + `--payee` in `issueMandate` |
| Customer agent pays a route that requires a signed order | `startQueryRoute` (`requireSignedOffer`, `SIGNED_OFFER_REQUIRED`, `signedOfferOf`) |
| Upstream price rises past the cap, purchase refused, buyer not charged | route answers 502 on refusal; Railguard reconciles the buyer's UNKNOWN answer against the facilitator's `/settlements` |
| Show the refusal and verify it from the chain | `mandate pull --record-refusal`, then `mandate verify` |
| Treasury agent proposes new limits (with or without a higher price); you approve; mandates replaced | `rebalanceOptions`, `decideRebalance` (Gemini, validated, scripted fallback), `approvalHash`, `mandate replace` (shrinking budgets first) |
| Disputed batch: signed orders prove the buyer's agent placed them; refund only wrong data | `mandate verify --tx --signed-offer` per order, `decideDispute`, `mandate pull --payment-id` |
| Earnings to Airwallex (sandbox cannot take stablecoins) | treasury `mandate pull` to a Metal address we hold, then `POST /simulation/deposit/create` with the tx hash as `reference`, checked with `GET /deposits` |
| Convert and pay the EUR licence fee | `POST /fx/conversions/create` (looked up by `request_id` first), EUR beneficiary, `POST /transfers/create` (reconciled by `request_id` first) |
| A timeout is unconfirmed: rerun the same pull; look up a purchase before paying again | `pullOnce` (same payment id), `classifyPay`/`classifyPull` (UNKNOWN on doubt), `findSettlement` |

Every money movement has a deterministic Railguard id: `rg_` + sha256 of the intent. It is the Metal
`--payment-id` and the Airwallex `request_id`, so a retry of the same intent is the same payment.

## Rerun it

Keys live outside the repo in `%USERPROFILE%\.railguard-metal` (testnet only, never committed).

```powershell
cd labs/metal-kit11
npm install
# one-time: EUR licensor beneficiary + USD global account in the Airwallex sandbox (ids go to ../../.env)
node --env-file=../../.env --import tsx airwallex-setup.ts
# full run (about 6 minutes): Metal testnet + Airwallex sandbox + Gemini
node --env-file=../../.env --import tsx live.ts --approve-limits
```

Setup that was needed once (all self-serve, no sign-up): `metal-agent key create`, `metal-agent fund`
(faucet), an RPC endpoint bought over x402 with `metal-agent pay https://rpc-testnet.metalntwx.com/v1`,
and `metal-agent account create` for the business and the simulated customer.

Without `--approve-limits` the run stops at the approval step and escalates (nothing replaced).
