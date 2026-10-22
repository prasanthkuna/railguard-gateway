# Arbitrum One — mainnet settlement evidence

**Status:** Run `bun run arbitrum-one-evidence` after your USDT transfer confirms.

## Expected grant proof tx

| Field | Value |
| --- | --- |
| Network | Arbitrum One (42161) |
| Token | USDT `0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9` |
| From | `0x9a3f50804306fDB12046243bDF2dB33D61dcBA2d` |
| To | `0x8c7E2543Aa8bf69dc8458Dc28104234f6A334233` |
| Amount | 0.01 USDT |

## Generate bundle

```powershell
cd railguard-gateway
# Option A — paste tx hash (always works):
# $env:ARBITRUM_ONE_TX_HASH="0x..."

# Option B — auto-discover via Etherscan API V2 (not deprecated api.arbiscan.io V1):
# $env:ETHERSCAN_API_KEY="your-key"   # https://docs.etherscan.io/v2-migration chainid=42161

bun run arbitrum-one-evidence
```

Produces `manifest.json` with Arbiscan URL and settlement `CONFIRMED`.
