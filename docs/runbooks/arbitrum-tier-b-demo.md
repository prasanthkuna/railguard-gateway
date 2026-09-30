# Arbitrum Sepolia wallet verification runbook

## Operator (testnet console)

1. Sign in to https://prebroadcast.vercel.app/executions
2. Click **Create test intent** (Arbitrum Sepolia only — no network selector)
3. On execution detail, copy token / recipient / **0.01 USDC** amount → send ERC-20 transfer from **your wallet** (Railguard does not sign)
4. Paste **tx hash** → **Verify transaction** → status **SETTLED** + evidence envelope

Public judges: https://railguard-site.vercel.app/proof/arbitrum-sepolia (no auth)

## API

```http
POST /v1/intents
POST /v1/intents/:id/authorize
POST /v1/intents/:id/execute-external
POST /v1/executions/:id/observe  { "txHash": "0x..." }
GET  /v1/executions/:id/evidence
```

## Policy denial vs settlement mismatch (APF-004)

- **Policy denial:** intent fails authorization when policy explicitly denies (e.g. blocked recipient in policy rules).
- **Settlement mismatch:** authorization may succeed; **Verify transaction** fails when the on-chain transfer does not match authorized token, recipient, amount, or chain.

Wrong `counterparty.address` in intent without matching policy is typically caught at verification, not necessarily at authorize.
