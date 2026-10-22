# HackQuest - Arbitrum Open House Singapore (submitted archive)\n\n**Status:** Submitted on 2026-10-04. This file preserves the evidence/copy package used for the submission.

## HackQuest project (canonical — use this one)

| | |
| --- | --- |
| Public | https://arbitrum-singapore.hackquest.io/projects/Railguard |
| Edit | https://arbitrum-singapore.hackquest.io/projects/setup/e2d97d00-46f2-4dfb-b2ea-a79c5065a7c6 |
| Logo (512×512 PNG) | `docs/grants/hackquest-railguard-logo-512.png` (from `packages/brand/assets/icon.svg`) |
| Duplicate to ignore | `projects/setup/c8824f6d-ace6-4b1e-a44d-684d52c5b6c1` (empty; delete in portal if listed) |
| Submit form (2026-10-04) | Contract `0x756829c3ab0eB02b22fe4D7C9E35252A9738965E` · tracks Overall + Promising Products · sponsors: none |

## Project name

Railguard

## One-liner (Intro field)

Open-source financial execution firewall for AI agents.

## Description (short — portal Description field)

Railguard is an open-source financial execution firewall for AI agents. It applies policy before signing, binds authorization to recipient, asset, amount, and network, tracks uncertain broadcasts, verifies settlement, and emits tamper-evident evidence.

On Arbitrum Sepolia we deployed execution-hook contracts and verified a separate 0.01 USDC external-wallet flow through on-chain SETTLED evidence. The public Failure Lab demonstrates six payment-failure classes (client-side simulation). v0.1 alpha / testnet reference.

Judge path (no login): Demo https://youtu.be/L-Gss08bzR0 · Public proof https://railguard-site.vercel.app/proof/arbitrum-sepolia · Failure Lab https://railguard-site.vercel.app/attack · Site https://railguard-site.vercel.app/ · GitHub https://github.com/prasanthkuna/railguard-gateway

On-chain: hook `0x756829c3ab0eB02b22fe4D7C9E35252A9738965E` · settlement tx `0x243ec1e8eb6a992a85a035af11edd5ff70d78e3b84e7eb6c78ab5badc409608d`

Optional operator replay (WorkOS sign-in): https://prebroadcast.vercel.app/login

## Progress During Buildathon (portal field)

Deployed Railguard execution hooks on Arbitrum Sepolia; verified 0.01 USDC external-wallet settlement (SETTLED); published judge-safe demo video and public evidence pack. Reproduce: `bun run verify-hackquest-pack`.

## Team Intro (portal → Team tab)

Solo founder building Railguard — open-source financial execution firewall for AI agents. Full-stack (Go/TypeScript/Solidity); Sepolia hook deployment and external-wallet settlement evidence for this buildathon.

## Pitch video (portal → Videos → Pitch Video)

Same judge-safe master as demo: https://youtu.be/L-Gss08bzR0

## Links

| Field | URL |
| --- | --- |
| Website | https://railguard-site.vercel.app/ |
| Demo / Failure Lab | https://railguard-site.vercel.app/attack |
| Public Arbitrum proof | https://railguard-site.vercel.app/proof/arbitrum-sepolia |
| Arbitrum integration | https://railguard-site.vercel.app/ecosystems/arbitrum |
| GitHub | https://github.com/prasanthkuna/railguard-gateway |
| Testnet console (optional — WorkOS sign-in) | https://prebroadcast.vercel.app/login — replay only; judges should start at public proof |
| Sepolia tx | https://sepolia.arbiscan.io/tx/0x243ec1e8eb6a992a85a035af11edd5ff70d78e3b84e7eb6c78ab5badc409608d |
| Hook contract | https://sepolia.arbiscan.io/address/0x756829c3ab0eB02b22fe4D7C9E35252A9738965E |
| Evidence | https://github.com/prasanthkuna/railguard-gateway/tree/main/evidence/arbitrum-sepolia |
| Video | https://youtu.be/L-Gss08bzR0 (unlisted · `apps/video/edit/final.mp4` · ~84s) |

## Track / tags

DeFi, AI agents, infrastructure, security

## Team

Prashanth Kuna — solo / founder

## Wallet (registration)

`0x9a3f50804306fDB12046243bDF2dB33D61dcBA2d` (builder contact)

## On-chain proof (submission)

**Hook deployment:** `0x756829c3ab0eB02b22fe4D7C9E35252A9738965E` on Arbitrum Sepolia (421614).

**Wallet settlement:** tx `0x243ec1e8eb6a992a85a035af11edd5ff70d78e3b84e7eb6c78ab5badc409608d` · 0.01 USDC · execution `exec_b73824e9-726f-4d59-af49-ac5cd1e1c9aa` · public proof page above.

**Proof caption:** Arbitrum Sepolia · 0.01 USDC · matching token, recipient, amount, and chain verified · execution SETTLED · explorer and evidence links in project description.

## CTA order (video description + judge path)

**No login required for steps 2–6.**

1. Watch demo (**site + public proof + Arbiscan only** — no sign-in screen in the uploaded video)  
2. **Public Arbitrum proof** — https://railguard-site.vercel.app/proof/arbitrum-sepolia  
3. Inspect Sepolia settlement transaction (link on proof page)  
4. Inspect hook contract on proof page / repo  
5. Failure Lab — https://railguard-site.vercel.app/attack (**Simulate attack**)  
6. Clone repo · `bun run verify-hackquest-pack`  
7. *(Optional)* Testnet console — sign in to replay lifecycle (`docs/runbooks/JUDGE_PATH_AND_VIDEO_PLAN.md`)  
