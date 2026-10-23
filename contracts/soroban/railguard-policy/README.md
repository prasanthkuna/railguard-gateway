# Railguard policy contract (Soroban)

A small Soroban contract that holds AI agent payments to a policy on-chain:

- **Per-agent budget** for one asset (`set_budget`). Grants reserve budget; executes move it to `spent`.
- **Intent binding**: the operator (admin) `grant`s one intent bound to agent, recipient, asset and amount.
- **Deterministic request id**: `sha256(XDR(Vec[agent, recipient, asset, i128 amount, u64 nonce]))`.
  The same id is recomputed off-chain in `packages/settlement/src/stellar-soroban-policy.ts`.
- **Duplicates rejected**: the same intent cannot be granted twice, and a granted intent executes once.
- **Mismatch rejected**: `execute` with any other recipient, asset or amount fails with `IntentMismatch`.
- `revoke` releases an unexecuted grant's reservation.

| Error | Code |
|-------|------|
| InvalidAmount | 1 |
| NoBudget | 2 |
| BudgetExceeded | 3 |
| DuplicateRequest | 4 |
| UnknownRequest | 5 |
| IntentMismatch | 6 |
| AlreadyExecuted | 7 |
| Revoked | 8 |

## Build and test

```bash
cd contracts/soroban/railguard-policy
cargo test              # 15 unit tests
stellar contract build  # target/wasm32v1-none/release/railguard_policy.wasm
```

Toolchain used: Rust 1.99, soroban-sdk 28, stellar-cli 28.1.0. The deployed wasm sha256 is
`c9cd982be9ad9b8a5eed42cd1decbe42800a0fc79f1932cde77af04bf5ab8db5` (matches `stellar contract fetch`).

## Testnet deployment

See [`evidence/stellar-soroban-policy/README.md`](../../../evidence/stellar-soroban-policy/README.md)
for the contract id, transactions, and how to reproduce every rejection with a simulation.
