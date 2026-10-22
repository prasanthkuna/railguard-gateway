# Arc Microgrant — DoraHacks submit (after on-chain proof)

**Portal:** [dorahacks.io/hackathon/arc-microgrants](https://dorahacks.io/hackathon/arc-microgrants/detail)  
**Deadline (UI):** **2026/10/15 09:29** IST (~18h from afternoon 14 Oct) = **Oct 14 23:59 ET**  
**Requires:** GitHub link · **live Arc mainnet URL** · logged-in DoraHacks account

## Pre-submit (no transaction)

| Step | Status |
|------|--------|
| Repo public | https://github.com/prasanthkuna/railguard-gateway |
| `bun run verify-arc-microgrant-pack` | Pass except manifest until proof tx |
| DoraHacks **Log in** | **Required** (browser showed logged out) |
| DoraHacks **Register** | Click after login |
| Live URL for judges | Use **https://railguard-site.vercel.app/ecosystems/arc** until `/proof/arc-mainnet` is deployed |

## After `evidence/arc/manifest.json` CONFIRMED

1. `bun run sync-arc-public-proof`  
2. Push + Vercel deploy (enables `/proof/arc-mainnet`)  
3. DoraHacks → **Submit Build**  
4. Paste from [ARC_MICROGRANT_PORTAL_PASTE.md](./ARC_MICROGRANT_PORTAL_PASTE.md)

### Suggested DoraHacks fields

| Field | Value |
|-------|-------|
| Project name | Railguard |
| Tagline | Execution firewall for agents — Arc USDC settlement verify |
| GitHub | https://github.com/prasanthkuna/railguard-gateway |
| Live demo | https://railguard-site.vercel.app/ecosystems/arc (or `/proof/arc-mainnet` post-deploy) |
| Arc tx proof | Explorer link from manifest |
| Description | Read-only CONFIRMED settlement verification for USDC on Arc 5042; agent reconcile / UNKNOWN receipts |

## Gas check (before you sign)

```powershell
bun run arc-mainnet-gas-estimate
bun run arc-mainnet-preflight
```

Typical proof tx gas: **~0.0016 USDC** @ 24 gwei × ~65k gas (plus **0.01 USDC** transfer to your recovery address).
