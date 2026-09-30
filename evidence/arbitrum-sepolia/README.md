# Arbitrum Sepolia — settlement evidence

| Field | Value |
|-------|-------|
| Network | Arbitrum Sepolia |
| Chain ID | 421614 |
| Tx hash | `0x243ec1e8eb6a992a85a035af11edd5ff70d78e3b84e7eb6c78ab5badc409608d` |
| Explorer | https://sepolia.arbiscan.io/tx/0x243ec1e8eb6a992a85a035af11edd5ff70d78e3b84e7eb6c78ab5badc409608d |
| Settlement | CONFIRMED |

## Reproduce

```powershell
cd railguard-gateway
$env:ARBITRUM_SEPOLIA_TX_HASH="0x243ec1e8eb6a992a85a035af11edd5ff70d78e3b84e7eb6c78ab5badc409608d"
bun run arbitrum-sepolia-evidence
```
