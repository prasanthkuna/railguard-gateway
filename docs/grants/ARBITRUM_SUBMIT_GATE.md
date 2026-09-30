# Arbitrum HackQuest — submit gate (do not submit until all checked)

**Program:** [Arbitrum Open House Singapore](https://arbitrum-singapore.hackquest.io/buildathons/Arbitrum-Open-House-Singapore-Online-Buildathon)  
**Project submit window:** through **2026-10-04**

## On-chain

- [ ] USDT (or USDC) transfer on **Arbitrum One** completed
- [ ] `bun run arbitrum-one-evidence` → `evidence/arbitrum-one/manifest.json` with `ok: true`
- [ ] Arbiscan link in `evidence/arbitrum-one/README.md`

## Track A — Arbitrum Sepolia hook

- [ ] `forge script` deploy → addresses in `evidence/arbitrum-sepolia-hook/README.md`
- [ ] Verified on https://sepolia.arbiscan.io

## Track B — Tier B product

- [ ] `POST /v1/intents/:id/execute-external` + `POST /v1/executions/:id/observe` on staging
- [ ] Operator: Executions → **Arbitrum Tier B demo** + MetaMask + observe → **SETTLED**

## Repo & deploy

- [ ] `evidence/arbitrum-one/` committed on `main`
- [ ] Encore staging serves `GET /v1/executions` (operator Executions page)
- [ ] `railguard-site` deployed with `/ecosystems/arbitrum` = **MAINNET VERIFIED**

## Video (HyperFrames)

- [ ] Old Remotion/CapCut outputs removed (see `docs/media/HYPERFRAMES_PIPELINE.md`)
- [ ] Grant master ~90s rendered from HyperFrames + FFmpeg
- [ ] `docs/media/CLAIM_MAP.md` — every on-screen claim has CLI, URL, or tx proof

## HackQuest

- [ ] Registration complete (About you + Online profiles)
- [ ] Project form: name, description, GitHub, demo URL, **video URL**, **tx proof**
- [ ] Copy from `docs/grants/HACKQUEST_ARBITRUM_COPY.md`
