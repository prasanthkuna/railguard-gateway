# Stellar SCF #46 — submission pack

**Strategy:** Horizon testnet settlement verify + public proof page + committed evidence. Full **Build** application only after Interest Form invite; deadline **November 8, 2026**.

**Verify locally:** `bun run verify-stellar-scf-pack` · **Re-run evidence:** `bun run stellar-testnet-evidence`

## Checklist

### Chain — Stellar testnet

- [x] Horizon payment verify **CONFIRMED** — tx `3dc3225844f711f9f96ead65690d224b7ccfd616d1da5387df6bfc63bfb8e437`
- [x] `bun run stellar-testnet-evidence` → `evidence/stellar-testnet/manifest.json`
- [x] Integration rail — `packages/integrations/src/rails/stellarRail.ts`
- [ ] Re-run evidence before final Build submit if manifest timestamp stale

### Site & repo

- [x] `/ecosystems/stellar` live
- [x] `/proof/stellar-testnet` page in repo
- [x] `evidence/stellar-testnet/` whitelisted in `.gitignore` (README + manifest committed)
- [ ] Production proof URL returns 200 — run `bun run verify-stellar-scf-pack` after Vercel deploy
- [x] Failure Lab `/attack` live (cross-ecosystem APF demo)

### SCF portal (human steps)

- [ ] **Interest Form submitted ASAP** — field copy: [STELLAR_SCF_46_INTEREST_FORM.md](./STELLAR_SCF_46_INTEREST_FORM.md)
- [ ] Paste real **Email** and **LinkedIn** on the form
- [ ] Wait for **Build invite email** before full proposal
- [ ] Full Build app — [STELLAR_SCF_46_BUILD.md](./STELLAR_SCF_46_BUILD.md) · submit by **2026-11-08**

## Paste for reviewers

| Field | Value |
| --- | --- |
| **Start — public proof** | https://railguard-site.vercel.app/proof/stellar-testnet |
| Horizon tx | https://horizon-testnet.stellar.org/transactions/3dc3225844f711f9f96ead65690d224b7ccfd616d1da5387df6bfc63bfb8e437 |
| Stellar page | https://railguard-site.vercel.app/ecosystems/stellar |
| Reproduce | `bun run stellar-testnet-evidence` (https://github.com/prasanthkuna/railguard-gateway) |
| Failure Lab | https://railguard-site.vercel.app/attack |
| Cross-chain reference | https://railguard-site.vercel.app/proof/arbitrum-sepolia |

## Readiness vs Arbitrum HackQuest

| Item | Arbitrum | Stellar SCF #46 |
| --- | --- | --- |
| Public proof URL | Live | **Deploy** after merge |
| Evidence on GitHub | Committed | **Commit** `evidence/stellar-testnet/` |
| Portal submission | Submitted | **Interest Form pending** |
| Video | 90s unlisted | Optional for Interest; plan for Build |
| Full grant form | HackQuest fields | **Build app post-invite** |
