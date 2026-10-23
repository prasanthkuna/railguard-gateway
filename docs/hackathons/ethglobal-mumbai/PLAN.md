# ETHGlobal Mumbai: build plan (all code written on site, Nov 5-7)

## 0. Start tag (Nov 4 night, laptop)

An older tag `ethglobal-mumbai-baseline` already exists, but it points at commit `984c2f3` from
before the Oct 22-24 work. Moving it would need a force-push, so a **new** tag marks the real start:

```powershell
cd C:\Users\PrashanthKuna\personal\web3\railguard-gateway
git pull --rebase
git tag -a ethglobal-mumbai-start -m "State of main before ETHGlobal Mumbai (Nov 5-7, 2026)"
git push origin ethglobal-mumbai-start
```

Judges compare: `https://github.com/prasanthkuna/railguard-gateway/compare/ethglobal-mumbai-start...main`.
Every commit after the tag, dated Nov 5-7, is new work. All new code goes in new folders, so the
split is easy to see:

| New folder (created at the event) | What |
|-----------------------------------|------|
| `packages/rails/hedera/` | Hedera mirror-node settlement verifier (tx id -> CONFIRMED only when the transfer facts match) and a guarded x402 client that pays on Hedera testnet |
| `examples/hedera-x402-seller/` | An x402-protected paid API that settles on Hedera testnet through a listed facilitator |
| `packages/rails/hedera/src/hcsAudit.ts` | Each spend decision (ALLOW / DENY / UNKNOWN / CONFIRMED) written to an HCS topic as a hash-chained log |
| `packages/approvals/world-id/` | A World ID Agent Pass approval step: payments above the threshold need a fresh verification, validated on the server |
| `docs/hackathons/ethglobal-mumbai/NEW_VS_OLD.md` | The dated changelog |

## 1. What already exists (old work, reused, not judged)

- Kernel: intent, grant, claim, UNKNOWN state, reconcile (`packages/kernel/`).
- x402 guard packages (`vendor/x402-guard/`) and the x402 rail (`packages/kernel/src/adapters/x402Rail.ts` and `examples/x402-agent`).
- Settlement verifiers for Base Sepolia, Arbitrum Sepolia, Monad testnet, Stellar testnet (`packages/settlement/`), and the Solana devnet rail (`packages/rails/solana/`, Encode Solana entry).
- Airwallex sandbox rail and incident commander.

## 2. Hour plan (H0 = hacking start)

| Hours | Build | Done when |
|-------|-------|-----------|
| H0-H1 | Confirm the Continuity registration. Read the Hedera x402 docs (`docs.hedera.com/solutions/ai/x402`) and pick the facilitator. Ask at the Arc booth: is an Arc testnet deploy accepted for the Continuity bounty? | Facilitator chosen; Arc yes or no |
| H1-H4 | `examples/hedera-x402-seller`: one paid endpoint (`GET /v1/fx-report`) priced in testnet USDC (HTS) or HBAR, settling via the facilitator | `curl` returns 402 with a Hedera quote |
| H4-H7 | Guarded agent client: Railguard budget, per-merchant cap, payee allowlist, deterministic payment id from the intent, UNKNOWN on timeout, no second pay | One paid request settles end to end; Hedera tx id saved |
| H7-H9 | `packages/rails/hedera` verifier: mirror node `GET /api/v1/transactions/{id}` checks result SUCCESS, token, amount, payee and consensus timestamp, then CONFIRMED | Unit tests + the real tx verified |
| H9-H11 | HCS audit topic: each decision hashed and chained, topic id in the README | HashScan shows the topic messages |
| H11-H14 | World ID Agent Pass approval: above the threshold, the agent's payment waits for a fresh World ID verification. Server-side validation. A denied / expired path where nothing is paid | Both paths shown |
| H14-H19 | Sleep | |
| H19-H22 | Arc Studio (if testnet is OK): add a USDC nanopayment to the same seller through Arc Studio, with an architecture diagram. Otherwise the Whitechain fallback: deploy + verify the guard contract on Whitechain Sepolia and pay once in their test USDT | Arc Studio URL or Whitechain explorer link |
| H22-H24 | Evidence manifests in `evidence/hedera-x402/` (tx ids, topic id, no secrets). README sections. `NEW_VS_OLD.md` filled in | Files committed |
| H24-H26 | Record the 2-4 min video in your own voice. Write the submission | Video uploaded |
| H26-end | Buffer; submit well before 09:00 IST on Nov 7 | Submitted |

Commit every 30-60 minutes with clear messages (`feat(hedera): ...`). One big upload at the end
loses points with several partners.

## 3. Guardrails

- Testnet only (Hedera testnet, Arc testnet, Whitechain Sepolia). No mainnet transactions.
- Never commit `.env`, keys, `.wav` or `.mp4`.
- Wording: "settlement verified" or "CONFIRMED", never "settled" for our own status.
