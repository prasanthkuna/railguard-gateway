# Ecosystem submission status

**Updated:** 2026-10-04

This is the operational source for current grant/hackathon state. Product-facing claims live in the public site manifest and proof pages.

## Canonical product links

| Surface | URL |
| --- | --- |
| Product | https://railguard-site.vercel.app/ |
| Failure Lab | https://railguard-site.vercel.app/attack |
| Arbitrum proof | https://railguard-site.vercel.app/proof/arbitrum-sepolia |
| Monad proof | https://railguard-site.vercel.app/proof/monad-testnet |
| Stellar proof | https://railguard-site.vercel.app/proof/stellar-testnet |
| Video | https://youtu.be/L-Gss08bzR0 |
| Gateway repo | https://github.com/prasanthkuna/railguard-gateway |

## Current status

| Program | Engineering/evidence | Portal state | Next action |
| --- | --- | --- | --- |
| Arbitrum Open House / HackQuest | Complete | **Submitted 2026-10-04** | No further build work unless judges request it |
| Stellar SCF #46 | Testnet proof complete | **Interest Form submitted 2026-10-04** | Wait for Build invitation; prepared Build application is in-repo |
| Monad Metropolis | **Complete** - 1 USDC testnet proof committed and public | **Pending** | Create/publicize project profile and final-submit by 2026-10-13 |
| Arc Microgrant | Adapter/testnet groundwork only | Registered, not submitted | Mainnet proof required before any submission claim |
| Airwallex Agentic Banking | Adapter is roadmap-level | No-go | Do not spend engineering time until official access is usable |
| Colosseum | No dedicated work | Optional | Pursue only if it requires no new product architecture |

## Monad final-submit gate

- [x] Monad chain 10143 registered in shared settlement layer
- [x] 1 USDC external-wallet transfer confirmed
- [x] Exact token, sender, recipient and amount matched from receipt logs
- [x] `evidence/monad-testnet/manifest.json` committed
- [x] Public proof page deployed
- [x] Video URL ready
- [x] Paste-ready portal copy ready
- [ ] Public project profile created
- [ ] Track set to **Trust, Identity & AI Infrastructure**
- [ ] GitHub, website, video, proof and tx added
- [ ] Final portal submit

Use [MONAD_METROPOLIS_PORTAL_PASTE.md](./MONAD_METROPOLIS_PORTAL_PASTE.md).

## Stellar

Interest Form is already submitted. Do not alter the story into a mainnet claim before the Build phase.

Next prepared artifact: [STELLAR_SCF_46_BUILD.md](./STELLAR_SCF_46_BUILD.md).

## Arc decision rule

Proceed only if the work remains:

`existing Railguard architecture -> Arc mainnet transaction -> evidence manifest -> public proof -> submit`

Do not create a second product, new frontend, or chain-specific architecture solely for the grant.
