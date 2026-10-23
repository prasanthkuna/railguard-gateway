# ETHGlobal Mumbai: Continuity Track prep (Railguard)

**Event:** ETHGlobal Mumbai, **Nov 5-7, 2026**, Jio World Centre, in person (India). The application
was submitted Oct 22. **Submit by Nov 7, 09:00 IST** (from the event page; re-check on the
dashboard on day one).

**The rule that shapes everything:** the Continuity Track judges only work done during the
hackathon. So **nothing partner-specific is built before Nov 5.** This folder holds only plans,
checklists and paste-ready text. All code for Hedera, Arc and World lands on site, in small dated
commits after the baseline tag.

- Partner plan and hour-by-hour build: [PLAN.md](./PLAN.md)
- New-vs-old split template (filled in at the event): [NEW_VS_OLD.md](./NEW_VS_OLD.md)
- Submission draft: [SUBMISSION.md](./SUBMISSION.md)
- Older plan, still valid for Arc: [docs/grants/ETHGLOBAL_MUMBAI_PLAN.md](../../grants/ETHGLOBAL_MUMBAI_PLAN.md)

## Prizes picked (re-checked Oct 24, 2026 at ethglobal.com/events/mumbai/prizes)

ETHGlobal allows up to 3 partner prizes.

| # | Prize | Pool | Why it fits | Hard requirements |
|---|-------|------|-------------|-------------------|
| 1 | **Hedera: AI Agents That Pay, x402 on Hedera** | $6,500 (3,000 / 2,000 / 1,500) | Extra points are listed for agent spending controls (budgets, per-merchant limits, allowlists, human approval above an amount) and for an HCS topic used as a tamper-evident spend log. That is Railguard. | An x402-protected endpoint that settles on **Hedera testnet** through a listed facilitator (Official x402, Ax402, Blocky402) or your own. An agent that completes one paid request end to end with no human approving. A README with setup, architecture, the payment flow and **the Hedera transaction ID** of one settled payment. A video of 5 min or less showing the payment settle, with a HashScan link. |
| 2 | **World: World ID Agent Pass** (Continuity only) | $2,500 (1,500 / 1,000) | The Railguard approval step ("a human must approve above X") becomes a fresh World ID check, so an agent's large payment is approved by a verified human. | The official World ID Agent Pass. The full journey: request, the user completes it, the result is validated in the backend, then the protected action. A denied, expired or cancelled path where the action does **not** happen. No client secrets exposed. A short integration debrief: time to first success, friction, missing docs, the one biggest improvement. |
| 3 | **Arc: Arc Studio Continuity Track** (Continuity only) | $3,000 | Add USDC nanopayments to an existing agent tool. | Built in **Arc Studio** (project URL, and Studio shown in the demo). A working frontend and backend, plus an architecture diagram. A video and docs. State the bounty. **Before building, confirm at the Arc booth that an Arc testnet deploy is accepted.** If Studio needs mainnet, drop Arc (no mainnet) and use the fallback. |
| fallback | **Whitechain: Continuity, Bring Your Product to Whitechain** | $3,000 | Testnet only by rule (Whitechain Sepolia, chain 1874). | Contracts deployed **and verified** on Whitechain Sepolia. One payment in their test USDT `0xcedfB56113143d55b2358b8CFbB0dEB5Ad2f55a7` (not a self-minted token), with the explorer link. A README line on why it needs on-chain settlement. A before/during README section. A 2-4 min video. `WHITECHAIN_FEEDBACK.md`. |

Skipped: **Hedera "Built on Hedera" Continuity** (needs a project already on Hedera, and Railguard
is not), **ENS v2 integration** (needs Ethereum mainnet), **0G Keep Building** (needs a prior 0G
project), **1inch / Uniswap / Definitive / Chainlink** (no real fit).

## Only Prasanth can do

Before the event:
1. When the acceptance email arrives: pay the **0.02 ETH deposit** and **connect Discord** (you do
   these yourself).
2. Create a **Hedera testnet account** at <https://portal.hedera.com> (free, includes testnet
   HBAR). Keep the account id and key in your local `.env` only.
3. Create a **World developer portal** app at <https://auth.world.org/portal> and note the app id.
   Proofs are mocked during the event, so you do not need the sandbox iOS app.
4. Sign in to **Arc Studio** (<https://studio.arc.com>) once, so the account is ready.
5. On Nov 4 night, push the new start tag `ethglobal-mumbai-start` (PLAN.md, step 0). Do not move
   the old `ethglobal-mumbai-baseline` tag, because that needs a force-push.

At the event:
6. Get testnet USDC on Hedera through the faucet the Hedera team points to (Circle faucet or their
   own), and Whitechain Sepolia USDT if the fallback is used.
7. Record the video in **your own voice** (no AI voice, no text-to-speech), 2-4 minutes.
8. Submit on the ETHGlobal dashboard, choosing up to 3 partner prizes.

Env var names the event code will use (values only in the local `.env`):
`HEDERA_TESTNET_ACCOUNT_ID`, `HEDERA_TESTNET_PRIVATE_KEY`, `HEDERA_X402_FACILITATOR_URL`,
`HEDERA_HCS_TOPIC_ID`, `WORLD_APP_ID`, `WORLD_API_KEY` (if the backend check needs one),
`ARC_TESTNET_RPC_URL`, `WHITECHAIN_SEPOLIA_RPC_URL`, `WHITECHAIN_DEPLOYER_KEY`.
