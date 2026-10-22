# Circle Developer Grant — submission pack

**Portal:** [circle.com/grant](https://www.circle.com/grant) (rolling)  
**Funding:** Milestone **USDC** (amount set per project)  
**Proof strategy:** [PROOF_STRATEGY.md](./PROOF_STRATEGY.md)

## Fit (why Railguard)

Circle prioritizes **Arc**, **USDC**, **agentic economic activity**, and **real financial flows**. Railguard is agent payout **policy + reconcile + settlement verify** — not a second wallet product.

## Proof bar (minimum before apply)

| Tier | Status | Artifact |
|------|--------|----------|
| Arc **testnet** readiness | Done | `bun run arc-testnet-evidence` |
| Arc **mainnet** proof | **Required for strong app** | `evidence/arc/manifest.json` via `arc-mainnet-usdc-proof` |
| Public product | Done | https://railguard-site.vercel.app |
| Open repo | Done | https://github.com/prasanthkuna/railguard-gateway |

**Cost:** Same as Arc microgrant bridge (~**$10–15 USDC** on 5042); one **0.01 USDC** proof tx. No extra spend beyond microgrant path if you already shipped Arc mainnet evidence.

## Milestones to propose (example)

1. **Arc mainnet** — CONFIRMED settlement verify + public proof URL (done in milestone 1 if manifest live).  
2. **CCTP / USDC** — document how agent payouts route to Arc USDC (architecture diagram + CLI).  
3. **Operator pilot** — staging API + one partner sandbox (PayPal or Airwallex) with reconcile receipts.  
4. **Traction** — hackathon submissions (ETHGlobal Mumbai Arc track) or SCF Build invite.

## Apply checklist

- [ ] Arc mainnet manifest committed; `verify-arc-microgrant-pack` or manual review  
- [ ] Grant portal: business summary, **Arc integration**, roadmap, milestone amounts  
- [ ] Link **evidence/arc/** and ecosystems page  
- [ ] Disclose AI use in docs/tests; core settlement code human-maintained (NLnet-style hygiene helps everywhere)

## Timing

Apply **after** Arc mainnet manifest is on `main` (same engineering as microgrant). Rolling review — no fixed deadline; do not rush before evidence exists.
