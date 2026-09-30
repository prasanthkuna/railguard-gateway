# Security review fixes (2026-09-30)

| Finding | Fix |
| --- | --- |
| Tx hash replay across orgs/intents | Migration `013_settlement_tx_claims` + claim in `observeExternalStoredExecution` transaction |
| Evidence derived from arbitrary transfer | `generateArbitrumSepoliaEvidence` requires `txHash` + independent `expected` facts (env: `ARBITRUM_SEPOLIA_SENDER`, `_RECIPIENT`, `_AMOUNT`) |
| Client `principal.organizationId` | Reject mismatch; store actor org in `createStoredFinancialIntent` |
| Unknown assets → USDC | Removed fallback in `resolveTokenAddress`; tests for DAI/ETH |
| SETTLED before evidence | Single transaction: claim + status + `evidence_json` |
| RPC secrets in manifest | `redactRpcUrlForEvidence` on write |
| Submit doc placeholders | `ARBITRUM_TESTNET_SUBMIT.md` uses concrete Sepolia URLs |

**Deploy:** `git push encore main` (migration 013).

**Re-run evidence:**

```powershell
$env:ARBITRUM_SEPOLIA_TX_HASH="0x243ec1e8eb6a992a85a035af11edd5ff70d78e3b84e7eb6c78ab5badc409608d"
$env:ARBITRUM_SEPOLIA_SENDER="0x9a3f50804306fdb12046243bdf2db33d61dcba2d"
$env:ARBITRUM_SEPOLIA_RECIPIENT="0x8c7e2543aa8bf69dc8458dc28104234f6a334233"
$env:ARBITRUM_SEPOLIA_AMOUNT="10000"
bun run arbitrum-sepolia-evidence
```
