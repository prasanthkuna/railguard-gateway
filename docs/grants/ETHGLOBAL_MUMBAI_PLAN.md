# ETHGlobal Mumbai (Nov 5–7, 2026, in person) — Continuity Track plan

Railguard is an open-source project by Prasanth Kuna (payments & backend engineer, solo builder).
**Do not build the Arc rail before the event.** The Continuity Track judges only new work done during the
hackathon, so everything below is planned now and built on site.

Prize source (checked Oct 22, 2026): <https://ethglobal.com/events/mumbai/prizes>

## 0. Baseline (before the event)

- Git tag **`ethglobal-mumbai-baseline`** marks the pre-event state of `main` and is pushed to GitHub.
  Every commit after this tag and dated Nov 5–7 counts as new work.
- Diff for judges: `git diff ethglobal-mumbai-baseline..main --stat`
  (or GitHub compare: `/compare/ethglobal-mumbai-baseline...main`).
- What already exists at the baseline (old work, not judged): the kernel (intent → grant → execute →
  observe → reconcile), Arbitrum Sepolia hook evidence, the Arc testnet evidence scripts, the x402 guard
  vendor packages, and the Airwallex sandbox rail.

## 1. Target prizes and their requirements

### Arc — "Arc Studio Continuity Track: Bring Your Project to Arc" ($3,000, Continuity only)

Take an existing project and use Arc Studio to add a working Arc integration (USDC/EURC payment flows,
nanopayments for agents/APIs, stablecoin settlement or escrow).

Required:
- **Built in Arc Studio**: include the Arc Studio project URL and show Studio in the demo. Every Arc prize
  requires Arc Studio as the starting point (<https://studio.arc.com>).
- A functional MVP: working frontend + backend, **plus an architecture diagram**.
- A video demo + presentation of the core functions and the use of Arc Studio and Circle developer tools,
  with docs.
- A GitHub repo link. **State which bounty** you are submitting for.

Fallback Arc bounty (open to all, $3,000): "Best Smart Contracts with Advanced Stablecoin Logic" (conditional
escrow, software-to-software payments), with the same Arc Studio requirements.

### Hedera — "AI Agents That Pay: x402 on Hedera" ($6,500: $3,000 / $2,000 / $1,500), stretch

Required:
- At least one **x402-protected endpoint that settles on Hedera testnet** (or mainnet) through a listed
  facilitator (Official x402, Ax402, Blocky402) or your own.
- An agent/client that completes **at least one paid request end to end with no human approving**.
- A public repo README covering setup, architecture and the payment flow, **with the Hedera transaction ID of
  at least one settled payment**.
- A demo video of **5 min or less** showing a payment settling, linked on **HashScan**.

Extra points that match Railguard: agent spending controls (budgets, per-merchant limits, allowlists,
human approval above a threshold), and an **HCS topic as a tamper-evident spend audit log**.

Note: "Built on Hedera (Continuity Track)" ($1,500) needs a project that already exists on Hedera. Railguard
does not, so it is not a target.

## 2. Hour-by-hour plan (on site)

Times are relative to hacking start (H0). Commit small and often with clear messages: judges read the history.

| Hours | Work | Done when |
|-------|------|-----------|
| H0–H1 | Check in, confirm Continuity registration, create the Arc Studio project, pick the bounty, open the `NEW_WORK.md` changelog | Arc Studio URL saved |
| H1–H3 | **Arc x402 rail** (`packages/kernel/src/adapters/arc/`): an x402 payment requirement priced in USDC on Arc testnet, with a deterministic payment id from the intent id | Unit tests with mocked facilitator |
| H3–H5 | Guard path: intent → grant → reserve → x402 pay, with UNKNOWN on timeout and duplicate pay blocked (reuse the kernel claim) | Duplicate test passes |
| H5–H6 | Break / mentor check with the Arc team on Studio and Gateway/CCTP usage | Questions answered |
| H6–H9 | **Arc settlement verifier**: read the USDC transfer on Arc by tx hash; check amount, recipient, token and confirmations; map to CONFIRMED | Verifier test + one testnet tx verified |
| H9–H11 | Paid API demo: an x402-protected endpoint, plus an agent client that pays within its budget and refuses over budget | One end-to-end paid request on Arc testnet |
| H11–H13 | Operator UI: an Arc payments view (intent, grant, x402 receipt, verifier result) and an architecture diagram | Page live on Preview |
| H13–H18 | Sleep | |
| H18–H21 | **Stretch, Hedera**: the same x402 endpoint settling on Hedera testnet through a listed facilitator, plus an HCS topic logging each spend decision | Hedera tx id + HashScan link |
| H21–H23 | Evidence: `evidence/arc-x402/` and `evidence/hedera-x402/` manifests (tx hashes, no secrets); README sections | Files committed |
| H23–H25 | Record the video (see section 4), write the submission text, fill in the changelog | Video uploaded |
| H25–end | Buffer: bugs, deploy check, submit before the deadline | Submitted |

Guardrails: testnet only (Arc testnet, Hedera testnet). No mainnet transactions that spend real funds.
Never commit `.env`, keys or `.wav/.mp4` files.

## 3. New-vs-old changelog template (`docs/grants/ETHGLOBAL_MUMBAI_NEW_WORK.md`, created at the event)

```markdown
# ETHGlobal Mumbai — new work (Nov 5–7, 2026)

Baseline: tag `ethglobal-mumbai-baseline` (commit <hash>, <date IST>)
Compare: https://github.com/prasanthkuna/railguard-gateway/compare/ethglobal-mumbai-baseline...main

## Existed before the event (not judged)
- Railguard kernel: intent, grant, claim, UNKNOWN, reconcile
- Arbitrum Sepolia hook evidence, Arc testnet evidence scripts, x402 guard packages
- Airwallex sandbox payout rail

## New at the event
| Time (IST) | Commit | What | Prize |
|------------|--------|------|-------|
| Nov 5 HH:MM | <hash> | Arc x402 rail: ... | Arc Continuity |
| ... | ... | Arc settlement verifier: ... | Arc Continuity |
| ... | ... | Hedera x402 endpoint + HCS audit topic | Hedera x402 |

## Evidence
- Arc Studio project: <url>
- Arc testnet tx: <hash> (explorer link)
- Hedera tx id: <id> (HashScan link)

## What's next
- ...
```

## 4. Video requirements

- **2–4 minutes.** (Hedera allows up to 5 min, but stay at or under 4 so one video serves every bounty.)
- **Own voice. No AI voice and no text-to-speech.**
- Show: Arc Studio on screen (required by Arc), the architecture diagram, one live paid request with the
  duplicate being blocked, the verifier marking it CONFIRMED, and the explorer / HashScan links.
- Open with the 1-line diff: what existed before vs what was built at the event.
- Suggested cut: 0:00 problem → 0:30 baseline vs new → 1:00 Arc x402 live → 2:15 verifier + receipt →
  2:45 Hedera stretch (if done) → 3:30 what's next.

## 5. Submission checklist

- [ ] Continuity Track selected; bounty named (Arc Continuity, and Hedera x402 if the stretch ships)
- [ ] Arc Studio project URL in the submission and shown in the video
- [ ] Architecture diagram committed and linked
- [ ] `ETHGLOBAL_MUMBAI_NEW_WORK.md` filled in, with the baseline tag link
- [ ] Hedera tx id + HashScan link in the README (stretch)
- [ ] 2–4 min video, own voice
