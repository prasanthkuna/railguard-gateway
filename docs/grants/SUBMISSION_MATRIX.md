# Ecosystem submission status

**Updated:** 2026-10-22  
**Proof playbook (costs, testnet vs mainnet):** [PROOF_STRATEGY.md](./PROOF_STRATEGY.md)  
**Master pack (every submission):** [LAUNCH.md](../../../LAUNCH.md) — site URLs, video, APF atlas, GitHub pins.

This is the operational source for current grant/hackathon state. Product-facing claims live in the public site manifest and proof pages.

## Canonical product links

| Surface | URL |
| --- | --- |
| Site | https://railguard-site.vercel.app/ (`/attack`, `/proof/*`, `/ecosystems/*`) |
| Failure Lab | https://railguard-site.vercel.app/attack |
| Arbitrum proof | https://railguard-site.vercel.app/proof/arbitrum-sepolia |
| Monad proof | https://railguard-site.vercel.app/proof/monad-testnet |
| Stellar proof | https://railguard-site.vercel.app/proof/stellar-testnet |
| Video | https://youtu.be/L-Gss08bzR0 |
| Repo | https://github.com/prasanthkuna/railguard-gateway |
| Operator | https://prebroadcast.vercel.app/ |
| API staging | https://staging-railguard-s4ii.encr.app |

## Status snapshot (2026-10-22)

| Program | Status | Proof tier | Next action |
| --- | --- | --- | --- |
| **Monad Metropolis** | **Submitted** (judging) | Testnet USDC | `bun run verify-monad-metropolis-pack` before any resubmit |
| Stellar SCF #46 Interest | **Submitted** 2026-10-04 | Testnet Horizon | Wait Build invite → [STELLAR_SCF_46_BUILD.md](./STELLAR_SCF_46_BUILD.md) by **Nov 8** |
| Arbitrum HackQuest | **Submitted** | Sepolia | [ARBITRUM_TESTNET_SUBMIT.md](./ARBITRUM_TESTNET_SUBMIT.md) |
| **Arc Microgrant** | Registered, **not submitted** | **Mainnet 5042 required** (proof **pending**) | [ARC_MICROGRANT_SUBMIT.md](./ARC_MICROGRANT_SUBMIT.md) · target **Nov 1** |
| Circle Developer Grant | Not applied | Arc mainnet | After Arc manifest → [CIRCLE_DEVELOPER_GRANT.md](./CIRCLE_DEVELOPER_GRANT.md) |
| Arbitrum One proof | Not committed | Mainnet | [ARBITRUM_ONE_PROOF.md](./ARBITRUM_ONE_PROOF.md) |
| Airwallex Agentic Banking Hackathon | **Submitted** 2026-10-22 (Track 3 · Payment Ops Incident Commander) | Sandbox API | Results **Oct 25** · [AIRWALLEX_AGENTIC_BANKING.md](./AIRWALLEX_AGENTIC_BANKING.md) |
| ETHGlobal Mumbai | **Application submitted** 2026-10-22 (Continuity track) | Testnet + partner mains | Awaiting acceptance · submit **Nov 7 09:00 IST** |
| PayPal AI Hackathon | Open | Sandbox | Devpost **Nov 12 12:00 PST** |
| Celo Open Rails | Open | **Celo mainnet** | **Nov 9 09:00 GMT** |

## Evidence commands (quick reference)

| Chain | Generate | Verify pack |
| --- | --- | --- |
| Monad testnet | `monad-testnet-evidence` / `monad-testnet-usdc-proof` | `verify-monad-metropolis-pack` |
| Stellar testnet | `stellar-testnet-evidence` | `verify-stellar-scf-pack` |
| Arbitrum Sepolia | `arbitrum-sepolia-evidence` | `verify-arbitrum-sepolia-pack` |
| **Arc mainnet** | `arc-mainnet-usdc-proof` / `arc-mainnet-evidence` | `verify-arc-microgrant-pack` |
| Arc testnet (ping only) | `arc-testnet-evidence` | — |
| Arbitrum One | `arbitrum-one-evidence` | manual |

---

## Urgent deadlines (updated 22 Oct 2026)

### Arc Microgrants

| Field | Value |
| --- | --- |
| Target | **1 Nov 2026** (mainnet proof pending) |
| Pack | [ARC_MICROGRANT_SUBMIT.md](./ARC_MICROGRANT_SUBMIT.md) |
| Cost | ~**$10–16** bridge + **0.01 USDC** proof (see PROOF_STRATEGY) |
| Code | `packages/settlement/src/arc-mainnet.ts` |

### Airwallex Agentic Banking

| Field | Value |
| --- | --- |
| Status | **Submitted 2026-10-22** (Track 3, solo) |
| Applications close | **23 Oct 2026** |
| Results / notify | **25 Oct 2026** |
| Submit | **13 Nov 2026** |
| Pack | [AIRWALLEX_AGENTIC_BANKING.md](./AIRWALLEX_AGENTIC_BANKING.md) |
| Track | **03 Payment Ops Incident Commander** |

### Stellar SCF #46 Build

| Field | Value |
| --- | --- |
| Submit | **8 Nov 2026** (invite required) |
| Pack | [STELLAR_SCF_46_SUBMIT.md](./STELLAR_SCF_46_SUBMIT.md) |

### Monad Metropolis (archive)

| Field | Value |
| --- | --- |
| Portal | https://hackathon.monad.xyz/ |
| Pack | [MONAD_METROPOLIS_SUBMIT.md](./MONAD_METROPOLIS_SUBMIT.md) · [MONAD_METROPOLIS_PORTAL_PASTE.md](./MONAD_METROPOLIS_PORTAL_PASTE.md) |
| Tx | `0x1cbd4610…98aab2` · chain **10143** |

## Stellar

Interest Form is already submitted. Do not alter the story into a mainnet claim before the Build phase.

Next prepared artifact: [STELLAR_SCF_46_BUILD.md](./STELLAR_SCF_46_BUILD.md).

| Site id | Settlement / rail | Evidence |
| --- | --- | --- |
| `monad` | `monad-testnet.ts` | `evidence/monad-testnet/` |
| `stellar` | `stellarRail.ts` | `evidence/stellar-testnet/` |
| `arbitrum` | Sepolia + `arbitrum-one.ts` | `evidence/arbitrum-sepolia/` · `evidence/arbitrum-one/` |
| `arc` | `arc-mainnet.ts` | `evidence/arc/` |
| `airwallex` | `airwallexRail.ts` (stub) | sandbox phase |
| `failure-lab` | APF demos | `/attack` |

Registry: `packages/integrations/src/rails/registry.ts` · `apps/site/lib/ecosystems.manifest.ts`.

---

## Arc decision rule

Proceed only if the work remains:

`existing Railguard architecture -> Arc mainnet transaction -> evidence manifest -> public proof -> submit`

Do not create a second product, new frontend, or chain-specific architecture solely for the grant.

---

## Social profiles (all applications)

See [FOUNDER_SOCIAL_PROFILES.md](./FOUNDER_SOCIAL_PROFILES.md) — link site on GitHub/X/LinkedIn; pin proof URL when updated.
