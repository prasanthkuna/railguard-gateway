# Proof strategy — testnet vs mainnet (low cost, pro envelope)

**Updated:** 2026-10-14  
**Rule:** One **evidence pattern** everywhere: `bun run <chain>-evidence` → `evidence/<chain>/manifest.json` → public `/proof/<chain>` (where shipped) → `bun run verify-*-pack`.  
**Every grant/hackathon submission links:** [railguard-gateway](https://github.com/prasanthkuna/railguard-gateway) + [railguard-site.vercel.app](https://railguard-site.vercel.app).

## Cost summary (USD, realistic ranges)

| Proof target | Network | What you do | One-time / setup | Per-proof tx | Notes |
|--------------|---------|-------------|------------------|--------------|-------|
| **Done** | Monad testnet | USDC `transfer` + verify | $0 (Circle + MON faucets) | ~0 | `evidence/monad-testnet/` · Metropolis submitted |
| **Done** | Stellar testnet | Horizon payment | $0 (friendbot / test XLM) | ~0 | `bun run verify-stellar-scf-pack` |
| **Done** | Arbitrum Sepolia | USDC verify | $0 (faucets) | ~0 | HackQuest / general EVM credibility |
| **Readiness** | Arc testnet | RPC ping only | $0 ([Circle faucet](https://faucet.circle.com/) for testnet USDC) | ~0 | `bun run arc-testnet-evidence` — **not** microgrant-eligible |
| **Arc microgrant + Circle** | **Arc mainnet 5042** | CCTP bridge + **0.01 USDC** proof transfer | See [Arc costs](#arc-mainnet-cost-deep-dive) | ~$0.01–0.05 gas on Arc | **Required** for microgrant; **strong** for Circle grant |
| **Audit / ETHGlobal Arc track** | Arbitrum One | USDC or USDT verify | ETH on Arb for bridge/approve if needed | ~$0.05–0.30 L2 | `bun run arbitrum-one-evidence` |
| **Celo Open Rails** | Celo mainnet | wFIAT or USA₮ + ERC-8004 | CELO for gas (small) | varies | Not started in repo |
| **PayPal hackathon** | PayPal sandbox | API only | $0 | $0 | No chain proof required |
| **Airwallex** | Airwallex sandbox | API only | $0 | $0 | Track 03 = reconcile story |
| **Soroban** | Stellar | Contract deploy | XLM testnet/mainnet | higher | **Defer** unless SCF Build or HackMeridian requires it |

**Budget ceiling for Q4 chain proofs (pro minimum):** about **$15–25** all-in for **Arc mainnet** (mostly bridged USDC you keep) + **$1–5** for **Arbitrum One** micro-proof if you already hold USDC on Arbitrum.

---

## Arc mainnet cost deep dive

Sources: [Arc contract addresses](https://docs.arc.io/arc/references/contract-addresses), [stablecoin-native gas](https://docs.arc.io/arc/concepts/stablecoin-native-model), [CCTP fees](https://developers.circle.com/cctp/concepts/fees).

| Item | Amount | Notes |
|------|--------|-------|
| **Chain ID** | 5042 | RPC `https://rpc.mainnet.arc.io` |
| **USDC (ERC-20)** | `0x3600000000000000000000000000000000000000` | **6 decimals** for transfers; native gas balance uses **18 decimals** |
| **Mainnet faucet** | **None** | Only testnet USDC at faucet.circle.com |
| **Bridge in (CCTP Standard)** | **0 bps** protocol fee from Arbitrum/Base/etc. | You still pay **source-chain gas** (e.g. approve + burn on Arbitrum ≈ **$0.05–0.50**) |
| **Bridge in (CCTP Fast)** | **~1.4 bps** from Arbitrum | Optional; faster attestation |
| **Recommended first bridge** | **$10–15 USDC** | Same balance pays **gas** on Arc; keep **≥ $2** floor so wallet never stuck at 0 |
| **Railguard proof transfer** | **0.01 USDC** default (`ARC_MAINNET_AMOUNT=10000`) | One `transfer` + verify — enough for “live on Arc mainnet” |
| **Extra txs (optional)** | +$0.01 each | Second tx only if judges want “send + receive” story |
| **Microgrant payout if won** | **+$500 USDC** on Arc | ROI positive if you submit |

### Arc commands (PowerShell)

```powershell
cd c:\Users\PrashanthKuna\personal\web3\railguard-gateway

# After CCTP: wallet holds native USDC on 5042
# Optional: separate hot wallet — ARC_MAINNET_PRIVATE_KEY in .env.local

bun run arc-mainnet-usdc-proof
bun run verify-arc-microgrant-pack

# Re-verify from tx hash only (read-only, no spend):
$env:ARC_MAINNET_TX_HASH="0x..."
$env:ARC_MAINNET_SENDER="0x..."
$env:ARC_MAINNET_RECIPIENT="0x..."
$env:ARC_MAINNET_AMOUNT="10000"
bun run arc-mainnet-evidence
```

---

## Program → proof tier matrix

| Program | Proof tier | Evidence path | Pack verify |
|---------|------------|---------------|-------------|
| Stellar SCF #46 Build | **Testnet** (+ mainnet later) | `stellar-testnet-evidence` | `verify-stellar-scf-pack` |
| ETHGlobal Mumbai | **Testnet** + partner **mainnet** if Arc/Hedera prizes | Sepolia + optional Arc 5042 / Hedera | per partner |
| Circle Developer Grant | **Arc mainnet** + roadmap | `evidence/arc/` | manual + grant portal |
| Arc Microgrants | **Arc mainnet only** | `evidence/arc/` | `verify-arc-microgrant-pack` |
| Arbitrum Audit | **Testnet OK** + verified contracts | Sepolia + Arbiscan | `ARBITRUM_ONE_PROOF.md` |
| PayPal / Airwallex | **Sandbox** | demo URL + repo | N/A |
| Monad Metropolis | **Testnet** | `monad-testnet` | `verify-monad-metropolis-pack` |
| Celo Open Rails | **Mainnet** | TBD | TBD |

---

## Pro workflow (same for every chain)

1. **Spend once** — smallest transfer that satisfies eligibility (usually **0.01–1 USDC** or testnet faucet).  
2. **Verify read-only** — commit `manifest.json` + README under `evidence/`.  
3. **Publish** — update site constants / proof page from manifest (see Monad pattern in `apps/site/lib/monad-public-proof.ts`).  
4. **Gate** — `verify-*-pack` must pass before portal submit.  
5. **Paste block** — repo, live URL, explorer tx, reproduce command.

---

## Related docs

| Doc | Purpose |
|-----|---------|
| [ARC_MICROGRANT_SUBMIT.md](./ARC_MICROGRANT_SUBMIT.md) | Deadline, form fields, hour-by-hour submit plan |
| [CIRCLE_DEVELOPER_GRANT.md](./CIRCLE_DEVELOPER_GRANT.md) | Rolling grant after Arc proof |
| [ARBITRUM_ONE_PROOF.md](./ARBITRUM_ONE_PROOF.md) | Low-cost mainnet verify for Audit / L2 story |
| [SUBMISSION_MATRIX.md](./SUBMISSION_MATRIX.md) | All programs status |
