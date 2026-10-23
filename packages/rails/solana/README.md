# @railguard/rail-solana: guarded SPL USDC payments on Solana devnet

A Railguard rail for Solana. An AI agent asks to pay. Railguard checks the policy in code, binds
the payment to one request id (carried in an SPL Memo), and only calls it **CONFIRMED** when a
**finalized** transaction shows exactly the intended token movement. **Devnet only:** the rail
checks the RPC's genesis hash and refuses mainnet.

No Solana SDK dependency. The transaction (Memo + TransferChecked) is built and signed with
`node:crypto` Ed25519, and it is checked byte for byte against `@solana/web3.js` in development.
The same builder can return an **unsigned** transaction for a wallet such as PayBox to sign.

## Guarantees

1. **Policy before signing** (`guard.ts`): only the policy mint (Circle devnet USDC), payees on the
   allowlist, a per-payment cap, a daily budget, and human approval bound to the exact terms hash
   above a threshold.
2. **One intent, one request id, one memo.** Before sending, the rail looks for that memo in the
   sender's recent signatures, so a lost local ledger cannot cause a second payment.
3. **A timeout on send is UNKNOWN, never FAILED.** The budget stays reserved. Agent retries and
   queue redeliveries are blocked (`duplicate_blocked`).
4. **UNKNOWN becomes FAILED_SAFE only with proof:** the old blockhash has expired
   (`blockHeight > lastValidBlockHeight`) and the signature was never seen. Only then can the same
   intent be sent again, with the same memo.
5. **CONFIRMED needs finality and exact facts** (`verifier.ts`): no error, the recipient owner's
   balance change equals the amount, the sender's change equals minus the amount, and the memo
   matches.

## Try it

```bash
bun test packages/rails/solana            # 21 offline tests (fake devnet: timeouts, replays, expiry)
TESTNET_INTEGRATION=1 bun test packages/rails/solana/src/live.test.ts   # read-only, real devnet
```

Devnet payment (needs a funded devnet wallet, see below):

```bash
bun run packages/rails/solana/scripts/devnet-pay.ts
RAILGUARD_SOLANA_CHAOS=timeout bun run packages/rails/solana/scripts/devnet-pay.ts   # UNKNOWN -> reconcile, one payment
bun run packages/rails/solana/scripts/x402-devnet-demo.ts                            # 402 quote -> pay -> resource
bun run packages/rails/solana/scripts/devnet-verify.ts <signature> <recipient> <amount> [memo]
```

| Env var | What |
|---------|------|
| `SOLANA_DEVNET_KEYPAIR_PATH` | Solana CLI keypair JSON **outside the repo** (e.g. `%USERPROFILE%\.railguard-solana\devnet.json`) |
| `SOLANA_DEVNET_RECIPIENT` | Payee wallet that already holds a devnet USDC token account |
| `SOLANA_DEVNET_RPC_URL` | Optional; default `https://api.devnet.solana.com` (devnet is enforced) |
| `RAILGUARD_SOLANA_AMOUNT` | Optional; default `0.01` USDC |
| `RAILGUARD_SOLANA_INTENT_ID` | Optional; default `devnet-proof-<date>` |
| `RAILGUARD_SOLANA_CHAOS` | Optional `timeout`: drop the send response after broadcast |
| `RAILGUARD_SOLANA_APPROVE` | Optional `1`: human approval for amounts above 0.50 USDC |
| `RAILGUARD_SOLANA_LEDGER_PATH` | Optional; default `~/.railguard-solana/devnet-ledger.json` |

Evidence is written to `evidence/solana-devnet/` (signatures and explorer links only).

## Files

| File | What |
|------|------|
| `src/tx.ts` | Legacy message compile, shortvec, Memo + TransferChecked, Ed25519 signing, unsigned form |
| `src/rpc.ts` | JSON-RPC client, ambiguous vs definite errors, devnet genesis check |
| `src/guard.ts` | Spend policy, request id, terms hash, decimal-to-atomic parser |
| `src/rail.ts` | The guarded pay / reconcile state machine |
| `src/verifier.ts` | Finalized balance-delta and memo verification |
| `src/x402.ts` | x402-style quote, payment header and seller-side on-chain check (one use per signature) |
| `src/fakeDevnet.ts` | Test double with send faults: timeout after landing, timeout before landing, preflight reject |
