# SCF Build Interest Form — field-by-field (SCF #46)

Portal: **SCF Build Interest Form** on [communityfund.stellar.org](https://communityfund.stellar.org/) (Dashboard after Discord login).

**Status:** Interest Form **submitted 2026-10-04**. Use this file as archive only. Next step: [STELLAR_SCF_46_SUBMIT.md](./STELLAR_SCF_46_SUBMIT.md) → wait for Build invite → [STELLAR_SCF_46_BUILD.md](./STELLAR_SCF_46_BUILD.md) by **2026-11-08**.

---

## Project Information

### Project Title *

```
Railguard
```

### Project Description *

```
Railguard is an open-source financial execution firewall for AI agents. Before any payment executes, we apply policy, bind authorization to recipient, asset, amount, and network, track uncertain broadcasts, verify settlement on-chain, and emit tamper-evident evidence.

Vision: make programmatic money movement as auditable as API calls—starting with agent wallets and treasury automation.

Objectives for Stellar: (1) Horizon-based settlement verification on testnet (done) and mainnet (SCF #46), (2) public proof pages and reproducible verify scripts for judges and integrators, (3) document APF-style failure classes (policy, reservation, reconciliation) for Stellar payouts. We are applying to SCF Build #46 Open Track to ship mainnet observe/reconcile and developer documentation—not to replace wallets or anchors, but to add safety infrastructure for agent-initiated Stellar payments.
```

### Project Category *

**Select:** **Developer Tooling** or **Infrastructure** (whichever closest match in dropdown).

**Do not use:** End-User Application (Railguard is infra for builders/agents, not a consumer app).

### Current Traction *

**Portal limit: 1000 characters** (paste block below only — ~676 chars).

```
v0.1 alpha · testnet-verified OSS.

Stellar: Horizon testnet CONFIRMED. Proof https://railguard-site.vercel.app/proof/stellar-testnet · tx https://horizon-testnet.stellar.org/transactions/3dc3225844f711f9f96ead65690d224b7ccfd616d1da5387df6bfc63bfb8e437 · repro bun run stellar-testnet-evidence

Cross-chain (not Stellar TVL): EVM Sepolia SETTLED reference https://railguard-site.vercel.app/proof/arbitrum-sepolia · Failure Lab https://railguard-site.vercel.app/attack

https://railguard-site.vercel.app/ecosystems/stellar · https://github.com/prasanthkuna/railguard-gateway

Pre-revenue OSS; traction = verifiable testnet evidence + grant submissions, not user/TVL counts yet.
```

### Website *

```
https://railguard-site.vercel.app/
```

### Planned Stellar Integration *

```
Current: Stellar testnet execution rail (packages/integrations/src/rails/stellarRail.ts) uses Horizon to observe payment operations and reconcile against policy-bound intents (destination, amount, memo). Verified via packages/settlement/src/stellar-testnet.ts and bun run stellar-testnet-evidence.

Planned (SCF #46): (1) Mainnet Horizon verify with the same evidence envelope, (2) extend public proof from testnet (/proof/stellar-testnet) to Stellar mainnet, (3) operator/CLI path for end-to-end agent payout demo on Stellar, (4) optional Soroban only if required for a specific policy primitive—primary integration is Horizon + Stellar payments stack, not storage-only use of Stellar.

Tech stack: TypeScript/Bun, Horizon REST, existing Railguard kernel (intent, grant, execution rail). Architecture documented in repo docs/ARCHITECTURE.md; ready to build on award per SCF handbook (planning complete pre-tranche-1).
```

### Build Track *

**Select:** **Open Track**

---

## Team Information

### Submitter type *

**Select:** **Individual** (or **Solo founder** / **Single founder** if that is the label).

### Email *

```
(your best contact email — same as SCF Discord / Outlook you monitor)
```

### Team Description *

```
Team size: 1 (solo founder).

Prashanth Kuna — full-stack engineer (TypeScript, Go, Solidity); building Railguard open-source financial execution firewall for AI agents. Shipped Stellar Horizon testnet CONFIRMED evidence; additional EVM testnet reference (Sepolia SETTLED) using the same verify-and-proof pattern.

LinkedIn: https://www.linkedin.com/in/prasanth-kuna-1463631b3/

Prior experience: enterprise backend / platform engineering (payments-adjacent systems); not a first-time builder for production software. No separate company entity required for this interest form.

AI disclosure: AI tools used for documentation, tests, and grant drafting; architecture and settlement verification code reviewed and maintained by founder.
```

---

## Target Markets & Jurisdictions

### Which countries or regions will your project target or operate in? *

**Select:** **Global / Not region-specific**

(Railguard is developer infrastructure and open-source tooling usable anywhere; no country-specific GTM at launch.)

### Where is your team based? *

**Select:** **India**

### Will your project involve any local currencies, local payment rails, or local financial infrastructure in any of the markets you selected above? *

**Select:** **No**

(Railguard verifies Stellar ledger payments via Horizon; it does not operate fiat on/off-ramps or local mobile-money rails in this scope.)

---

## Referral Information

### Have you been working with someone from the Stellar Development Foundation or the broader Stellar community and ecosystem on your submission? *

**Select:** **No**

(Change only if you have an SDF/community contact or referral code.)

---

## Submit

- Review all fields → **Submit Interest Form**
- After invite: full Build application → [STELLAR_SCF_46_BUILD.md](./STELLAR_SCF_46_BUILD.md) · deadline **2026-11-08**

**Optional (not in paste blocks):** Arbitrum demo video https://youtu.be/L-Gss08bzR0 — use in full Build only if you add Stellar-first proof; skip on Interest Form to keep reviewers on Horizon.
