# Arbitrum HackQuest - submitted archive

**Status:** Submitted on **2026-10-04**.  
**Strategy used:** Arbitrum Sepolia hook deployment + separate external-wallet USDC settlement verification + public evidence.

**Verify locally:** `bun run verify-hackquest-pack` · **Video:** `bun run dev:video` / `bun run render:hero` (`apps/video/`)

## Final submission assets

- [x] Hook / adapter / validator deployed on Arbitrum Sepolia - `evidence/arbitrum-sepolia-hook/README.md`
- [x] External-wallet settlement verified - `evidence/arbitrum-sepolia/manifest.json`
- [x] Public no-login proof - https://railguard-site.vercel.app/proof/arbitrum-sepolia
- [x] Arbitrum integration page - https://railguard-site.vercel.app/ecosystems/arbitrum
- [x] Failure Lab - https://railguard-site.vercel.app/attack
- [x] Final product video - https://youtu.be/L-Gss08bzR0
- [x] Project submission completed before the 2026-10-04 deadline

### Chain — hook deployment (Sepolia 421614)

- [x] Hook / adapter / validator deployed — `evidence/arbitrum-sepolia-hook/README.md`
- [x] Addresses on Sepolia Arbiscan (see README)

### Chain — wallet verification (product)

- [x] External-wallet flow **CONFIRMED** (settlement verified) — `exec_b73824e9-726f-4d59-af49-ac5cd1e1c9aa`
- [x] `bun run arbitrum-sepolia-evidence` → `manifest.json` **`ok: true`** (re-run before submit)
- [x] Public proof page + testnet console execution detail

### Site & repo

- [x] `/ecosystems/arbitrum` live
- [x] Failure Lab `/attack` live
- [ ] Evidence manifest committed after last evidence run (if timestamps changed)
- [x] Remotion `apps/video/` — ArbitrumHero + ArbitrumTechnical (see `docs/media/REMOTION_PIPELINE.md`)

### HackQuest (human steps)

- [x] **90s video URL** — https://youtu.be/L-Gss08bzR0 (master `apps/video/edit/final.mp4`, judge-safe · set **Unlisted** in Studio if still draft)
- [x] Project **Railguard** — https://arbitrum-singapore.hackquest.io/projects/Railguard (submitted 2026-10-04; upload logo from `docs/grants/hackquest-railguard-logo-512.png` if header still empty)
- [x] Buildathon submit form — Overall + Promising Products · hook `0x7568…965E` · site + contracts filled
- [x] On-chain proof: hook `0x7568…965E` + settlement tx below
- [x] Submitted on **2026-10-04**

## On-chain proof (paste for judges)

**Start here (no WorkOS, no wallet):** public proof → tx → Failure Lab. Full path: `docs/runbooks/JUDGE_PATH_AND_VIDEO_PLAN.md`.

| Field | Value |
| --- | --- |
| **Start — public proof** | https://railguard-site.vercel.app/proof/arbitrum-sepolia |
| Settlement tx | https://sepolia.arbiscan.io/tx/0x243ec1e8eb6a992a85a035af11edd5ff70d78e3b84e7eb6c78ab5badc409608d |
| Settlement amount | 0.01 USDC |
| Hook | https://sepolia.arbiscan.io/address/0x756829c3ab0eB02b22fe4D7C9E35252A9738965E |
| Failure Lab | https://railguard-site.vercel.app/attack |
| Arbitrum page | https://railguard-site.vercel.app/ecosystems/arbitrum |
| Testnet console *(optional replay; WorkOS login)* | https://prebroadcast.vercel.app/login → then `/executions/exec_b73824e9-726f-4d59-af49-ac5cd1e1c9aa` |
| Video | https://youtu.be/L-Gss08bzR0 |

## Claim boundary

The hook deployment and the external-wallet settlement are **separate proofs**. The repository does not claim that the 0.01 USDC transfer traversed the deployed hook.

For paste-ready submission copy, see [HACKQUEST_ARBITRUM_COPY.md](./HACKQUEST_ARBITRUM_COPY.md).
