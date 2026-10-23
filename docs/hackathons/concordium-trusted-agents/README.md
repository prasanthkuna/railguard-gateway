# Concordium "Trusted Agents" hackathon: plan (testnet only)

**Rules re-checked Oct 24, 2026** on the Concordium hackathon page (via the tracker link):
- Kick-off **Nov 2, 14:30 UTC = 20:00 IST**. Build window opens **Nov 19**.
- Checkpoint 1: **Nov 22, 23:59 UTC = Nov 23, 05:29 IST**.
- Final submission: **Dec 9, 23:59 UTC = Dec 10, 05:29 IST**. Target **Dec 9, 8:00 PM IST**.
- Bringing an existing agent is **allowed**. It must run on **Concordium testnet** and use at least
  one Concordium component: Concordium ID / verifiable credentials, Agent Registry + badge, x402,
  PLT (protocol-level tokens), sponsored transactions, or the MCP server.
- Submit: a description, a public repo, a video of **3 min or less**, a **CCDExplorer (testnet)
  link**, and a path to production.

## Idea: Railguard rail for Concordium PLT payments, gated by a verified identity

1. **Agent Registry + badge:** the Railguard-guarded agent is registered, and the badge shows it
   runs under spend rules.
2. **PLT transfer with a memo = Railguard request id**, on testnet (a stablecoin-style PLT if
   testnet has one; otherwise a test PLT the team is allowed to use).
3. **Concordium ID check:** a payee must prove a credential (e.g. "verified business" or "over 18
   + country") before Railguard allows payouts above a threshold.
4. **Verifier:** CONFIRMED only when the block is finalized (Concordium has fast finality) and
   the transaction outcome shows the exact PLT transfer with the memo. Timeout means UNKNOWN, then
   reconcile, the same pattern as `packages/rails/solana`.
5. Optional: **sponsored transactions**, so the agent does not need CCD for fees.

## Files planned (written from Nov 19)

| File | What |
|------|------|
| `packages/rails/concordium/src/facts.ts` | Pure check of transaction facts: outcome success, token id, from, to, amount, memo, finalized |
| `packages/rails/concordium/src/grpc.ts` | Read-only client for the testnet node (gRPC-web or the SDK) |
| `packages/rails/concordium/src/rail.ts` | Guarded pay, UNKNOWN, reconcile |
| `packages/rails/concordium/scripts/testnet-demo.ts` | ID check, allowed payout, denied payout, chaos timeout |
| `evidence/concordium-testnet/*.json` | CCDExplorer links |

A pure-function skeleton could be written earlier, because existing agents are allowed. It is held
back on purpose: the exact PLT transaction shape on testnet must be confirmed after the Nov 2
kick-off and the docs released then.

## Only Prasanth can do

1. Register on the hackathon page before Nov 2.
2. Install the Concordium wallet, create a **testnet** account, and get test CCD from the faucet
   (in the wallet). Keep keys out of the repo.
3. Issue or obtain a test identity credential for the ID demo.
4. Record the 3-minute video and submit before **Dec 10, 05:29 IST**.

Env var names planned: `CONCORDIUM_TESTNET_NODE_URL`, `CONCORDIUM_TESTNET_ACCOUNT_ADDRESS`,
`CONCORDIUM_TESTNET_KEYS_PATH` (path to the exported key file, never the key), `CONCORDIUM_PLT_ID`.
