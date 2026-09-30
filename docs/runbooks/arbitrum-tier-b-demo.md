# Arbitrum Tier B demo runbook

## Operator (staging)

1. Sign in to https://prebroadcast.vercel.app/executions
2. Click **Start Tier B flow** → choose **Arbitrum Sepolia** or **Arbitrum One**
3. On execution detail, copy token / recipient / amount → **MetaMask** ERC-20 send on matching chain
4. Paste **tx hash** → **Observe & settle** → status **SETTLED** + evidence

## API

```http
POST /v1/intents
POST /v1/intents/:id/authorize
POST /v1/intents/:id/execute-external
POST /v1/executions/:id/observe  { "txHash": "0x..." }
GET  /v1/executions/:id/evidence
```

## Deny demo (APF-004)

Create intent with wrong `counterparty.address` → authorize → **DENIED** (no MetaMask).
