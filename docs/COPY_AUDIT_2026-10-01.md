# Railguard marketing, Prebroadcast, and Arbitrum copy audit

**Date:** 2026-10-01  
**Reviewed revision:** `3ad582c`  
**Scope:** public marketing site (`apps/site`), Railguard Operator / `prebroadcast.vercel.app` (`apps/operator`), public reviewer pack, ecosystem copy, Arbitrum submission documents, and the 90-second Arbitrum video script.

## Executive verdict

Railguard has a differentiated category and a credible technical story. The strongest language is:

- **Category:** “financial execution firewall”
- **Tagline:** “Agent money. Guarded.”
- **Core model:** policy before broadcast; observe and reconcile after broadcast; leave evidence
- **Proof mechanic:** six concrete payment-failure classes

The current copy is not yet submission-safe because the product occasionally presents simulations, structural hashes, planned integrations, and authenticated pages as stronger proof than they are. This is a credibility problem, not primarily a style problem.

The public story should be reduced to one defensible promise:

> Railguard applies policy before an agent signs, tracks what happens after broadcast, and produces tamper-evident execution records—without taking custody.

Use **Railguard Operator** as the product name. Treat **Prebroadcast** only as the legacy deployment hostname, not as a second brand.

## Recommended message architecture

### Audience

Primary: developers and technical operators building agents that can initiate payments.  
Secondary: treasury/security teams evaluating those systems.  
Submission audience: technically literate judges who need a fast path from claim to reproducible proof.

### Message order

1. **Risk:** agents can initiate irreversible financial actions faster than humans can review them.
2. **Control:** Railguard checks policy and authority before signing or broadcast.
3. **Recovery:** it distinguishes rejected, submitted, unknown, reverted, and settled execution states.
4. **Proof:** it records intent, decision, execution, settlement, and evidence hashes.
5. **Boundary:** v0.1 alpha and testnet reference implementation; not production-ready for mainnet funds.

### Canonical vocabulary

| Use | Avoid | Reason |
| --- | --- | --- |
| Railguard Operator | PreBroadcast / Prebroadcast as a product | One brand; hostname is implementation detail |
| testnet console | operator console, when linked from public marketing | Sets the correct expectation before sign-in |
| verify transaction | observe & settle | The button verifies; it does not settle the chain transaction |
| tamper-evident event history | immutable ledger | Hash chaining detects tampering; it does not make the database immutable |
| evidence envelope complete | evidence valid | Current validity flag checks required hashes, not an external signature or full chain proof |
| interactive failure simulation | live execution telemetry | Failure Lab is client-side animation, not live payment execution |
| external-wallet verification | Tier B | “Tier B” is internal vocabulary and needs translation |
| 0.01 USDC (10,000 base units) | 10,000 base units | Lead with the human-readable amount |

## Public marketing audit

### P0 — proof and trust

1. **The public sample receipt is labeled “EVIDENCE VALID” without a visible sample disclosure.** `/r/demo` renders `ReceiptTimeline`, not the `ReceiptCard` that contains the sample note. `receiptFromId` also turns any arbitrary ID into the same apparently valid receipt. Locations: `apps/site/app/r/[id]/page.tsx:10-14`, `apps/site/components/ReceiptTimeline.tsx:41-46`, `apps/site/lib/demo-receipt.ts:45-52`.  
   **Fix:** pass an explicit `demo` flag into `ReceiptTimeline`; render “SAMPLE DATA · NOT AN ON-CHAIN PROOF”; disable “Copy proof” or label it “Copy sample”; return not-found for unknown IDs.

2. **Failure Lab calls a browser animation “LIVE EXECUTION TELEMETRY.”** “Run 6 attacks,” “stream telemetry,” and “same semantics we enforce in production” imply a live backend or real payment path. The component uses local timers/state. Locations: `apps/site/components/AttackDemo.tsx:184-216`, `apps/site/components/ExecutionTelemetry.tsx:17`, `apps/hyperframes/SCRIPT.md:18`.  
   **Fix:** call it an “Interactive failure simulation.” Use “Simulate six failures” and “Simulation trace.” Never say “production”; the repository correctly declares a testnet alpha.

3. **Planned ecosystems look verified.** Every ecosystem card uses a green status pill and green checks, including `grant-phase` entries. The homepage headline says “Works across financial rails,” although Celo and Airwallex are described as grant-phase/future work. Locations: `apps/site/components/EcosystemVerifyCard.tsx:14-20`, `apps/site/lib/ecosystems.manifest.ts:188-219`, `apps/site/app/page.tsx:44-52`.  
   **Fix:** separate **Verified**, **Adapter available**, and **Planned**. Use neutral styling for planned entries, no checkmarks, and a homepage heading such as “One control model across supported and planned rails.” Prefer showing verified rails first and moving planned work to a roadmap.

4. **System status is static marketing copy.** “Gateway healthy” and three “verified” lines are hard-coded, with no health request, proof timestamp, or evidence link. Location: `apps/site/components/SystemStatus.tsx:1-18`.  
   **Fix:** either wire it to real health/proof data or rename it “Latest repository proofs,” show dates, and link each item.

### P1 — positioning and claims

5. **Absolute claims exceed the demonstrated scope.** Examples include “Every execution produces,” “evidence for every payment,” “At-most-once execute,” and “Replay block.” Locations: `apps/site/app/page.tsx:30-34`, `apps/operator/app/login/LoginPageContent.tsx:108-110`, `apps/site/lib/recipes.ts:20-25,57-61`.  
   **Fix:** scope claims to “supported execution rails” and “stored Railguard executions.” Keep security properties next to a link to tests or evidence.

6. **Custody wording is too broad.** “Your keys stay with your infrastructure” is awkward for managed-wallet/CDP paths. Location: `apps/site/components/FossSection.tsx:20-31`.  
   **Fix:** “Railguard does not custody your funds or private keys. It sits between agent intent and your signer or wallet provider.”

7. **Internal strategy language leaked into customer copy.** “Developer, agent, and treasury teams are the wedge; everyone else inherits…” is investor/product-planning language. Location: `apps/site/components/RecipesSection.tsx:10-15`.  
   **Fix:** “Built first for agent developers and treasury operators; the same controls extend to payouts, trading bots, DAOs, and shared wallets.”

8. **The site has no conversion path for a serious evaluator.** Primary CTAs lead to a simulation, GitHub, a sample receipt, or an auth-gated console. There is no “Run locally,” “Read the architecture,” or “Request a pilot.”  
   **Fix:** use a three-step CTA ladder: **Simulate a failure** → **Inspect verified testnet proof** → **Run Railguard locally**. Label the operator CTA **Open testnet console**.

9. **Category language fragments across surfaces.** The main site says “financial execution firewall”; the ZebPay pack says “Financial Execution Assurance”; the sidebar says “Execution control room.”  
   **Fix:** keep “financial execution firewall” as the category. Use “operator console” as the surface and “execution assurance” only as a benefit.

10. **The ecosystem source of truth has drifted.** `docs/ecosystems.yaml:39-48` says Arbitrum One mainnet/integrated, while the rendered TypeScript manifest says Arbitrum Sepolia/testnet. The YAML claims it generates site pages, but it does not.  
    **Fix:** choose one manifest, generate the other representation, and fail CI on drift.

### Suggested homepage hero

**Eyebrow:** `v0.1.0-alpha · open source · testnet`  
**Headline:** `Stop agent payment mistakes before they become losses.`  
**Lead:** `Railguard applies policy before a wallet signs, tracks uncertain broadcasts, and produces tamper-evident execution records—without taking custody.`  
**Primary CTA:** `Simulate six failures`  
**Secondary CTA:** `View verified testnet proof`  
**Tertiary CTA:** `Run locally on GitHub`

The current headline—“Can your AI agent spend money safely?”—is also usable, but the lead should immediately explain the mechanism and maturity boundary.

## Railguard Operator / Prebroadcast audit

### P0 — expectation and action accuracy

1. **There is no persistent alpha/testnet boundary in the signed-in product.** The login and dashboard look production-capable, while the README says this is a reference UI and the repository says it is not production-ready. Locations: `apps/operator/app/login/LoginPageContent.tsx:108-110`, `apps/operator/app/page.tsx:49-54`, `README.md:18`.  
   **Fix:** add a persistent `TESTNET · v0.1 ALPHA` banner and show the active chain beside every executable action.

2. **The Arbitrum action language overstates what the UI does.** “Start Tier B flow” creates server-side records; it does not open MetaMask. “External broadcast (MetaMask)” only presents values to copy. “Observe & settle” verifies an already-settled transaction. Locations: `apps/operator/components/executions/ArbitrumTierBDemo.tsx:55-63`, `apps/operator/components/executions/ExternalBroadcastPanel.tsx:75-114`.  
   **Fix:** use **Create Arbitrum test intent**, **Send with your wallet**, and **Verify transaction**. Say explicitly: “Railguard will not initiate or sign this transfer.”

3. **“Grant wallet” is internal and ambiguous.** It can mean authorization grant, grant-program wallet, or recipient. Location: `apps/operator/components/executions/ArbitrumTierBDemo.tsx:57`.  
   **Fix:** “demo recipient wallet.” Display the full checksummed address with copy control, not only the first six characters.

4. **Evidence copy overstates validation.** `evidenceValid` is true when two hash fields exist; the UI renders “SEALED · VALID” and “VALID.” Locations: `packages/kernel/src/evidence.ts:84-95`, `apps/operator/components/executions/ExecutionLifecycle.tsx:18-20`, `apps/operator/components/ui/EvidencePanel.tsx:69-72`.  
   **Fix:** use “Envelope complete” for structural checks. Reserve “Verified” for recomputed hashes/signatures plus settlement-fact verification.

5. **“Why was this payment allowed?” is wrong for denied, pending, failed, or disputed states.** Location: `apps/operator/components/ui/EvidencePanel.tsx:39-58`.  
   **Fix:** “Why did Railguard make this decision?”

### P1 — comprehension and consistency

6. **Prebroadcast has no intentional brand role.** The hostname and WorkOS organization say PreBroadcast, while every visible surface says Railguard Operator.  
   **Decision:** keep the visible product as **Railguard Operator** and describe `prebroadcast.vercel.app` as a legacy/testnet hostname. Do not capitalize PreBroadcast as a product unless it becomes a named sub-product.

7. **Operational jargon is shown before plain meaning.** “Tier B,” “observe,” “rail,” “base units,” “APF,” and raw status enums are prominent.  
   **Fix:** pair each with plain language: `AWAITING_BROADCAST — waiting for wallet transaction`; `SETTLED — matching transfer verified`; `10,000 base units — 0.01 USDC`.

8. **Dashboard metric wording is incomplete.** “Total Protected Volume” has no date range and “protected” is stronger than “screened.” Location: `apps/operator/app/page.tsx:105-110`.  
   **Fix:** “Screened volume · all time” or add a selectable period.

9. **Audit copy says “Immutable ledger.”** The implementation is application-append-only and hash-linked, not immutable storage. Location: `apps/operator/app/audit/page.tsx:77-85`.  
   **Fix:** “Tamper-evident history of policy decisions, approvals, and payment actions.”

10. **Empty-state guidance uses two overlapping intent nouns.** “Authorize a financial intent and execute a payment intent…” is accurate internally but difficult for a new operator. Location: `apps/operator/app/executions/page.tsx:59-62`.  
    **Fix:** “Create and authorize an intent, then start an execution to see it here.”

11. **The operator README is stale.** It says `apps/site` is planned even though it exists. Location: `apps/operator/README.md:7`.  
    **Fix:** describe the current separation between marketing and operator surfaces.

### Recommended Arbitrum operator copy

| Current | Replace with |
| --- | --- |
| Arbitrum Tier B demo | Arbitrum Sepolia wallet verification |
| Creates intent → authorize → awaiting MetaMask broadcast | Create and authorize a 0.01 USDC test intent. You will send the transfer separately from your wallet. |
| Start Tier B flow | Create test intent |
| External broadcast (MetaMask) | Send with your wallet |
| Send exactly this ERC-20 transfer on chain 421614 | On Arbitrum Sepolia, send **0.01 USDC** to the recipient below. Railguard does not initiate or sign the transfer. |
| Amount (base units) | Amount: **0.01 USDC** · 10,000 base units |
| Observe & settle | Verify transaction |
| On-chain settlement | Verified Arbitrum Sepolia transfer |

## Arbitrum submission audit

### Readiness verdict

**Conditional no-go.** The hardened settlement/evidence implementation and concrete Sepolia transaction are strong. `bun run verify-hackquest-pack` currently passes 6/6, but that checker only performs file assertions and HTTP `HEAD` requests. It does not prove that a signed-out judge can see the `SETTLED` execution or that the visible page contains the claimed evidence.

### Submission blockers

1. **The “Demo” link is auth-gated.** `/executions/:id` is not a public route in `AppShell`; a signed-out judge is redirected to login. Yet the submit pack treats a `200` response as “execution detail URL live.” Locations: `apps/operator/components/layout/AppShell.tsx:16-20,35-46`, `scripts/verify-hackquest-pack.ts:48-57`, `docs/grants/ARBITRUM_TESTNET_SUBMIT.md:18,40`.  
   **Fix:** publish a read-only proof page with no authentication. It should show the real execution ID, intent facts, `SETTLED`, tx hash, explorer link, evidence hash, timestamp, and testnet label. Do not substitute `/r/demo`; that page is sample data.

2. **The video URL is still a placeholder.** Locations: `docs/grants/HACKQUEST_ARBITRUM_COPY.md:25`, `docs/grants/ARBITRUM_TESTNET_SUBMIT.md:29,43`.  
   **Fix:** render, upload unlisted, verify captions/links, then replace both placeholders before form submission.

3. **Arbitrum strategy documents contradict one another.** The master pack says testnet-only/no mainnet; `SUBMISSION_MATRIX.md` says Arbitrum One mainnet and “MAINNET VERIFIED”; `ARBITRUM_FIRST_PLACE_PLAN.md` calls mainnet proof a requirement/blocker; `docs/ecosystems.yaml` also claims mainnet integration. Locations: `docs/grants/ARBITRUM_TESTNET_SUBMIT.md:1-3`, `docs/grants/SUBMISSION_MATRIX.md:35-37`, `docs/grants/ARBITRUM_FIRST_PLACE_PLAN.md:4,22,231`, `docs/ecosystems.yaml:39-48`.  
   **Fix:** declare `ARBITRUM_TESTNET_SUBMIT.md` canonical and mark the older plan/matrix sections **SUPERSEDED** or update them.

4. **The two checklists disagree.** The master pack marks the deployment, evidence, site, and operator complete; `ARBITRUM_SUBMIT_GATE.md` leaves all of them unchecked.  
   **Fix:** delete the duplicate gate or generate it from the master checklist.

5. **The runbook describes a removed network selector and an incorrect deny flow.** The UI is Sepolia-only, but the runbook says choose Sepolia or Arbitrum One. It also says a wrong recipient is denied at authorization; the actual mismatch is detected during transaction verification unless policy explicitly denies it. Location: `docs/runbooks/arbitrum-tier-b-demo.md:5-18`.  
   **Fix:** rewrite the runbook against the current Sepolia-only UI and distinguish policy denial from settlement mismatch.

6. **The public Arbitrum page conflates two separate proofs.** A hook deployment and an external-wallet settlement are both real, but the Tier B transfer is not shown as passing through the deployed hook. “ENFORCE” and “same ENFORCE semantics as the operator path” imply a linkage not demonstrated by the evidence. Locations: `apps/site/lib/ecosystems.manifest.ts:118-131`, `apps/hyperframes/SCRIPT.md:34`.  
   **Fix:** say: “Track A: hook contracts deployed. Track B: external-wallet USDC settlement verified by the operator lifecycle.” Do not imply the shown USDC tx traversed the hook unless it did.

7. **The video script contains inaccurate or risky phrases.** “Same semantics we enforce in production” conflicts with alpha/testnet maturity. “Manifest verified on chain” reverses the relationship: the app verifies chain data and writes an off-chain manifest. “We block, reconcile” merges pre-broadcast policy with post-broadcast recovery. Locations: `apps/hyperframes/SCRIPT.md:18-34`.  
   **Fix:** use the revised script below.

8. **Submission paste targets are not fully paste-ready.** “your MetaMask `0x9a3f…`” is an author note, the on-chain proof row contains repository-relative paths instead of direct URLs, and the GitHub link does not directly surface the contract source repository. Locations: `docs/grants/HACKQUEST_ARBITRUM_COPY.md:17-25,35-41`.  
   **Fix:** replace notes with concrete checksum addresses and direct URLs; add a direct contract-source link.

9. **Contract verification status is unclear.** The evidence README links deployed addresses but says verification “may require” Etherscan V2. It does not state whether source code is verified. Location: `evidence/arbitrum-sepolia-hook/README.md:3-16`.  
   **Fix:** explicitly mark each contract `Source verified: yes/no`; complete verification before submission if possible.

10. **Local reproducibility helpers are not public yet.** In the sibling `railguard-protocol` worktree, the Arbitrum deploy guide and MetaMask helpers are untracked, and `foundry.toml` has an uncommitted Arbitrum endpoint change. The gateway evidence links those local paths.  
    **Fix:** commit the reproducibility files to the public contract repository and link to exact GitHub paths/commit SHA.

### Recommended HackQuest copy

**One-liner**

> Open-source financial execution firewall for AI agents.

**Short description**

> Railguard adds a financial-control boundary between AI agents and wallets. It applies policy before signing, binds authorization to recipient, asset, amount, and network, tracks uncertain broadcasts, verifies settlement, and emits a tamper-evident evidence envelope. On Arbitrum Sepolia, we deployed the Railguard execution-hook contracts and completed a separate 0.01 USDC external-wallet flow from intent and authorization through on-chain verification and `SETTLED` evidence. The public Failure Lab demonstrates six payment-failure classes, while the repository provides tests, contract addresses, transaction proof, and reproduction commands. Railguard is currently a v0.1 alpha/testnet reference implementation.

**Proof caption**

> Arbitrum Sepolia · 0.01 USDC · matching token, recipient, amount, and chain verified · execution `SETTLED` · explorer and evidence links below.

**CTA order**

1. Watch 90-second demo
2. Open public Arbitrum proof
3. Inspect Sepolia transaction
4. Inspect hook contracts and source
5. Run the Failure Lab
6. Clone the repository

### Revised 90-second voiceover

> AI agents can initiate payments in seconds. A wrong recipient, replay, or ambiguous broadcast can turn that speed into loss. Railguard adds a financial execution firewall between agent intent and the wallet. It checks policy before signing, binds authorization to the exact payment, and records what happens after broadcast. The Failure Lab simulates six payment-failure classes, including replay, budget races, stale authorization, and settlement mismatch. Unsafe requests are blocked before broadcast; submitted transactions are observed and reconciled instead of being guessed successful or failed. On Arbitrum Sepolia, we deployed the Railguard hook contracts and completed a separate external-wallet test: 0.01 USDC sent with MetaMask, verified against the authorized token, recipient, amount, and network, then recorded as `SETTLED`. The transaction, contract addresses, tests, and evidence manifest are public. Railguard is open source, testnet-first, and built for agents that move money.

### Final go/no-go checklist

Do not submit until all P0 items are complete:

- [ ] Public, signed-out Arbitrum execution proof page shows real data—not `/r/demo`
- [ ] Video uploaded and direct URL pasted into every submission source
- [ ] Sample/simulation labels added to Failure Lab and sample receipt
- [ ] Testnet/alpha boundary visible in Railguard Operator
- [ ] Mainnet/testnet contradictions removed or marked superseded
- [ ] Duplicate Arbitrum checklists reconciled
- [ ] Current runbook matches the Sepolia-only UI
- [ ] Hook deployment and Tier B settlement described as separate proofs
- [ ] Contract source-verification status explicit
- [ ] Deploy and wallet-helper files committed publicly
- [ ] All form fields contain direct URLs and concrete addresses—no author notes or placeholders

## Priority order

### Before Arbitrum submission

1. Build the public real-execution proof page.
2. Correct simulation/sample/validity labels.
3. Add the Operator testnet banner and rewrite the Arbitrum wallet flow.
4. Reconcile Arbitrum documents and publish the missing reproducibility files.
5. Correct and render the video; insert the final URL.

### Immediately after submission

1. Split verified/adapted/planned ecosystem states.
2. Replace static system status with linked, dated proof.
3. Consolidate manifest sources and add drift checks.
4. Add a developer conversion path: architecture, quick start, pilot/contact.

## Implementation status (2026-10-01 follow-up)

**Done in repo:** marketing P0/P1 (sample receipt, Failure Lab simulation labels, ecosystem planned styling, proof links, hero/CTAs, recipes scope, evaluator section, custody copy, category alignment on site/operator/zebpay), operator P0/P1 (testnet banner, Arbitrum wallet copy, evidence envelope wording, status plain-language, audit trail copy, README), public `/proof/arbitrum-sepolia`, `verify-hackquest-pack` body checks, `docs/ecosystems.yaml` + `check:ecosystems-drift`, grant doc supersede + gate mirror, runbook, hook source-verified table, revised `SCRIPT.md` / HackQuest paste targets.

**Still human / deploy / external:** upload 90s video URL everywhere; `git push origin main` for Vercel; optional Etherscan source verify; commit reproducibility helpers in `railguard-protocol`; HyperFrames full UI capture composition + render.

## What should remain unchanged

- “Financial execution firewall”
- “Agent money. Guarded.”
- “Give agents authority. Not unlimited money.”
- The intent → authorization → execution → observation → reconciliation → evidence model
- The six named failure classes, when clearly labeled as a simulation or linked to executable tests
- Honest alpha/testnet maturity language already present in the repository README and ZebPay status card
