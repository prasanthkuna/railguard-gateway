# Arbitrum HackQuest — testnet-only submit pack

**Strategy:** Sepolia hook + Tier B USDC + evidence in repo. No mainnet required.

**Verify locally:** `bun run verify-hackquest-pack` · **Video:** `apps/hyperframes/render.ps1`

## Checklist

### Chain — Track A (Sepolia 421614)

- [x] Hook / adapter / validator deployed — `evidence/arbitrum-sepolia-hook/README.md`
- [x] Addresses on Sepolia Arbiscan (see README)

### Chain — Track B (product)

- [x] Tier B **SETTLED** — `exec_b73824e9-726f-4d59-af49-ac5cd1e1c9aa`
- [x] `bun run arbitrum-sepolia-evidence` → `manifest.json` **`ok: true`** (re-run before submit)
- [x] [prebroadcast](https://prebroadcast.vercel.app/executions) + execution detail URL live

### Site & repo

- [x] `/ecosystems/arbitrum` live
- [x] Failure Lab `/attack` live
- [ ] Evidence manifest committed after last evidence run (if timestamps changed)
- [x] HyperFrames `apps/hyperframes/grant-90s/` — composition + mux docs

### HackQuest (human steps)

- [ ] **90s video URL** — render HF + mux captures → YouTube unlisted
- [ ] Project **Railguard** — paste from `HACKQUEST_ARBITRUM_COPY.md`
- [ ] On-chain proof: hook `0x7568…965E` + Tier B tx below
- [ ] Submit before **2026-10-04**

## Paste for judges

| Field | Value |
| --- | --- |
| Hook | https://sepolia.arbiscan.io/address/0x756829c3ab0eB02b22fe4D7C9E35252A9738965E |
| Tier B tx | https://sepolia.arbiscan.io/tx/0x243ec1e8eb6a992a85a035af11edd5ff70d78e3b84e7eb6c78ab5badc409608d |
| Demo | https://prebroadcast.vercel.app/executions/exec_b73824e9-726f-4d59-af49-ac5cd1e1c9aa |
| Failure Lab | https://railguard-site.vercel.app/attack |
| Arbitrum page | https://railguard-site.vercel.app/ecosystems/arbitrum |
| Video | _(YouTube unlisted — update HACKQUEST_ARBITRUM_COPY.md)_ |
