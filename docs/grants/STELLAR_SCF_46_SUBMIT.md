# Stellar SCF #46 — submission pack

**Strategy:** Horizon testnet settlement verify + public proof page + committed evidence. Full **Build** application only after Interest Form invite; deadline **November 8, 2026**. Costs / tiers: [PROOF_STRATEGY.md](./PROOF_STRATEGY.md).

**Verify locally:** `bun run verify-stellar-scf-pack` · **Re-run evidence:** `bun run stellar-testnet-evidence`

## Checklist

### Chain — Stellar testnet

- [x] Horizon payment verify **CONFIRMED** — tx `3dc3225844f711f9f96ead65690d224b7ccfd616d1da5387df6bfc63bfb8e437`
- [x] `bun run stellar-testnet-evidence` → `evidence/stellar-testnet/manifest.json`
- [x] Integration rail — `packages/integrations/src/rails/stellarRail.ts`
- [x] **Soroban policy contract** deployed (2026-10-23) - `CBUY5JNZEGYR7I3QJEIALF2DR4NNS3OHEBOS7CGEXY2J4VU64IM7ZL5N`: per-agent budget, intent binding (recipient/asset/amount), deterministic request id, duplicates/replays rejected; 15 contract tests
- [x] Execute with **Circle testnet USDC** CONFIRMED - tx `2e8c13fab4feb88a451ec617dc9c5a129a600e7e6dc62c1868d67336702f8353` - `bun run stellar-soroban-policy-evidence` -> `evidence/stellar-soroban-policy/manifest.json`
- [ ] Re-run evidence before final Build submit if manifest timestamp stale

### Site & repo

- [x] `/ecosystems/stellar` live
- [x] `/proof/stellar-testnet` page in repo
- [x] `evidence/stellar-testnet/` whitelisted in `.gitignore` (README + manifest committed)
- [x] Production proof URL returns 200 — `bun run verify-stellar-scf-pack`
- [x] Failure Lab `/attack` live (cross-ecosystem APF demo)

### SCF portal (human steps)

- [x] **Interest Form submitted** (2026-10-04) — copy archived: [STELLAR_SCF_46_INTEREST_FORM.md](./STELLAR_SCF_46_INTEREST_FORM.md)
- [ ] **Watch inbox** (Discord-linked email) for SCF **Build invite**
- [ ] Full Build app — [STELLAR_SCF_46_BUILD.md](./STELLAR_SCF_46_BUILD.md) · submit by **2026-11-08**
- [ ] Optional before Build: Stellar-first demo clip (Interest used proof links; Build may ask for video)

## Paste for reviewers

| Field | Value |
| --- | --- |
| **Start — public proof** | https://railguard-site.vercel.app/proof/stellar-testnet |
| Horizon tx | https://horizon-testnet.stellar.org/transactions/3dc3225844f711f9f96ead65690d224b7ccfd616d1da5387df6bfc63bfb8e437 |
| Soroban policy contract | https://stellar.expert/explorer/testnet/contract/CBUY5JNZEGYR7I3QJEIALF2DR4NNS3OHEBOS7CGEXY2J4VU64IM7ZL5N |
| Soroban execute (USDC) | https://stellar.expert/explorer/testnet/tx/2e8c13fab4feb88a451ec617dc9c5a129a600e7e6dc62c1868d67336702f8353 |
| Stellar page | https://railguard-site.vercel.app/ecosystems/stellar |
| Reproduce | `bun run stellar-testnet-evidence` (https://github.com/prasanthkuna/railguard-gateway) |
| Failure Lab | https://railguard-site.vercel.app/attack |
| Cross-chain reference | https://railguard-site.vercel.app/proof/arbitrum-sepolia |

## Phase status

| Phase | Status |
| --- | --- |
| Interest Form | **Done** (2026-10-04) |
| Build invite | **Waiting** on SDF email |
| Full Build (Nov 8) | **Draft** in [STELLAR_SCF_46_BUILD.md](./STELLAR_SCF_46_BUILD.md) |
| Public proof + GitHub evidence | **Live** — `bun run verify-stellar-scf-pack` |
