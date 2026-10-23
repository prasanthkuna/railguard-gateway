# Submission draft: Celo "Agents on Open Rails"

> Draft for Prasanth to review and paste into Loops House. Fill the `TODO` items after `celo:register` and the testnet run.

**Project name:** Railguard for Celo x402

**One line:** An AI agent that pays for data with x402 on Celo, where every payment is checked before signing, bound to the seller's ERC-8004 identity, never sent twice, and verified on-chain.

**Track:** USA₮ x402 (agent paying x402 services). Note: this build uses **USDC on Celo Sepolia** because it is testnet only (see "Testnet only" below).

**Links**
- Repo (Apache-2.0, public): https://github.com/prasanthkuna/railguard-gateway (code in `packages/rail-celo`, docs in `docs/hackathons/celo`)
- Buyer ERC-8004 Agent ID: TODO (from `docs/hackathons/celo/evidence/identity.json`)
- Seller ERC-8004 Agent ID: TODO
- Testnet evidence: `docs/hackathons/celo/evidence/testnet-latest.json` (every payment with its Celo Sepolia explorer link)
- Video: TODO

## Testnet only: the testnet volume is the proof

This project runs **only on Celo Sepolia**. It does not sign or send anything on Celo mainnet, and there is no mainnet script.
Mainnet is refused in code (guard, RPC chain-id check, facilitator URL check).
We know the judging puts weight on real mainnet settlement. Our proof is the Celo Sepolia volume instead: TODO N
x402 payments by our ERC-8004 agent, each with an explorer link, each verified on-chain by Railguard's settlement verifier
(USDC Transfer + EIP-3009 AuthorizationUsed), with the ERC-8021 attribution tag on every registration and settlement.

## The problem

Agents that pay per request will make mistakes at machine speed: paying a spoofed `payTo`, paying twice after a timeout,
paying more than they should, or paying on the wrong network. A 402 response is just a request for money. Someone has to check it.

## What it does

A due-diligence agent (Gemini 2.5 Flash with function calling, or a scripted model) buys an FX quote and an address risk score from x402 services. Railguard:

1. **Checks the 402 before signing:** network (Celo Sepolia only), exact asset (USDC, EIP-712 domain checked), per-call cap, daily budget, timeout length.
2. **Checks who gets paid:** the `payTo` must equal the seller's `agentWallet` in the ERC-8004 Identity Registry. A cheaper "mirror" with a different wallet is refused.
3. **Never pays twice:** the EIP-3009 nonce is derived from the intent id, so USDC itself enforces one payment per intent. A lost response becomes `UNKNOWN` with money frozen; reconcile reads `authorizationState` and the `AuthorizationUsed` log to find the one payment.
4. **Fails safe:** if the authorization expired unused, the payment is provably impossible, so the budget is released (`FAILED_SAFE`).
5. **Verifies settlement:** a payment is `CONFIRMED` only after the receipt, the USDC Transfer and the nonce check out on-chain.

## How we built it

- TypeScript on Bun, viem, on top of our open-source **x402-guard** (budget reservations, replay detection, receipts).
- x402 v2 headers (`PAYMENT-REQUIRED`, `PAYMENT-SIGNATURE`, `PAYMENT-RESPONSE`) and the `payment-identifier` extension.
- Celo Sepolia USDC (EIP-3009), Celo's hosted x402 facilitator or self-facilitation.
- ERC-8004 Identity Registry on Celo Sepolia for both agents; ERC-8021 attribution suffix.
- 14 tests with an in-memory USDC that checks real EIP-712 signatures and single-use nonces, plus a keyless check against the live Celo Sepolia facilitator.

**What was built during the hackathon:** x402-guard existed before. The whole Celo package (`packages/rail-celo`) is new: x402 v2 seller and buyer rail, the ERC-8004 identity binding, the settlement verifier, nonce-based reconcile, ERC-8021 attribution, the agent, the demo and the tests.

## Counterparty

TODO (Prasanth): the brief values repeat payments from a named outside counterparty. Today the seller is our own demo service on Celo Sepolia. If an outside team will call or sell through it on testnet, name them here.

## What's next

- USA₮ and other stablecoins once mainnet is in scope.
- Use the ERC-8004 Reputation Registry: after each CONFIRMED purchase, the buyer leaves feedback for the seller.
- Shared Railguard ledger so several agents share one budget.
