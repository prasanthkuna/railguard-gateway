# Monad testnet — settlement evidence

| Field | Value |
|-------|-------|
| Network | Monad testnet |
| Chain ID | 10143 |
| Tx hash | `0x1cbd46100de39c60d88d8d7ee7a1dc66cf2c9c16956ebb403b69c1751b98aab2` |
| Explorer | https://testnet.monadvision.com/tx/0x1cbd46100de39c60d88d8d7ee7a1dc66cf2c9c16956ebb403b69c1751b98aab2 |
| Settlement | CONFIRMED |

## Reproduce

```powershell
cd railguard-gateway
$env:MONAD_TESTNET_TX_HASH="0x1cbd46100de39c60d88d8d7ee7a1dc66cf2c9c16956ebb403b69c1751b98aab2"
$env:MONAD_TESTNET_SENDER="0x9a3f50804306fdb12046243bdf2db33d61dcba2d"
$env:MONAD_TESTNET_RECIPIENT="0x8c7e2543aa8bf69dc8458dc28104234f6a334233"
$env:MONAD_TESTNET_AMOUNT="1000000"
bun run monad-testnet-evidence
```

USDC on Monad testnet: `0x534b2f3A21130d7a60830c2Df862319e593943A3` (6 decimals). USDC faucet: https://faucet.circle.com/ · MON gas faucet: https://faucet.monad.xyz
