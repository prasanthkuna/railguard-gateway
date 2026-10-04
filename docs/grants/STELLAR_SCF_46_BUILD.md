# SCF Build #46 — full application (after invite)

Use after SCF invites you from the **Interest Form**. Aligns with [Budget & Deliverable Guidelines](https://stellar.gitbook.io/scf-handbook/scf-awards/build-award/budget-and-deliverable-guidelines) and [Submission Criteria](https://stellar.gitbook.io/scf-handbook/scf-awards/build-award/submission-criteria).

**Track:** Open · **Deadline:** 2026-11-08 · **Total budget example:** $75,000 USD (XLM at payment)

---

## Executive summary (paste)

Railguard adds a **financial execution firewall** for AI agents on Stellar: policy-bound payments, Horizon-based settlement verification, and public evidence. Testnet is **verified today**; grant funds **mainnet** observe/reconcile, operator integration, docs, and a public Stellar proof page—same pattern as our Arbitrum Sepolia reference.

---

## Architecture (complete at application — not tranche 1 planning)

- **Intent → grant → prepare → observe/reconcile** via `ExecutionRail` (`packages/integrations/src/rails/stellarRail.ts`).
- **Horizon** fetches payment operations; verify matches destination, amount, memo (`packages/settlement/src/stellar-testnet.ts`).
- **Evidence:** manifest JSON + site/ecosystem slice; repro `bun run stellar-testnet-evidence`.
- **Non-goals for #46:** Replacing wallets/anchors; speculative new chains (engineering freeze except Stellar milestones).

Link: https://github.com/prasanthkuna/railguard-gateway/blob/main/docs/ARCHITECTURE.md

---

## Stellar integration plan

1. **Testnet (done):** CONFIRMED Horizon verify; document in repo and `/ecosystems/stellar`.
2. **Mainnet Horizon:** Same verify path against `horizon.stellar.org`; env-configured expected fields.
3. **Agent/operator path:** Wire Stellar rail into execution lifecycle; public proof URL `/proof/stellar-testnet` → `/proof/stellar-mainnet`.
4. **Growth metric:** Count of **verified agent settlements** on Stellar mainnet (attributed wallets documented at award acceptance).

---

## Market / differentiation

| Alternative | Gap | Railguard |
| --- | --- | --- |
| Wallets / signing tools | No policy firewall or settlement evidence envelope | Policy + reconcile + evidence |
| Generic agent frameworks | Chain-agnostic, weak payment safety | Payment-first execution firewall |
| Block explorers | Read-only | Automated verify tied to **intent** and APF failure classes |

---

## Budget & tranches (example — 10% / 20% / 30% / 40%)

| Tranche | % | USD | Deliverables | Verification |
| --- | ---: | ---: | --- | --- |
| #0 | 10% | $7,500 | *(on acceptance)* | Award letter |
| **#1 MVP** | 20% | $15,000 | Mainnet Horizon verify module; CLI/`bun run stellar-mainnet-evidence`; unit tests | Reviewers run script → CONFIRMED on published mainnet tx |
| **#2 Testnet expansion** | 30% | $22,500 | Operator end-to-end Stellar testnet flow; **threat model + monitoring plan** (SCF tranche 2 req); Failure Lab Stellar scenarios | Screen recording + repo paths; monitoring doc in `docs/` |
| **#3 Mainnet launch** | 40% | $30,000 | Public `/proof/stellar-mainnet`; developer doc “Agent payouts on Stellar”; **≥10 verified mainnet settlements** attributed to Railguard demo accounts | Horizon links on proof page; counter on site |

Timeline: **≤6 months** from award. Solo founder; no marketing line items.

---

## Open source

Application code and Stellar rail: **open source** (MIT/repo license). Any future Soroban contracts (if added in scope): open-source plan disclosed in full application.

---

## Links (same as interest form)

- Site: https://railguard-site.vercel.app/
- Stellar ecosystem: https://railguard-site.vercel.app/ecosystems/stellar
- GitHub: https://github.com/prasanthkuna/railguard-gateway
- Testnet tx: https://horizon-testnet.stellar.org/transactions/3dc3225844f711f9f96ead65690d224b7ccfd616d1da5387df6bfc63bfb8e437
- Demo video: https://youtu.be/L-Gss08bzR0
