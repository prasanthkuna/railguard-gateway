# Arbitrum Open House — first-place execution plan

> **SUPERSEDED for Oct 2026 submission:** Canonical checklist is [ARBITRUM_TESTNET_SUBMIT.md](./ARBITRUM_TESTNET_SUBMIT.md) (Sepolia testnet only). Mainnet proof rows in this doc are not required for HackQuest testnet track.

**Submit by:** 2026-10-04  
**Goal:** **Complete on Arbitrum Sepolia** (contracts + product) + **external-wallet verification** (full lifecycle) + **mainnet proof** + **90s video**  

**Terminology (2026-10):** use **hook deployment** and **external-wallet verification** — not hook deployment/B or external-wallet verification in public copy.
**Judging lens:** smart-contract quality · PMF · innovation · real problem · USDG consideration

---

## 1. Winning thesis (why Railguard can take overall)

HackQuest winners in the same ecosystem (e.g. milestone escrows with **USDG on Arbitrum Sepolia**, Foundry tests, deploy address, demo video) win on **clarity + on-chain proof + problem fit**.

Railguard’s unfair advantages if shipped:

| Dimension | Competitors typical | Railguard |
| --- | --- | --- |
| Problem | Payments / escrow / DeFi | **Agent money mistakes** (APF-001…006) |
| Depth | One contract flow | **Intent → … → Evidence** + Failure Lab |
| Arbitrum | App + token | **Hook deploy** + **settlement verify** + **operator** |
| Trust | “We built X” | **Reproducible evidence** in repo + Arbiscan |

**One sentence for judges:** *Open-source financial execution firewall for autonomous agents — six failure classes demonstrated, policy before broadcast, on-chain ENFORCE on Arbitrum Sepolia, mainnet settlement verified.*

Do **not** compete on “most features.” Compete on **coherent security product + two Arbitrum proofs**.

---

## 2. Two-chain strategy (Sepolia complete + mainnet anchor)

```text
Arbitrum Sepolia (421614)     →  HOOK + ADAPTER + VALIDATOR deploy
                                 external-wallet verification demo (USDC/USDG transfer + observe)
                                 Foundry + addresses in evidence/

Arbitrum One (42161)          →  One real settlement (USDT or USDG)
                                 evidence/arbitrum-one/manifest.json
                                 Video + HackQuest “mainnet proof” link
```

Sepolia satisfies **“deploy on Arbitrum chain”** and **smart-contract quality**.  
Mainnet satisfies **“this is real, not testnet theater.”**

---

## 3. Hook deployment — protocol on Arbitrum Sepolia

**Repo:** `railguard-new/contracts`  
**Script:** `script/Deploy.s.sol` (Hook + Adapter + Validator)

### A1. Deploy (Day 1)

```powershell
cd railguard-new\contracts
# Faucet: https://faucet.quicknode.com/arbitrum/sepolia (or Alchemy)

$env:DEPLOYER_PRIVATE_KEY = "0x..."
$env:ACCOUNT_OWNER = "0x9a3f50804306fDB12046243bDF2dB33D61dcBA2d"
$env:RAILGUARD_SIGNER = "0x8c7E2543Aa8bf69dc8458Dc28104234f6A334233"

forge script script/Deploy.s.sol:Deploy `
  --rpc-url https://sepolia-rollup.arbitrum.io/rpc `
  --broadcast `
  --verify `
  -vvvv
```

**Cost:** testnet ETH only (~$0).

**Deliverable:** `evidence/arbitrum-sepolia-hook/README.md` with:

| Contract | Address |
| --- | --- |
| RailguardExecutionHook | `0x…` |
| RailguardAccountAdapter | `0x…` |
| RailguardSessionValidator | `0x…` |
| Explorer | sepolia.arbiscan.io |

### A2. Minimal on-chain demo (Day 2)

Pick **one** path (time-box):

- **Light:** Foundry test on Sepolia fork + broadcast one `ExecutionAllowed`-style interaction (document tx hash), **or**
- **Full:** Run SignGate + `e2e-happy-path.ps1` with `RPC_URL=https://sepolia-rollup.arbitrum.io/rpc` and deployed addresses in `.env.local`

**Deliverable:** tx hash + event log screenshot for submission + video insert.

### A3. USDG bonus (Sepolia, optional Day 2–3)

Reference token on Sepolia (used by other HackQuest projects):  
`0xFFC95faa3d63Cde504a05B567C600B78C0b41892` (verify on Arbiscan before use).

- One **external-wallet verification** intent denominated in USDG + MetaMask send + observe  
- Submission copy: “USDG settlement path on Arbitrum Sepolia”

**Do not** chase Robinhood Chain (4663) unless Sepolia + external-wallet verification are done.

---

## 4. External-wallet verification in Gateway (core product)

**Problem today:** `POST /v1/intents/:id/execute` requires **CDP paymentIntentId** — not MetaMask / external broadcast.

### B1. Execution model (Day 2–3)

Add **external broadcast rail** for `network: arbitrum-sepolia` | `arbitrum-one`:

| Step | API / state | Behavior |
| --- | --- | --- |
| Create intent | `POST /v1/intents` | `constraints.network`, `value.asset` (USDC/USDT/USDG), `counterparty.address` |
| Authorize | `POST /v1/intents/:id/authorize` | Policy + optional reserve |
| Execute (external) | `POST /v1/intents/:id/execute-external` | Status → **AWAITING_BROADCAST** (or `EXECUTING` + metadata); return **copy sheet** (chainId, token, to, amount) |
| Observe | `POST /v1/executions/:id/observe` `{ txHash }` | `settlementVerifyRail` + `generateArbitrumSepoliaEvidence` / `arbitrum-one` → **SETTLED** + evidence envelope |
| Deny | second intent wrong recipient | **DENIED** before broadcast (APF-004 in demo) |

**Files (expected touch):** `v5Api.ts`, `v5Store.ts`, `packages/integrations/.../settlementVerifyRail.ts`, migration if new status column needed.

### B2. Operator UI (Day 3–4)

On `executions/[id]`:

- **Broadcast panel:** network, token, amount, recipient (copy buttons)  
- **Submit tx hash** → refresh lifecycle + evidence  
- List page: filter/badge **Arbitrum**

### B3. Demo script (Day 4)

`docs/runbooks/arbitrum-tier-b-demo.md`:

1. Create intent (0.01 USDC Sepolia or mainnet USDT)  
2. Authorize  
3. Execute-external → MetaMask send  
4. Observe → receipt  
5. Wrong recipient intent → denied  

**MetaMask:** Yes — **only** for signing the ERC-20 transfer that matches the intent.

### B4. Staging

- `git push encore main` — **`GET /v1/executions`** live  
- Operator → staging API

---

## 5. Track C — Evidence & site (Day 4–5)

| Artifact | Path |
| --- | --- |
| Sepolia hook deploy | `evidence/arbitrum-sepolia-hook/` |
| Sepolia external-wallet verification tx | `evidence/arbitrum-sepolia/` (extend existing script) |
| Mainnet external-wallet verification | `evidence/arbitrum-one/` |
| Site | `/ecosystems/arbitrum` — **two proofs**: Sepolia hook + mainnet settlement |
| Submit gate | [ARBITRUM_SUBMIT_GATE.md](./ARBITRUM_SUBMIT_GATE.md) all checked |

Update manifest **honestly**:

- Sepolia: **HOOK DEPLOYED** + **TIER B DEMO**  
- One: **MAINNET VERIFIED**

---

## 6. Track D — Video & HackQuest (Day 5–8)

**90s HyperFrames** ([CLAIM_MAP.md](../media/CLAIM_MAP.md)):

1. Hook — agent wallet risk  
2. Six failures (fast) — `/attack`  
3. `protect` — block  
4. **Operator external-wallet verification** — intent → MetaMask → observe → **SETTLED**  
5. **Sepolia hook** address on Arbiscan (5s)  
6. **Mainnet** evidence tx  
7. Tagline + URLs  

**HackQuest project fields:** GitHub, demo URL, video URL, **two** explorer links (Sepolia contract + mainnet tx), USDG mention if done.

**Registration:** finish Online Profiles + project (not only “About you”).

---

## 7. Failure Lab — no new APF

Keep **APF-001…006**. In demo and video:

- **APF-003/004** — observe mismatch / wrong recipient  
- **APF-006** — hook blocks bypass (Sepolia hook tx or diagram)

---

## 8. What we skip (scope guard)

- CDP execute on Arbitrum  
- New failure profiles  
- Robinhood Chain / x402 USDG facilitator  
- Full Remotion/CapCut pipeline  
- Hook on **mainnet** unless Sepolia + external-wallet verification + video are done early

---

## 9. Day-by-day calendar (to Oct 4)

| Day | Focus |
| --- | --- |
| **D1** | Deploy hook triple **Arbitrum Sepolia** + evidence README |
| **D2** | external-wallet verification API (`execute-external`, `observe`) + Sepolia USDC test transfer |
| **D3** | Operator UI + deny-path demo + Encore deploy executions API |
| **D4** | Mainnet USDT observe + commit all evidence |
| **D5** | Site deploy + `/ecosystems/arbitrum` dual proof + optional USDG Sepolia tx |
| **D6–7** | HyperFrames master + claim QA |
| **D8** | HackQuest project submit + buffer |

---

## 10. First-place checklist (judge view)

- [ ] Verified **contracts** on Arbitrum Sepolia (Arbiscan)  
- [ ] **Foundry tests** green (`forge test`) — cite count in README  
- [ ] **Live demo** without slides: operator + MetaMask + Arbiscan  
- [ ] **Six failure classes** in video (not checklist prose)  
- [ ] **Mainnet** tx + manifest `ok: true`  
- [ ] **USDG** (optional): one Sepolia transfer or explicit roadmap sentence  
- [ ] **Open source** + single landing URL  
- [ ] **90s video** with real UI/terminal/chain only  

---

## 11. Risk register

| Risk | Mitigation |
| --- | --- |
| external-wallet verification API slips | Ship observe-only MVP first (manual intent in DB + observe endpoint) |
| SignGate E2E heavy | Sepolia deploy + one hook event tx enough for “contract quality” |
| No mainnet USDT yet | Block submit until `arbitrum-one-evidence` passes |
| Executions 404 | Encore deploy day 3 hard deadline |
| Key leaked in chat | Rotate Etherscan key; never commit `.env.local` |

---

**Next engineering start:** external-wallet verification `observe` + `execute-external` (Gateway) in parallel with hook deployment deploy (protocol).
