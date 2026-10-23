# Arbitrum Sepolia - Railguard hook deployment

All three contracts are **source-verified** on Arbiscan (Etherscan V2) and on Sourcify (`exact_match`). Checked 2026-10-23.

| Contract | Address | Arbiscan (verified source) | Sourcify |
|----------|---------|----------------------------|----------|
| RailguardExecutionHook | `0x756829c3ab0eB02b22fe4D7C9E35252A9738965E` | [code](https://sepolia.arbiscan.io/address/0x756829c3ab0eB02b22fe4D7C9E35252A9738965E#code) | [exact match](https://repo.sourcify.dev/421614/0x756829c3ab0eB02b22fe4D7C9E35252A9738965E) |
| RailguardAccountAdapter | `0xe84aEa57cF7b12f746C1c4e6Be64348051fD3514` | [code](https://sepolia.arbiscan.io/address/0xe84aEa57cF7b12f746C1c4e6Be64348051fD3514#code) | [exact match](https://repo.sourcify.dev/421614/0xe84aEa57cF7b12f746C1c4e6Be64348051fD3514) |
| RailguardSessionValidator | `0xc0Bf25808d6cC3B283CCa952e01bD6Fd505fD663` | [code](https://sepolia.arbiscan.io/address/0xc0Bf25808d6cC3B283CCa952e01bD6Fd505fD663#code) | [exact match](https://repo.sourcify.dev/421614/0xc0Bf25808d6cC3B283CCa952e01bD6Fd505fD663) |

Compiler: solc `v0.8.24+commit.e11b9ed9`, optimizer on (200 runs), `via_ir = true`.
Contract source: [railguard-protocol](https://github.com/prasanthkuna/railguard-protocol) `contracts/src` (last source change `31a2168`).

Constructor arguments:

- AccountAdapter: `owner=0x9a3f50804306fDB12046243bDF2dB33D61dcBA2d`, `signer=0x8c7E2543Aa8bf69dc8458Dc28104234f6A334233`, `hook=0x756829c3ab0eB02b22fe4D7C9E35252A9738965E`
- SessionValidator: `account=0xe84aEa57cF7b12f746C1c4e6Be64348051fD3514`
- ExecutionHook: none (`setAdapter(adapter)` called after adapter deploy)

Re-check verification (from `railguard-protocol/contracts`):

```powershell
forge verify-contract 0xc0Bf25808d6cC3B283CCa952e01bD6Fd505fD663 src/RailguardSessionValidator.sol:RailguardSessionValidator --chain 421614 --verifier etherscan --constructor-args $(cast abi-encode "f(address)" 0xe84aEa57cF7b12f746C1c4e6Be64348051fD3514)
```

**Chain:** Arbitrum Sepolia (421614)  
**Deployer:** `0xee93c47daCB59B9B21595c7ecf86920d0DceE89C`  
**Owner:** `0x9a3f50804306fDB12046243bDF2dB33D61dcBA2d`  
**Railguard signer:** `0x8c7E2543Aa8bf69dc8458Dc28104234f6A334233`  

**Deploy:** `railguard-new/scripts/deploy-arbitrum-sepolia.ps1` (2026-09-30)

Verification on Arbiscan may require Etherscan API V2 (`forge verify-contract` with V2 URL).

## External-wallet verification (staging, 2026-09-30)

| Step | Value |
|------|--------|
| Intent | `fin_881568b7-208e-4587-9192-2f015118a788` |
| Execution | `exec_b73824e9-726f-4d59-af49-ac5cd1e1c9aa` |
| Status | **CONFIRMED** (settlement verified) |
| Tx | [0x243ec1e8…608d](https://sepolia.arbiscan.io/tx/0x243ec1e8eb6a992a85a035af11edd5ff70d78e3b84e7eb6c78ab5badc409608d) |
| Public proof | [verified testnet page](https://railguard-site.vercel.app/proof/arbitrum-sepolia) |
| Operator (auth) | [execution detail](https://prebroadcast.vercel.app/executions/exec_b73824e9-726f-4d59-af49-ac5cd1e1c9aa) |
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
