# ETHGlobal Mumbai: submission draft (Continuity Track)

> Paste-ready skeleton. The numbers, tx ids and links are filled in at the event. No AI voice in
> the video.

## Title

**Railguard: spend limits for agents that pay over x402**

## Tagline

Agents can pay for APIs now. Railguard decides how much, to whom, and proves it on chain.

## Story

AI agents can now pay per request over x402. That is great until an agent loops, overpays, pays a
look-alike merchant, or retries a timed-out payment and pays twice. Railguard is an open-source
guard that sits between the agent and the payment. It existed before Mumbai as a kernel with
budgets, intents and an UNKNOWN state for timeouts. At ETHGlobal Mumbai we brought it to Hedera:
a paid API that settles on Hedera testnet, an agent that pays it on its own within a budget, a
verifier that marks a payment CONFIRMED only when the Hedera mirror node shows the exact facts,
and an HCS topic where every spend decision is logged so anyone can audit the agent.

## What is new at this event

See [NEW_VS_OLD.md](./NEW_VS_OLD.md) and the compare link
`/compare/ethglobal-mumbai-start...main`.

## How it is built

- x402 seller: `<facilitator>` on Hedera testnet, priced in `<asset>`.
- Agent client: the Railguard kernel decides ALLOW / DENY / APPROVAL_REQUIRED before paying.
  The payment id comes from the intent, so a retry is the same payment.
- Verifier: Hedera mirror node REST, result SUCCESS, token, amount, payee and consensus timestamp.
- Audit: HCS topic `<id>`, with hash-chained decision records.
- Human approval above the threshold: World ID Agent Pass, validated on the server.
- (Arc Studio / Whitechain part, if shipped.)

## Challenges

`<filled in at the event: e.g. facilitator fee payer, HTS token association, mirror node lag>`

## What's next

`<filled in at the event>`

## Demo script (2-4 min, own voice)

1. **0:00-0:20.** The problem: an agent paying per call can overspend or pay twice.
2. **0:20-0:40.** Old vs new: show the compare link, then the new folders.
3. **0:40-1:40.** Live: the agent calls the paid API, gets a 402, Railguard allows it, the payment
   settles on Hedera testnet, HashScan opens, the verifier says CONFIRMED.
4. **1:40-2:10.** Guard: over budget, the agent is refused. A merchant not on the allowlist is
   refused. A timeout is UNKNOWN and no second payment is made.
5. **2:10-2:40.** A large payment waits for World ID Agent Pass. The denied path pays nothing, and
   the approved path pays once.
6. **2:40-3:10.** The HCS audit topic on HashScan.
7. **3:10-3:30.** What's next.

## Partner prize selection (max 3)

1. Hedera: AI Agents That Pay, x402 on Hedera
2. World: World ID Agent Pass (Continuity)
3. Arc: Arc Studio Continuity (only if testnet is accepted), else Whitechain Continuity
