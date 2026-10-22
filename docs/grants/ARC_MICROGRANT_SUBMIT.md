# Arc Microgrant — submission pack (deep dive)

**Deadline:** **14 Oct 2026, 23:59 ET** (≈ **15 Oct 2026 ~09:29 IST**)  
**Portal:** [Arc Microgrants](https://community.arc.io/public/events/arc-microgrants-f8tijfjhyq)  
**Prize:** **$500 USDC** on Arc (20 grants) · **Fee:** none  
**Strategy overview:** [PROOF_STRATEGY.md](./PROOF_STRATEGY.md)

## Eligibility (non-negotiable)

| Requirement | Railguard plan |
|-------------|----------------|
| **Live on Arc mainnet (5042)** | Public site + **CONFIRMED** USDC settlement manifest |
| **Public repo** | https://github.com/prasanthkuna/railguard-gateway |
| **Short description + Arc use** | Settlement verify rail on Arc; agent intent/reconcile story |
| **Builder profile** | GitHub + X (@prasanth_kuna) |
| **Not eligible** | Testnet-only, mockups, already Circle/Arc-funded duplicate |

| Check | Status |
| --- | --- |
| Registered on Arc House / event | **Done** |
| Application submitted | **Not yet** |
| `evidence/arc/manifest.json` CONFIRMED | **Not yet** |
| `bun run verify-arc-microgrant-pack` | Run before submit |

---

## How much Arc costs (budget)

| Step | Cost (USD) | Details |
|------|------------|---------|
| Bridge USDC → Arc (CCTP Standard) | **$0** protocol fee | From Arbitrum: [0 bps Standard](https://developers.circle.com/cctp/concepts/fees) |
| Source-chain txs (approve/burn) | **~$0.05–0.50** | Arbitrum One gas in ETH |
| **Keep on Arc after bridge** | **$5–8 minimum** (more optional) | Native USDC = gas; keep **≥ ~$1** floor after proof |
| Proof `transfer` (default) | **$0.01 USDC** | `10000` base units @ 6 decimals |
| Proof gas on Arc | **~$0.01–0.05** | Paid from same USDC balance |
| **Typical total out-of-pocket** | **~$5–9** + source gas | **Max loss to proof:** **0.01 USDC** to `ARC_MAINNET_RECIPIENT` + **~$0.02** gas |
| **If you win** | **+$500 USDC** | Paid on Arc after verification |

**There is no mainnet faucet.** Testnet USDC from [faucet.circle.com](https://faucet.circle.com/) does **not** count for this grant.

**USDC on Arc:** ERC-20 `0x3600000000000000000000000000000000000000` ([docs](https://docs.arc.io/arc/references/contract-addresses)).

---

## Fund safety (do not lose money)

1. **Recipient = wallet you control** — set `ARC_MAINNET_RECIPIENT` to your second address (same pattern as Monad demo wallets). The **0.01 USDC** proof is recoverable; it is not a fee.  
2. **Never commit keys** — only `.env.local`; `CDP_PRIVATE_KEY` in repo example must stay empty in git.  
3. **Preflight before spend** — `bun run arc-mainnet-preflight` (no tx).  
4. **Explicit confirm** — `ARC_CONFIRM=yes` required for `arc-mainnet-usdc-proof`.  
5. **One script** — `.\scripts\arc-microgrant-run.ps1 -ExecuteProof` runs preflight → proof → sync → verify.

**Checked 2026-10-14 (RPC + Chrome):**

| Check | Result |
|-------|--------|
| Demo sender `0x9a3f…ba2d` on Arc **5042** | **0 USDC** (native + ERC-20) |
| Same wallet on **Arbitrum One** | **0 USDC, 0 ETH** — cannot bridge from Arb without funding source chain first |
| DoraHacks | **Logged out** — [Register + Submit Build](https://dorahacks.io/hackathon/arc-microgrants/detail) after proof |
| Deadline (DoraHacks UI) | **2026/10/15 09:29 IST** (~18h) |
| Live site `/proof/arc-mainnet` | **404** on Vercel until you push + deploy; use **/ecosystems/arc** for submit until then |
| Circle testnet faucet | **Not eligible** for microgrant (mainnet only) |
| Proof tx gas (estimate) | **~0.0016 USDC** + **0.01 USDC** transfer (recoverable) |
| Bridge UI | [bridge.usdc.com](https://bridge.usdc.com/) (CCTP) — pick **Arc Mainnet** destination |

## Engineering path (minimum viable “live on Arc”)

Railguard does **not** need a custom contract for microgrant tier — a **working product** with **Arc mainnet settlement verification** matches “tiny apps / demos / technical experiments.”

| # | Task | Command / artifact |
|---|------|-------------------|
| 1 | Add Arc (5042) to wallet; bridge USDC via Circle CCTP | Wallet shows chain **5042**, native USDC > 0 |
| 2 | Send proof transfer | `bun run arc-mainnet-usdc-proof` |
| 3 | Commit manifest | `evidence/arc/manifest.json` + README |
| 4 | Push to `main` | GitHub raw manifest for verify script |
| 5 | Sync site proof | `bun run sync-arc-public-proof` → deploy `/proof/arc-mainnet` |
| 6 | Pack gate | `bun run verify-arc-microgrant-pack` → all PASS |
| 7 | Submit form | Paste [ARC_MICROGRANT_PORTAL_PASTE.md](./ARC_MICROGRANT_PORTAL_PASTE.md) |

### PowerShell sequence

```powershell
cd c:\Users\PrashanthKuna\personal\web3\railguard-gateway

# .env.local — never commit
# ARC_MAINNET_PRIVATE_KEY=0x...
# Optional: ARC_MAINNET_RECIPIENT=0x8c7e2543aa8bf69dc8458dc28104234f6a334233
# Optional: ARC_MAINNET_AMOUNT=10000   # 0.01 USDC

bun run arc-mainnet-usdc-proof
git add evidence/arc/manifest.json evidence/arc/README.md
git push origin main
bun run verify-arc-microgrant-pack
```

---

## Submission plan (hour-by-hour)

Assume **GO** decision with wallet funded on **5042**.

| Phase | Time | Action |
|-------|------|--------|
| **T0** | 0:00 | Confirm Arc wallet balance (native USDC ≥ ~$2, ERC-20 ≥ 0.01 USDC) |
| **T0+15m** | | Run `arc-mainnet-usdc-proof`; save explorer link |
| **T0+30m** | | Commit + push manifest; wait for Vercel if proof page updated |
| **T0+45m** | | `verify-arc-microgrant-pack` all PASS |
| **T0+60m** | | Fill Arc House form (below) |
| **T0+70m** | | Screenshot confirmation; note submit timestamp |

**NO-GO:** If bridge cannot complete before **23:59 ET**, skip microgrant; reuse same Arc mainnet work for **[Circle Developer Grant](./CIRCLE_DEVELOPER_GRANT.md)** (rolling, higher upside).

---

## Portal paste (form fields)

| Field | Value |
|-------|-------|
| **Project name** | Railguard |
| **One line** | Open-source execution firewall for agents — intent, protect, reconcile, settlement receipts. |
| **Live deployment** | https://railguard-site.vercel.app/ecosystems/arc |
| **Repo** | https://github.com/prasanthkuna/railguard-gateway |
| **What it does** | Read-only **settlement verification** on Arc mainnet for USDC transfers: match receipt logs to expected sender/recipient/amount; same kernel as Stellar/Monad/Arbitrum proofs. |
| **Why Arc** | USDC-native gas + Circle USDC; Railguard proves agent payouts on Arc with deterministic CONFIRMED/UNKNOWN receipts for reconcile workflows. |
| **Arc mainnet proof** | Tx: _(from manifest `txHash`)_ · Explorer: _(from `explorerUrl`)_ |
| **Reproduce** | `bun run arc-mainnet-evidence` with env vars in `evidence/arc/README.md` |
| **Profile** | GitHub: prasanthkuna · X: @prasanth_kuna |

---

## After submit

- Rolling review; **all decisions by 21 Oct 2026** ([event page](https://community.arc.io/public/events/arc-microgrants-f8tijfjhyq)).
- If selected: short **verification for payout** (wallet on Arc).
- **Next funnel:** Circle Developer Grant with same Arc proof + milestones.

## RPC reference

| Network | Chain ID | RPC |
|---------|----------|-----|
| Arc mainnet | 5042 | https://rpc.mainnet.arc.io |
| Arc testnet | 5042002 | https://rpc.testnet.arc.io (readiness only) |
