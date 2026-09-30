# Arbitrum Sepolia — Railguard hook deploy (Track A)

| Contract | Address | Arbiscan |
|----------|---------|----------|
| RailguardExecutionHook | `0x756829c3ab0eB02b22fe4D7C9E35252A9738965E` | [hook](https://sepolia.arbiscan.io/address/0x756829c3ab0eB02b22fe4D7C9E35252A9738965E) |
| RailguardAccountAdapter | `0xe84aEa57cF7b12f746C1c4e6Be64348051fD3514` | [adapter](https://sepolia.arbiscan.io/address/0xe84aEa57cF7b12f746C1c4e6Be64348051fD3514) |
| RailguardSessionValidator | `0xc0Bf25808d6cC3B283CCa952e01bD6Fd505fD663` | [validator](https://sepolia.arbiscan.io/address/0xc0Bf25808d6cC3B283CCa952e01bD6Fd505fD663) |

**Chain:** Arbitrum Sepolia (421614)  
**Deployer:** `0xee93c47daCB59B9B21595c7ecf86920d0DceE89C`  
**Owner:** `0x9a3f50804306fDB12046243bDF2dB33D61dcBA2d`  
**Railguard signer:** `0x8c7E2543Aa8bf69dc8458Dc28104234f6A334233`  

**Deploy:** `railguard-new/scripts/deploy-arbitrum-sepolia.ps1` (2026-09-30)

Verification on Arbiscan may require Etherscan API V2 (`forge verify-contract` with V2 URL).

## Track B (staging, 2026-09-30)

| Step | Value |
|------|--------|
| Intent | `fin_881568b7-208e-4587-9192-2f015118a788` |
| Execution | `exec_b73824e9-726f-4d59-af49-ac5cd1e1c9aa` |
| Status | `AWAITING_BROADCAST` (0.01 USDC → grant wallet) |
| Operator | [execution detail](https://prebroadcast.vercel.app/executions/exec_b73824e9-726f-4d59-af49-ac5cd1e1c9aa) |
| USDC helper | `railguard-new/scripts/metamask-tier-b-usdc.html` (local port 8765) |

After MetaMask send, observe then refresh evidence:

```powershell
cd railguard-gateway
$env:TIER_B_ACCESS_TOKEN="<WorkOS access token from operator session>"
$env:TIER_B_OBSERVE_ONLY="1"
$env:TIER_B_EXECUTION_ID="exec_b73824e9-726f-4d59-af49-ac5cd1e1c9aa"
$env:TIER_B_TX_HASH="0x..."
bun run scripts/run-tier-b-staging.ts
$env:ARBITRUM_SEPOLIA_TX_HASH="0x..."
bun run arbitrum-sepolia-evidence
```
