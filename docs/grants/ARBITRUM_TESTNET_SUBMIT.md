# Arbitrum HackQuest — testnet-only submit pack

**Strategy:** Sepolia hook + Tier B USDC + evidence in repo. No mainnet required.

## Checklist

### Chain — Track A (Sepolia 421614)

- [ ] Deployer funded: `0xee93c47daCB59B9B21595c7ecf86920d0DceE89C` ([QuickNode](https://faucet.quicknode.com/arbitrum/sepolia) or [Alchemy](https://www.alchemy.com/faucets/arbitrum-sepolia))
- [ ] `railguard-new/scripts/deploy-arbitrum-sepolia.ps1` → hook / adapter / validator on Sepolia Arbiscan
- [ ] `evidence/arbitrum-sepolia-hook/README.md` addresses filled

### Chain — Track B (product)

- [ ] Encore staging `bac2ffe+` (Tier B routes live)
- [ ] [prebroadcast](https://prebroadcast.vercel.app/executions) deployed with Tier B UI
- [ ] MetaMask: Arbitrum Sepolia + test USDC → **Start Tier B flow** → observe → **SETTLED**
- [ ] `bun run arbitrum-sepolia-evidence` → `evidence/arbitrum-sepolia/manifest.json`

### Site & repo

- [ ] `/ecosystems/arbitrum` → **SEPOLIA VERIFIED**
- [ ] Evidence README + manifest committed (`evidence/**` allowlisted in `.gitignore`)

### HackQuest

- [ ] Project **Railguard** — video URL, GitHub, demo URLs
- [ ] On-chain proof: **Sepolia** contract address + **Tier B** tx (sepolia.arbiscan.io)
- [ ] Submit before **2026-10-04**

## Paste for judges

| Field | Value |
| --- | --- |
| Hook | `https://sepolia.arbiscan.io/address/<HOOK>` |
| Tier B tx | `https://sepolia.arbiscan.io/tx/<TX>` |
| Demo | https://prebroadcast.vercel.app/executions |
| Failure Lab | https://railguard-site.vercel.app/attack |
