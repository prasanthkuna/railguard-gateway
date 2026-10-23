# Encode Club Solana Hackathon 2026: submission draft

**Event:** Encode Club x Solana Foundation, online, teams of up to 5 (solo allowed).
**Challenge:** **Best Use of x402 on Solana** (prize: accelerator places, non-cash). Also eligible
for the main judging.

**Rules re-checked Oct 24, 2026** at <https://www.encodeclub.com/programmes/solana-hackathon-2026>:
- Final submissions close **Sunday Nov 8, 23:59 UTC-12 = Monday Nov 9, 17:29 IST**. That is a
  hard cut-off. Winners are announced Nov 16.
- Mid-submission checkpoint: **Sunday Nov 1** (feedback). Registration also closes then (the FAQ
  says Nov 2).
- **Project creation closed Oct 19.** After that, people can still join an existing team until
  registration closes. **Blocker:** Prasanth must sign in and check whether he can still create a
  project or must join one. If neither works, this entry is dropped. The code stays useful for
  Railguard either way.
- Existing work is allowed as a starting point, but the judged part must be built during the four
  weeks (Oct 12 to Nov 8), and the submission must say what existed before. This Solana rail was
  written **Oct 24, inside the window**.
- x402 challenge asks for: a working demo (**devnet is enough**), a repo with README and setup, a
  **2-4 minute video**, and a clear note on how Solana powers it. It is judged on meaningful use of
  both x402 and Solana, reliability of payment-to-access, a compelling use case, docs, and
  **sensible handling of failed payments**.

## Title

**Railguard for Solana: agents that pay per request and never pay twice**

## Tagline

x402 lets an agent pay for an API. Railguard makes sure it pays the right amount, to the right
seller, exactly once.

## What existed before vs what is new

- **Before (not judged):** the Railguard kernel ideas (intent, grant, UNKNOWN state, reconcile) and
  EVM / Stellar verifiers in TypeScript. There was **no Solana code at all**.
- **New in the window (Oct 24 onward):** everything in `packages/rails/solana/`. That covers the
  transaction builder, devnet RPC client, spend guard, guarded pay / reconcile state machine,
  finalized-balance verifier, x402-style seller and buyer, and devnet scripts, plus tests.

## Story

An agent that pays per API call is great until the network hiccups. The payment goes out, the
response is lost, and the agent pays again. Or the seller raises the price, or a look-alike seller
asks to be paid. On Solana this happens in milliseconds, so the guard has to be in code.

## How it works

1. The seller answers **402** with a quote: USDC (devnet mint), amount, payee, and a one-time
   nonce. Its memo is the request id for `x402:<nonce>`.
2. The agent's Railguard rail checks the policy in code: only the USDC mint, only allowlisted
   sellers, a per-payment cap, a daily budget, and human approval above 0.50 USDC bound to the exact
   terms hash.
3. It looks for the memo on chain first, then signs one transaction: **Memo(request id) +
   TransferChecked**.
4. If the send times out, the payment is **UNKNOWN**. The budget stays reserved and nothing is
   re-signed. The rail reconciles by signature and memo. Only an **expired blockhash** with no
   sighting proves the old transaction can never land.
5. The seller checks the payment on chain: the exact balance change to the payee, the memo, and no
   error. Each signature unlocks the resource **once**, so a replay gets 402 again.
6. For crediting and accounting, the rail waits for **finalized** before saying CONFIRMED.

## Failed payment handling (what judges asked for)

| Case | What happens |
|------|--------------|
| Send times out after it landed | UNKNOWN, retries blocked, reconcile finds it, CONFIRMED once |
| Send times out and never landed | UNKNOWN until the blockhash expires, then FAILED_SAFE, then one resend with the same memo |
| RPC rejects in preflight | FAILED_SAFE (never broadcast), budget released |
| Payee has no USDC token account | Refused before signing |
| Seller not on allowlist / over cap / over budget | DENY with a code and a next step, nothing signed |
| Same payment replayed to the seller | 402, `signature_already_used` |
| Mainnet RPC configured by mistake | Refused (`refusing_non_devnet_cluster:mainnet`) |

## Try it

```bash
bun install
bun test packages/rails/solana
TESTNET_INTEGRATION=1 bun test packages/rails/solana/src/live.test.ts
bun run packages/rails/solana/scripts/x402-devnet-demo.ts   # needs the env vars below
```

## Challenges

- Building a Solana transaction without an SDK, so it can be returned unsigned to a wallet or
  signed locally. It is checked against `@solana/web3.js`: same instructions, the signature
  verifies, and the bytes round-trip identically.
- Deciding when "not found" really means "will never land": we tie it to the blockhash's
  `lastValidBlockHeight`.
- Measuring the real token movement instead of trusting instruction data: owner-level
  pre/post balance deltas.

## What's next

- Plug in an official x402 SVM facilitator, so sellers that use the standard scheme work unchanged.
- Return the same unsigned transaction to PayBox (MoonPay) for user approval.
- Token-2022 mints and priority fees.

## Demo script (2-4 min, own voice recommended)

1. **0:00-0:20.** The problem: an agent paying per call can pay twice on a timeout.
2. **0:20-1:10.** `x402-devnet-demo.ts`: 402 quote, Railguard ALLOW, one Solana devnet payment
   (Explorer link), the seller verifies on chain, the data is returned, a replay gets 402.
3. **1:10-2:00.** `RAILGUARD_SOLANA_CHAOS=timeout devnet-pay.ts`: the response is dropped, the
   state is UNKNOWN, the agent's retry is blocked, reconcile finds it, CONFIRMED after finality,
   and the sends count is 1.
4. **2:00-2:40.** Guard denials: unknown seller, over cap, over budget, approval required.
5. **2:40-3:10.** Code tour (`rail.ts`, `verifier.ts`) and `bun test` (21 pass).
6. **3:10-3:30.** What's next.

## Only Prasanth can do

1. **Sign in on Encode** and confirm he can still create a project or join one. Registration
   closes Nov 1-2. Ideally also submit the mid-checkpoint on Nov 1.
2. Create **two devnet wallets** (payer and seller), e.g. `solana-keygen new -o %USERPROFILE%\.railguard-solana\devnet.json`
   and a second one for the seller. Put them outside the repo.
3. Fund them: devnet SOL from <https://faucet.solana.com>, and **devnet USDC** from
   <https://faucet.circle.com> (choose Solana Devnet) for **both** wallets. The seller needs a USDC
   token account, and the faucet creates it.
4. Set `SOLANA_DEVNET_KEYPAIR_PATH` and `SOLANA_DEVNET_RECIPIENT` and run the three scripts. Then
   commit `evidence/solana-devnet/*.json`.
5. Record the 2-4 min video and submit on the project page before **Nov 9, 17:29 IST**. Aim for
   **Nov 8 evening IST**.
