# Arc Microgrant — portal paste (win-oriented)

Use after **`bun run verify-arc-microgrant-pack`** passes. Replace `TX_HASH` / explorer from manifest.

## Live links (always)

| Label | URL |
|-------|-----|
| Product | https://railguard-site.vercel.app |
| Arc proof (after deploy) | https://railguard-site.vercel.app/proof/arc-mainnet |
| Arc live (use now) | https://railguard-site.vercel.app/ecosystems/arc |
| Arc ecosystem | https://railguard-site.vercel.app/ecosystems/arc |
| Repo | https://github.com/prasanthkuna/railguard-gateway |
| Failure Lab | https://railguard-site.vercel.app/attack |

## Short description (form)

**Railguard** is an open-source **execution firewall for autonomous agents**: bind financial intent, detect UNKNOWN settlement states, reconcile without double-pay, and publish **CONFIRMED** receipts. On **Arc mainnet (5042)**, we verify **Circle USDC** transfers read-only from receipt logs—the same kernel used for Stellar, Monad, and Arbitrum proofs. Built for **agentic payouts** and **payment-ops incident** workflows (delayed transfer → investigate → single settlement).

## What uses Arc (technical)

- Chain **5042**, USDC ERC-20 `0x3600000000000000000000000000000000000000`
- Settlement module: `packages/settlement/src/arc-mainnet.ts`
- Evidence: `evidence/arc/manifest.json` — reproducible via `bun run arc-mainnet-evidence`
- Public proof page + committed manifest (no custodial wallet in the demo path)

## Mainnet tx (paste from manifest)

- **Tx:** `TX_HASH`
- **Explorer:** `EXPLORER_URL`
- **Amount:** 0.01 USDC proof transfer (minimal; same pattern as Monad Metropolis USDC verify)

## Why this wins (reviewer mental model)

1. **Already live** — public site, open repo, not a slide deck.
2. **Arc-native story** — USDC gas + USDC settlement verify fits Circle’s L1 thesis.
3. **Continues cleanly** — same codebase targets Circle Developer Grant + ETHGlobal Arc partner track.
4. **Agentic finance** — reconcile / UNKNOWN handling maps to real payout ops, not DeFi speculation.
5. **Low blast radius** — read-only verify + minimal on-chain spend; easy to audit.

## Builder profile

- GitHub: https://github.com/prasanthkuna
- X: @prasanth_kuna
- Product: Railguard (open-source personal project, solo builder, Hyderabad)

## After submit

Screenshot confirmation email / portal timestamp. Decisions rolling, all by **21 Oct 2026** per event page.
