# Judge paths and submission notes

Long, event-specific walkthroughs that used to live in the main README. The README keeps a short
summary of each with the same headings, so existing links still work.

## Start here

| Surface | Link | Access |
| --- | --- | --- |
| Product | https://railguard-site.vercel.app/ | Public |
| Try it (Failure Lab, live runs, video) | https://railguard-site.vercel.app/demo | Public |
| All proofs | https://railguard-site.vercel.app/proof | Public, no sign-in |
| Metal testnet proof (Kit 11) | https://railguard-site.vercel.app/proof/metal-testnet | Public, no sign-in |
| Arbitrum Sepolia proof | https://railguard-site.vercel.app/proof/arbitrum-sepolia | Public, no sign-in |
| Monad testnet proof | https://railguard-site.vercel.app/proof/monad-testnet | Public, no sign-in |
| Stellar testnet proof | https://railguard-site.vercel.app/proof/stellar-testnet | Public, no sign-in |
| 84-second product demo | https://youtu.be/L-Gss08bzR0 | Public |
| Airwallex payout incidents | https://prebroadcast.vercel.app/incidents | Public |
| Kit 11 x402 agents (Metal testnet) | https://prebroadcast.vercel.app/x402-agents | Public |
| Railguard Operator | https://prebroadcast.vercel.app/ | Sign-in required |
| Staging API | https://staging-railguard-s4ii.encr.app | Reference API |

## Monad Metropolis entry

Monad Metropolis entry = tag `metropolis-submission` (`29ef757`); later work (Airwallex, Arc) came after the deadline.

## Airwallex Agentic Banking Hackathon (Track 3): 5-minute judge path

**Payment Ops Incident Commander.** A Gemini payment-ops agent pays suppliers on Airwallex. When a
create call times out after Airwallex made the transfer, the agent (and the job queue) retry.
Railguard blocks both retries, reconciles by `request_id`, and confirms **exactly one** transfer.

1. Open **https://prebroadcast.vercel.app/incidents** (public). Press **Force timeout** in *Simulated*,
   then switch to **Live sandbox** and press it again: a real Airwallex sandbox payout (fake money,
   1.00 USD) with the response dropped after create. Read the two big numbers:
   **Airwallex transfers created: 1** and **Create calls: 1**.
2. In **Ask the payment-ops agent**, run `Pay Acme $1,200 for invoice 42`: denied with
   `APPROVAL_REQUIRED`; press **Approve as human** and it pays. The agent has no approval tool.
3. Raw JSON: `GET https://staging-railguard-s4ii.encr.app/v1/airwallex/runs` (stored runs, Postgres),
   `/v1/airwallex/agent-demo` (policy story), `/v1/airwallex/webhook-events`.
4. Code: `packages/kernel/src/adapters/airwallex/` (`rail.ts`, `incidentCommander.ts`, `agent.ts`,
   `policy.ts`, `chaos.ts`). Tests: `bun install && bun test packages/kernel/src/adapters/airwallex`.
5. Evidence: `evidence/airwallex-sandbox/` (`chaos-live.json`, `manifest.json`, `webhook.json`).

Full build notes: [docs/grants/AIRWALLEX_BUILD.md](grants/AIRWALLEX_BUILD.md).

## Airwallex Kit 11 (x402 Business Agents) + Metal Award: 5-minute judge path

**Three agents, one Metal account, limits that move.** A data business sells market data per query
over x402 in `*USDZ` on Metal testnet. A sourcing agent buys upstream data, a support agent refunds
buyers, a treasury agent moves earnings to Airwallex and pays a EUR licence fee. Each spends under its
own on-chain mandate; Railguard holds the three budgets to **20 *USDZ** in code. When the upstream price
goes from 0.02 to 0.04 (above the 0.03 cap) the purchase is refused, the buyer is not charged, the
treasury agent (Gemini) proposes new limits, a person approves the exact terms, and the mandates are
replaced.

1. Open **https://prebroadcast.vercel.app/x402-agents** (public). Press **Run Kit 11** (simulator, same
   code), then scroll to the **recorded Metal testnet run**: every step links to
   `testnet.metalntwx.com`.
2. Recorded run `kit11-20261023T0437` (Metal testnet `eip155:63825` + Airwallex sandbox, fake money):
   - Business account `0x7C2AE2f9DeD3ff262790b5F6a95B0C7AA1828F5B` funded with exactly 20 *USDZ.
   - Upstream refusal recorded on chain (`mandate_cap_exceeded`, moves nothing):
     [0x9139ec9e…](https://testnet.metalntwx.com/tx/0x9139ec9ee4ca8462e6aa5898171ec14ec3376a24d5fd9a0c707846835b4bb875)
   - Approved rebalance `apr_185ce2053957b60aa6380c3c` (option C: query 0.05 → 0.07, 1 *USDZ from
     refunds to sourcing); mandates replaced:
     [support](https://testnet.metalntwx.com/tx/0x6f13990ea97c82d0bba5d8197ca6b94fe8efecd75ea79e47b438129a0b4d6f95),
     [sourcing](https://testnet.metalntwx.com/tx/0x993b0637b2fdd1007c378d06c37d4a50adc58962279ce1a669a22f7a111a4590).
   - Disputed batch: 3 signed orders verified against their payments; only the order that delivered
     wrong data refunded:
     [refund](https://testnet.metalntwx.com/tx/0x3ec8019584615902e94c1da2cc49da4d9d691ea4fe37220b3b5f7f126ac7fb42).
   - Earnings payout (re-sent with the same `rg_` payment id: `already paid, nothing sent`):
     [0x020a0c49…](https://testnet.metalntwx.com/tx/0x020a0c49f2c43074949893e34334ccd03c3e6bfa13b46e14515fa7b86ccc997c),
     credited in Airwallex as deposit `5344aea1-65a3-4892-b45e-a3eef664bd3d` (reference = Metal tx),
     converted (conversion `ae9bde08-1f0a-4042-ae0f-fc68423a3232`, 25 EUR) and paid as the EUR licence
     fee (transfer `336cc4a3-d9eb-4e42-9e53-d2ee2ef94255`).
   - `mandate verify` passes for all three agents from the chain alone.
3. Code: `packages/kernel/src/adapters/metal/` (`budget.ts` total + rebalance options + approval hash,
   `run.ts` the flow, `cliOutput.ts` UNKNOWN-on-doubt parsing, `rail.ts` simulator, `treasury.ts`
   Airwallex). Live lab: `labs/metal-kit11/live.ts` (x402 seller routes with `requireSignedOffer`,
   `metal-agent` mandates). Tests: `bun test packages/kernel/src/adapters/metal`.
4. Evidence: `evidence/metal-testnet/kit11-live.json`. Rerun: [docs/grants/AIRWALLEX_KIT11_METAL.md](grants/AIRWALLEX_KIT11_METAL.md).

## Verification

```powershell
bun run test:v5
bun run test:integrations
bun run testnet:all
bun run verify-arbitrum-sepolia-pack
bun run verify-monad-metropolis-pack
bun run verify-stellar-testnet-pack
encore check
```
