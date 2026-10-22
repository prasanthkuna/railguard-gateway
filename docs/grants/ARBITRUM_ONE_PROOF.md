# Arbitrum One — low-cost mainnet proof

**Unlocks:** Arbitrum **Audit Program** (testnet apps qualify but verified mainnet tx helps), ETHGlobal credibility, Trailblazer narrative.  
**Not required for:** HackQuest (already **Arbitrum Sepolia** — see [ARBITRUM_TESTNET_SUBMIT.md](./ARBITRUM_TESTNET_SUBMIT.md)).

## Cost

| Item | Typical USD |
|------|-------------|
| USDC or USDT on Arbitrum One already | $0 marginal |
| One **0.01–1 USDC** (or USDT) transfer | token only |
| L2 gas for transfer | **~$0.01–0.10** |
| Arbiscan verification (contracts) | gas for verify txs if contracts deployed |

**Pro minimum:** one **CONFIRMED** manifest at `evidence/arbitrum-one/manifest.json` — same envelope as Monad/Arc.

## Commands

```powershell
cd c:\Users\PrashanthKuna\personal\web3\railguard-gateway

# If you already have a mainnet tx:
$env:ARBITRUM_ONE_TX_HASH="0x..."
$env:ARBITRUM_ONE_FROM="0x9a3f50804306fDB12046243bDF2dB33D61dcBA2d"
$env:ARBITRUM_ONE_TO="0x8c7E2543Aa8bf69dc8458Dc28104234f6A334233"
$env:ARBITRUM_ONE_TOKEN="usdc"
bun run arbitrum-one-evidence

# Auto-discover recent transfer between grant wallets (if RPC allows):
bun run arbitrum-one-evidence
```

Default wallets in script match Monad proof senders/recipients.

## After manifest

1. Commit `evidence/arbitrum-one/manifest.json` (whitelisted in `.gitignore`).  
2. Optional: public `/proof/arbitrum-one` page (copy `monad-testnet` pattern).  
3. Audit program: freeze commit, verify contracts on Arbiscan, apply via [arbitrum.foundation/grants](https://arbitrum.foundation/grants).

## Testnet vs mainnet rule

| Audience | Use |
|----------|-----|
| Hackathons (Sepolia) | `evidence/arbitrum-sepolia/` |
| Grants / audit / “mainnet proof” | `evidence/arbitrum-one/` |

Do not conflate the two in submission forms.
