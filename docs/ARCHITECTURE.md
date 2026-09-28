# Railguard Gateway — architecture

**Maturity:** v0.1.0-alpha · testnet reference implementation · not for mainnet funds.

## Lifecycle

```text
Financial Intent
      ↓
Authorize  (policy / x402 / posture)
      ↓
Reserve    (atomic budget)
      ↓
Execute    (CDP, settlement-verify rails, …)
      ↓
Observe    (chain / Horizon / receipts)
      ↓
Reconcile  (UNKNOWN → confirmed | reconciliation_required)
      ↓
Evidence   (hash-bound envelopes, CLI receipts)
```

## Deployed runtime

| Layer | Technology | Notes |
|-------|------------|--------|
| Gateway API | Encore (TypeScript) | `apps/api` |
| Data | Postgres | Authoritative money state |
| Marketing site | Next.js (`apps/site`) | Public brand |
| Operator UI | Next.js (`apps/operator`) | Reference console |
| Execution | CDP SDK | Base Sepolia testnet when `PAYMENT_MODE=live` |

High-assurance **SignGate** (Go) and Solidity hooks live in **railguard-protocol** — optional ENFORCE path, not required for GUARD mode on Gateway.

## Developer entrypoints

| Entry | Use |
|-------|-----|
| `railguard.check(intent)` | SDK — authorize decision without execute |
| `railguard scan` | CLI — configuration / posture |
| `railguard attack` | CLI — Failure Lab profiles |
| `railguard receipts` | CLI — verify + evidence |

See [COMPONENTS.md](./COMPONENTS.md) and [INTEGRATION.md](./INTEGRATION.md).

Internal design history: [internal/](./internal/) (not recruiter-facing).
