# Monad Metropolis — portal paste (fill every field)

**Portal:** https://hackathon.monad.xyz/ (VPN/DNS if Excitel blocks `*.monad.xyz`)  
**Track (pick one):** **Trust, Identity & AI Infrastructure**  
**Logo (512×512):** `docs/grants/hackquest-railguard-logo-512.png`

---

## Project name

Railguard

## Tagline / one-liner

Policy-bound settlement for agentic payments.

## Short description (profile / summary)

Railguard is an open-source **financial execution firewall** for AI agents: policy before sign, authorization bound to recipient/asset/amount/network, broadcast tracking, on-chain settlement verification, and tamper-evident evidence.

**Built during Metropolis (Sep–Oct 2026):** Monad testnet integration — chain **10143**, USDC settlement-verify rail (`settlementVerifyRail`), fallback RPCs, reproducible evidence script (`bun run monad-testnet-evidence`), and public ecosystem slice.

Cross-chain maturity (same product): Arbitrum Sepolia SETTLED proof + Stellar Horizon CONFIRMED proof (links below).

## Long description / about the project

Autonomous agents need the same controls as human-treasury ops: nothing executes unless policy allows it, and every payment must reconcile to on-chain facts.

Railguard implements that loop for EVM and Stellar rails. On **Monad testnet**, we added read-only **settlement verification** for Circle USDC (`0x534b2f3A21130d7a60830c2Df862319e593943A3`) using the same kernel as Arbitrum/Stellar — no custom Monad-only architecture.

Judges can verify without login:

1. **Product:** https://railguard-site.vercel.app/ecosystems/monad  
2. **Failure Lab (APF):** https://railguard-site.vercel.app/attack  
3. **Arbitrum public proof:** https://railguard-site.vercel.app/proof/arbitrum-sepolia  
4. **Stellar public proof:** https://railguard-site.vercel.app/proof/stellar-testnet  
5. **Code:** https://github.com/prasanthkuna/railguard-gateway — `packages/settlement/src/monad-testnet.ts`, `packages/settlement/src/chains.ts`  
6. **Reproduce Monad verify:** clone repo → set `MONAD_TESTNET_*` env → `bun run monad-testnet-evidence`

## Progress during the hackathon (what’s new in the build window)

- Registered **Monad testnet** in settlement registry with production-grade RPC fallbacks (Ankr / Monadinfra / dRPC).  
- Shipped **`monad-testnet.ts`** + **`bun run monad-testnet-evidence`** + **`bun run verify-monad-metropolis-pack`**.  
- Wired **`settlementVerifyRail("monad-testnet")`** in integrations registry.  
- Published **/ecosystems/monad** on the marketing site and grant submit runbook in-repo.

## Demo / video URL

https://youtu.be/L-Gss08bzR0 (~84s judge-safe demo; same master as Arbitrum HackQuest)

## Live demo / website

https://railguard-site.vercel.app/

## GitHub / source code

https://github.com/prasanthkuna/railguard-gateway

## Monad testnet on-chain proof

Verified external-wallet USDC transfer on chain **10143**:

| Field | Value |
| --- | --- |
| Builder wallet | `0x9a3f50804306fDB12046243bDF2dB33D61dcBA2d` |
| Recipient | `0x8c7e2543aa8bf69dc8458Dc28104234f6a334233` |
| Amount | **1 USDC** (1000000 base units) |
| Tx hash | `0x1cbd46100de39c60d88d8d7ee7a1dc66cf2c9c16956ebb403b69c1751b98aab2` |
| Explorer | https://testnet.monadvision.com/tx/0x1cbd46100de39c60d88d8d7ee7a1dc66cf2c9c16956ebb403b69c1751b98aab2 |
| Public proof | https://railguard-site.vercel.app/proof/monad-testnet |
| Reproduce | `bun run monad-testnet-evidence` with the values in `evidence/monad-testnet/README.md` |

The manifest records `CONFIRMED` only after the receipt succeeds and its USDC `Transfer` event exactly matches token, sender, recipient, and amount. This proves the Monad verifier against a real transaction; it does not claim Railguard originated or custodied the external-wallet payment.

## Team

Prashanth Kuna — solo founder  
GitHub: https://github.com/prasanthkuna  
X: https://x.com/prasanth_kuna  
LinkedIn: https://www.linkedin.com/in/prasanth-kuna-1463631b3/

## Tags / technologies (if free-form)

AI agents, identity, policy, payments, USDC, security, infrastructure, EVM, Monad testnet

## Checklist before final submit (13 Oct)

- [ ] Track = **Trust, Identity & AI Infrastructure**  
- [ ] Public project profile is **visible**  
- [ ] Demo link + GitHub + short write-up filled  
- [ ] Logo uploaded  
- [x] Monad testnet USDC tx + explorer link in description
- [ ] Click **Submit** / publish profile (wording depends on portal UI)
