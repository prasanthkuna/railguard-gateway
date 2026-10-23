# NEAR HACKATHON: submission draft (send once, Nov 1-14 only)

## Title

**Railguard Guard for NEAR: spend limits for AI agents with function-call keys**

## Tagline

Give an AI money without giving it the keys to everything.

## Story

A function-call key already limits *what* an agent can call. Railguard adds *how much* and *to
whom*: a guard contract that holds the agent's float, enforces a daily budget, per-payee caps and an
allowlist, and refuses a replayed request id on chain. Off chain, a verifier marks a payment
CONFIRMED only when the final NEAR transaction shows the exact NEP-141 transfer, and a timeout
becomes UNKNOWN, never a second payment.

## How it is built

`<filled in during the window: contract, verifier, rail, demo script, testnet tx links>`

## Challenges

`<filled in during the window>`

## What's next

`<filled in during the window: NEAR Intents payouts, TEE-attested policy, mainnet path>`

## Demo script (2-3 min)

1. The agent asks to pay a payee 1 testnet USDC: ALLOW, then the tx on nearblocks and the verifier
   says CONFIRMED.
2. The agent tries over budget: the contract refuses, and the event is shown.
3. The agent retries the same request: refused on chain (replay).
4. The agent tries to send money directly with its key: impossible, because a function-call key
   cannot transfer.
5. A timeout is injected: UNKNOWN, then reconcile finds the tx, and no second payment is made.

## Payload template (do not send until Prasanth confirms every value)

```json
{
  "requestId": "<uuid generated once, reused on retry>",
  "projectName": "Railguard Guard for NEAR",
  "leadName": "Prasanth Kuna",
  "email": "<Prasanth to confirm>",
  "size": "1",
  "tracks": ["security", "agents"],
  "nearAddress": "<Prasanth's mainnet account, e.g. name.near>",
  "projectUrl": "https://github.com/prasanthkuna/railguard-gateway",
  "demoUrl": "<Prasanth's X post>",
  "idea": "AI agents need money but should not hold open keys. Railguard Guard is a NEAR contract plus an off-chain verifier: the agent gets a function-call key that can only call pay(), the contract enforces daily budgets, per-payee caps, an allowlist and one-time request ids, and the verifier marks a payment CONFIRMED only when the final NEP-141 transfer matches the intent. Timeouts become UNKNOWN, never a second payment.",
  "consent": true
}
```
