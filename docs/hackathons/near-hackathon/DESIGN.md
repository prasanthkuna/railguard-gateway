# NEAR: Railguard guard design (to build Nov 1-14)

## The problem in NEAR terms

NEAR already has a strong primitive: a **function-call access key**. It can only call named
methods on one contract, and it cannot attach a deposit. That is a sandbox for *what* an agent can
call, but not for *how much it spends* or *who it pays*. Railguard adds those rules.

## Pieces

```text
 agent (LLM) -> Railguard kernel (off-chain policy, intent, request id)
     |  function-call key, limited to guard.pay / guard.status
     v
 railguard-guard.testnet (Rust contract)
   - holds the agent's spending float (NEAR + NEP-141 testnet USDC)
   - per-agent daily budget, per-payee cap, payee allowlist (owner-only setters)
   - request_id map: one request id = one payment, a replay is refused on chain
   - pay() -> ft_transfer to the payee with memo = request id (or a native transfer)
   - emits NEP-297 events (EVENT_JSON) for every ALLOW / DENY
     |
     v
 NEAR settlement verifier (TypeScript, packages/rails/near)
   - RPC tx status with wait_until FINAL (or EXPERIMENTAL_tx_status)
   - CONFIRMED only if: every receipt outcome is a success, an nep141 ft_transfer event shows
     old_owner_id = guard, new_owner_id = payee, amount = intent amount, memo = request id
   - a timeout on send is UNKNOWN; the reconciler looks the tx up by hash and by the
     contract's request_id map before anything is retried
```

## Files to create in the window

| File | What |
|------|------|
| `packages/rails/near/contract/src/lib.rs` | The guard contract (near-sdk-rs). Owner, agents, budgets, allowlist, request id map, `pay`, `status`, events |
| `packages/rails/near/contract/tests/` | Workspaces tests: replay refused, cap, budget, unknown payee, wrong caller |
| `packages/rails/near/src/rpc.ts` | JSON-RPC client (no SDK), testnet only (`chain_id` checked through `status`) |
| `packages/rails/near/src/verifier.ts` | Final-status and NEP-141 event checks, then CONFIRMED / PENDING / FAILED / RECONCILIATION_REQUIRED |
| `packages/rails/near/src/rail.ts` | Guarded pay: kernel decision, request id, function-call key, UNKNOWN on doubt, reconcile first |
| `packages/rails/near/scripts/testnet-demo.ts` | Agent run: one allowed payment, one over budget, one replay, one timeout, all on testnet |
| `evidence/near-testnet/*.json` | tx hashes, explorer links (testnet.nearblocks.io), no secrets |

## Reuse from the existing repo (allowed: it is open source and public before the window)

- The kernel's intent, grant, request id and UNKNOWN state.
- The patterns from the Solana devnet rail (`packages/rails/solana`): memo/request id binding,
  reconcile-first, and budget frozen while UNKNOWN. The NEAR code itself is new.

## Day plan (window)

| Day | Work |
|-----|------|
| Nov 1-2 | Contract: storage, owner/agent roles, allowlist, budgets, request id map, `pay` (native first) |
| Nov 3-4 | NEP-141 testnet USDC path (`ft_transfer` with 1 yocto from the contract), events, tests |
| Nov 5-7 | (ETHGlobal Mumbai, in person, so little NEAR work) |
| Nov 8-9 | TS verifier + rail, live testnet runs, evidence |
| Nov 10-11 | Function-call key demo: the agent key can only call `pay`/`status`. Show a refused direct transfer |
| Nov 12 | README for AI judges ("do X, see Y"), video, screenshots |
| Nov 13 | X post by Prasanth; payload approved |
| Nov 14 | Submit once, before 8:00 PM IST |
