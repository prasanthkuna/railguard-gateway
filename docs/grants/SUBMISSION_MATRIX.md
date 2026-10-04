# Grant & hackathon submission matrix

> **SUPERSEDED — Arbitrum HackQuest (Oct 2026):** Use **[ARBITRUM_TESTNET_SUBMIT.md](./ARBITRUM_TESTNET_SUBMIT.md)** as canonical (Arbitrum Sepolia testnet only). Rows below that mention Arbitrum One mainnet / MAINNET VERIFIED are outdated for this submission.

**Verified:** 2026-09-30 via Chrome DevTools (HackQuest Arbitrum Singapore, Stellar SCF awards) + repo code map.  
**Master pack (every submission):** [LAUNCH.md](../../../LAUNCH.md) — site URLs, 90s video, APF-001…006, `docs/ecosystems.yaml`, PORTFOLIO, GitHub pins.

| Canonical URLs | |
| --- | --- |
| Site | https://railguard-site.vercel.app/ (`/`, `/attack`, `/proof/arbitrum-sepolia`, `/proof/stellar-testnet`, `/ecosystems`, `/r/demo`) |
| Operator | https://prebroadcast.vercel.app/ (Railguard Operator testnet console; `/zebpay` public) |
| API staging | https://staging-railguard-s4ii.encr.app |
| Gateway repo | https://github.com/prasanthkuna/railguard-gateway |

## Blockers found today

| Issue | Evidence | Fix |
| --- | --- | --- |
| `GET /v1/executions` → **404** on staging | Operator network: `staging-railguard-s4ii.encr.app/v1/executions?limit=100` while logged in | `git push encore main` (deploy `260666a`); confirm deploy green in Encore Cloud |
| Site missing grant rails on `/ecosystems` | Only Stellar, Base, CDP, x402 cards | Ship expanded manifest + `/ecosystems/[id]` (this PR) |
| Encore push timeout | Local `git push encore` I/O timeout | Retry from your network or deploy from Encore dashboard |

---

## Day 1 (Sep 30) — urgent

### 1. Arbitrum Open House Singapore (HackQuest)

| Field | Value |
| --- | --- |
| Portal | https://arbitrum-singapore.hackquest.io/buildathons/Arbitrum-Open-House-Singapore-Online-Buildathon |
| Register | **Oct 2, 2026 ~22:31** (countdown: “2 days left” on Sep 30) |
| Submit project | **Sep 13 – Oct 4, 2026 ~21:29** |
| Winners | Oct 12, 2026 |
| Prize | $115K (70K open + 15K promising + 30K grants) |
| Requirement | Deploy on **Arbitrum chain**; existing projects allowed |
| Railguard code | `packages/settlement/src/arbitrum-one.ts` + `evidence/arbitrum-one/` (mainnet USDT) |
| Site slice | `/ecosystems/arbitrum` (SEPOLIA VERIFIED — see ARBITRUM_TESTNET_SUBMIT.md) |
| Submit gate | [ARBITRUM_SUBMIT_GATE.md](./ARBITRUM_SUBMIT_GATE.md) — **no submit until video + evidence** |
| Submit fields (typical HackQuest) | Project name, description, GitHub, demo URL, team, track, **video**, on-chain deployment proof |
| Copy paste | One-liner: *Open-source financial execution firewall for autonomous agents.* Demo: `railguard attack` → protect → receipt. Link operator + `/attack`. |
| You must | **Register** (button “Start Register”) → create/update project before Oct 4 |

### 2. Stellar SCF #46 (interest → invite → full submit)

| Field | Value |
| --- | --- |
| Portal | https://communityfund.stellar.org/awards → SCF #46 |
| Round detail | https://communityfund.stellar.org/awards/recxrSMYwAl8vcglg |
| Submit deadline | **November 8, 2026** |
| Prerequisite | **Interest form ASAP** → email invite → full Build Award proposal |
| Tracks | Open / Integration / RFP ([handbook](https://stellar.gitbook.io/scf-handbook/scf-awards/build-award)) |
| Criteria | Product market fit, use of Stellar, integration plan, budget tranches, submission quality |
| Railguard code | `packages/integrations/src/rails/stellarRail.ts`, testnet verify |
| Site slice | `/ecosystems/stellar` (already on index) |
| Submit pack | **Interest:** [STELLAR_SCF_46_INTEREST_FORM.md](./STELLAR_SCF_46_INTEREST_FORM.md) · **Checklist:** [STELLAR_SCF_46_SUBMIT.md](./STELLAR_SCF_46_SUBMIT.md) · **Build (post-invite):** [STELLAR_SCF_46_BUILD.md](./STELLAR_SCF_46_BUILD.md) |

---

## Day 2 (Oct 1) — register + draft

### 3. Monad Metropolis

| Field | Value |
| --- | --- |
| Deadline | **Oct 13, 2026** (plan25) |
| Track | Trust, Identity & AI Infrastructure (+ payments demo) |
| Code | `monad-testnet` in `packages/settlement/src/chains.ts` |
| Site | `/ecosystems/monad` |
| Optional | Chainlink CRE bounty (~$3K) — do not make Chainlink the product |

### 4. Colosseum Crypto World’s Fair (optional)

| Deadline | **Oct 12, 2026** |
| Note | Startup-style pitch; only if zero extra work (plan25) |

### 5. Airwallex Agentic Banking

| When | Brief **Oct 5** → GO/NO-GO before building |
| Code | `packages/integrations/src/rails/airwallexRail.ts` (stub path) |

### 6. Arc Microgrant

| Deadline | **Oct 14, 2026** |
| Code | `arc` / `arc-testnet` chains + settlement verify rail |
| Site | `/ecosystems/arc` |

---

## Rolling / later (still “apply” in plan)

| # | Program | When | Code / site |
| --- | --- | --- | --- |
| 7 | Chainstack × FailSafe audit | Rolling | Contracts freeze + application (plan25) |
| 8 | Circle Developer Grant | Late Oct after Arc + partners | Arc mainnet evidence |
| 9 | ETHGlobal Mumbai | Nov 5–7 | One sponsor integration only |
| 10 | Celo Prezenti Frontier | Dec 29 | `celo` / `celo-alfajores` rails |
| 11 | GOAT (x402 / ERC-8004) | If applying (plan29 P2) | Real E2E only |
| 12 | Base cohort / distribution | Open | Polish Base evidence — no new architecture |

## Strategic backlog (plan28 — no fixed date)

Circle/Arc, Stellar, Celo, Solana/Superteam, Aptos, XRPL, NEAR, Base cohort, Chainlink/Arbitrum.

## Not applying (plan25)

Polygon Encode (closed), Web3 Foundation (watch), Kite / Open Agent (unverified).

---

## Per-integration code ↔ site map

| Site id | Kernel / integrations | Evidence doc |
| --- | --- | --- |
| `x402` | `kernel/adapters/x402Rail.ts` | x402-guard repo |
| `cdp` / `base` | `cdpRail`, `baseRail` | demo-verification, operator |
| `stellar` | `integrations/rails/stellarRail.ts` | P0_TESTNET_COMPLETE |
| `arbitrum` | `arbitrum-one` settlement verify | `arbitrum-one.test.ts`, `evidence/arbitrum-one` |
| `monad` | `settlementVerifyRail(monad-testnet)` | chains.ts |
| `arc` | `settlementVerifyRail(arc*)` | `docs/P0_TESTNET_COMPLETE` arc section |
| `celo` | `settlementVerifyRail(celo*)` | optional testnet |
| `airwallex` | `airwallexRail.ts` | grant-phase |
| `failure-lab` | agent-payment-failure-lab | APF atlas |

Registry: `packages/integrations/src/rails/registry.ts` + `docs/ecosystems.yaml`.
