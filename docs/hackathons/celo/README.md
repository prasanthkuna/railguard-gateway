# Railguard × Celo: x402 payments an agent cannot get wrong (Celo Sepolia testnet)

An AI due-diligence agent buys paid data (an FX quote, an address risk score) from x402 services and pays in
**USDC on Celo Sepolia**. Railguard (built on [x402-guard](../../../vendor/x402-guard)) checks every 402 before the
agent signs, binds the payee to its **ERC-8004** identity, never pays twice, and verifies every settlement on-chain.

**Testnet only.** This build never signs or sends anything on Celo mainnet. Mainnet is refused in four places:
the guard (`MAINNET_DISABLED`), the RPC chain-id check, the facilitator URL check and the network constants.

Code: [`packages/rail-celo`](../../../packages/rail-celo) · Tests: `bun test packages/rail-celo` · Evidence: [`evidence/`](./evidence)

## What it shows

| Step | What the agent tries | What Railguard does |
| --- | --- | --- |
| 1 | Buys an FX quote and a risk score; the risk-score response is lost | FX quote `CONFIRMED` (Transfer + AuthorizationUsed checked on-chain). Risk score `UNKNOWN`, budget frozen |
| 2 | Buys a 2.50 USDC report | Refused: `PER_CALL_CAP` (1.00 USDC) |
| 3 | Uses a cheaper "mirror" whose 402 names a different `payTo` | Refused: `PAYEE_IDENTITY_MISMATCH` (not the seller's ERC-8004 agent wallet) |
| 4 | Uses a feed that asks for Celo mainnet | Refused: `MAINNET_DISABLED` |
| 5 | Retries the risk score | `BLOCKED_DUPLICATE`, then reconciles by the EIP-3009 nonce: one payment, `CONFIRMED` |
| + | `--volume N` repeat purchases | N more small payments, each verified on-chain |

The run ends with a hard check: **one on-chain payment per intent**.

## How it works

- **The nonce is the request id.** The EIP-3009 `nonce` is `keccak256("railguard:celo:x402:" + intentId)`. USDC can use a nonce only once, so the same
  intent can never be paid twice, even by a buggy facilitator. Reconcile asks USDC `authorizationState(from, nonce)` and finds the `AuthorizationUsed` log.
- **Provable deadline.** `validBefore` is at most 5 minutes. If the nonce is still unused after it, the payment can never happen: `FAILED_SAFE`, budget released.
- **UNKNOWN, not retry.** If the paid request gets no answer, the attempt is `UNKNOWN`, the reservation is frozen and new attempts are blocked. If the nonce is
  unused and still valid, Railguard re-sends the same signed payload with the same x402 `payment-identifier`, so the seller returns the cached result instead of charging again.
- **Payee identity.** Each seller origin is bound to an ERC-8004 agent id. `payTo` must equal that agent's `agentWallet` in the Identity Registry
  (`0x8004A818BFB912233c491871b3d84c89A494BD9e` on Celo Sepolia).
- **Intent binding.** x402-guard reserves the budget against a hash of the exact payment requirements; a 402 that changes after approval is refused (`INTENT_CHANGED`).
- **Settlement verifier.** `verifyCeloUsdcSettlement` checks the receipt status, the USDC `Transfer` (from, to, value), the `AuthorizationUsed` nonce and finality.
- **Attribution.** With `CELO_ATTRIBUTION_CODE` set, every agent registration and every self-facilitated settlement carries the ERC-8021 data suffix.
- **Facilitator.** Either Celo's hosted Sepolia facilitator (`https://api.x402.sepolia.celo.org`, needs `X402_API_KEY`) or self-facilitation, where the seller submits
  `transferWithAuthorization` with its own test CELO.
- **Audit.** Every decision and receipt is kept by x402-guard and can be exported as JSONL.

`bun run celo:wire-check` needs no keys: it signs a real EIP-3009 authorization with a throwaway key and sends it to Celo's live Sepolia facilitator `/verify`.
The facilitator answers `insufficient_funds` (signature and format accepted) and rejects a broken signature
([evidence/facilitator-wire-check.json](./evidence/facilitator-wire-check.json)).

## Run it

```bash
bun install
bun run celo:demo                       # offline: in-memory USDC with real EIP-712 checks, scripted agent
bun run celo:wire-check                 # keyless check against the live Celo Sepolia facilitator
bun run celo:preflight                  # addresses and testnet balances (prints no keys)
bun run celo:register                   # register buyer and seller on the ERC-8004 registry (Celo Sepolia)
bun run celo:demo -- --testnet --volume 20 --save   # real Celo Sepolia payments, writes evidence/testnet-latest.json
bun test packages/rail-celo
```

Environment for testnet mode (in `.env`, never committed):

| Variable | Needed for | Where to get it |
| --- | --- | --- |
| `CELO_AGENT_PRIVATE_KEY` | buyer agent (pays) | a fresh testnet-only key; fund it with test USDC at faucet.circle.com (choose Celo Sepolia) and test CELO at faucet.celo.org/celo-sepolia. Falls back to `TESTNET_WALLET_PRIVATE_KEY` |
| `CELO_SELLER_PRIVATE_KEY` | seller agent (receives, registers, self-facilitates) | a second fresh testnet-only key with test CELO from faucet.celo.org/celo-sepolia |
| `X402_API_KEY` (optional) | Celo hosted facilitator | x402.celo.org dashboard (testnet credits). Without it the seller self-facilitates |
| `CELO_ATTRIBUTION_CODE` (optional but needed for judging) | ERC-8021 attribution tag | given when you register the project on Loops House |
| `GEMINI_API_KEY` (optional) | Gemini agent | aistudio.google.com; without it the scripted model runs |
| `CELO_SEPOLIA_RPC_URL`, `CELO_AGENT_MODEL`, `CELO_SELLER_AGENT_ID`, `CELO_BUYER_AGENT_ID` (optional) | overrides | defaults: Forno Sepolia RPC, `gemini-2.5-flash`, ids from `evidence/identity.json` |
