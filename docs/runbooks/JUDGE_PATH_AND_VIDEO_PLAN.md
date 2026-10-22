# Judge path, WorkOS login, and video — unified plan

**Problem:** Judges and viewers hit **WorkOS sign-in** on `prebroadcast.vercel.app`, then land in the operator shell with **no numbered “what to do next.”** The grant pack and video still **imply** the testnet console is the main proof surface, while **`/executions/:id` is auth-gated** (`AppShell`). That feels like a broken or CDP-heavy flow even when the real proof is **public**.

**This is not Coinbase CDP.** Arbitrum HackQuest proof is **external-wallet USDC + evidence manifest**. Coinbase CDP is a **separate** Base/reference path on `/ecosystems` — do not send judges there for Arbitrum scoring.

---

## Three surfaces (never mix in one CTA block)

| Surface | Auth | Audience | Proof type |
| --- | --- | --- | --- |
| **Marketing site** | None | Judges, X, video | Failure Lab simulation, `/proof/arbitrum-sepolia`, Arbiscan links |
| **Railguard Operator** (`prebroadcast…`) | **WorkOS** (email/Google + org) | Builders replaying wallet demo | Live executions, broadcast sheet, observe/settle |
| **Repo + CLI** | None (local) | Technical judges | `bun run arbitrum-sepolia-evidence`, hook README |

**Rule:** Default judge story = **site + chain + repo**. Operator = **optional depth**, labeled “create account to replay lifecycle.”

---

## Judge journey (recommended — no login)

Target **under 3 minutes**, zero wallet, zero WorkOS.

1. **Public proof** — https://railguard-site.vercel.app/proof/arbitrum-sepolia  
   Confirm: `SETTLED`, execution id `exec_b73824e9-726f-4d59-af49-ac5cd1e1c9aa`, tx prefix `0x243ec1e8…`.
2. **Sepolia transaction** — link from proof page → token transfer, amount, recipient.
3. **Hook deployment** — separate section on same page → contract `0x756829…965E` (settlement tx did not traverse hook; say that once).
4. **Failure Lab** — https://railguard-site.vercel.app/attack → **Simulate attack** (client-side; not on-chain).
5. **Repo evidence** — `evidence/arbitrum-sepolia/manifest.json` + `evidence/arbitrum-sepolia-hook/README.md`.

**Verify locally:** `bun run verify-hackquest-pack` (public URLs + manifest; does **not** validate operator login UX).

---

## Optional builder journey (WorkOS — only if they want to replay)

Use when a judge explicitly wants to **drive** the operator UI (not required for scoring).

| Step | Action | Success signal |
| ---: | --- | --- |
| 1 | Open https://prebroadcast.vercel.app/login | See “Railguard Operator · testnet console” |
| 2 | Sign in (WorkOS org configured for demo) | Land on dashboard / executions |
| 3 | Go to **Executions** → scroll **Arbitrum wallet test** | Wallet verification block visible (requires **current deploy**) |
| 4 | **Create test intent** *or* open deep link below | Execution detail loads |
| 5 | Read **Send with your wallet** panel | Copy recipient / amount; **no Railguard signing** |
| 6 | *(Optional)* Send 0.01 USDC from own wallet + **Verify transaction** | Status **SETTLED** |

**Stable read-only deep link (after login):**  
`/executions/exec_b73824e9-726f-4d59-af49-ac5cd1e1c9aa`

**Do not ask judges to:** run MetaMask in automation, fund CDP, or complete a **new** settlement unless they opt in as builders.

Runbook detail: `docs/runbooks/arbitrum-tier-b-demo.md`.

---

## Video plan (aligned with judges)

### Submission video (HackQuest) — **hide sign-in**

**Default rule:** the uploaded **90s hero must not contain PreBroadcast / WorkOS sign-in** or blank operator shells. Judges should see the same surfaces as the public proof links.

| Segment | In upload? |
| --- | ---: |
| Site Failure Lab + public proof + Arbiscan | **Yes** |
| PreBroadcast / operator | **No** (link in description only) |

**Pipeline:** `docs/media/HACKQUEST_VIDEO_SUBMIT.md` — `record:product:submission` → `video:submission-clips` → `render:hero:submission`.

Remotion mode **`RAILGUARD_VIDEO_MODE=submission`** (default) uses only `SUBMISSION_HERO_CLIP_IDS`. Builder cut: `RAILGUARD_VIDEO_MODE=full` + token-injected `op-*` recordings (not for judges).

### Quality gates

- `bun run video:submission-quality` — site clips required, no operator requirement  
- `bun run video:submission-clips` — rejects tiny MP4s (login/blank detection heuristic)

---

## Product / UX fixes (phased)

### P0 — Copy and grant pack (no code)

- [x] Plan doc (this file)
- [x] HackQuest paste: **lead with public proof**; move testnet console to “Optional — builders”
- [x] Video description: same order as `HACKQUEST_ARBITRUM_COPY.md` CTA list
- [x] Site CTAs: public proof primary; console → `/login?intent=judge`

### P1 — Operator first-run clarity (small UI)

- [x] **`/login?intent=judge`** → after auth, SETTLED deep link + `?guide=judge` banner
- [x] **`/welcome`** + executions **Start here** cards (SETTLED · Failure Lab · create intent)
- [x] Login: judges pointed to public proof without signing in

### P2 — Video / capture

- [x] `demo-flows.json`: no `/login` chapters; **`site-judge-path`** added
- [x] Hero clip order: site proof before operator; operator lower-thirds note sign-in
- [ ] Deploy operator with wallet demo so `op-*` clips show rich UI on production

### P3 — Optional auth for recording only

- [x] Recorder: `RAILGUARD_RECORD_ACCESS_TOKEN` / `RAILGUARD_RECORD_DEV_AUTH` inject — not for judges
- [x] Judge runbook does not require `TIER_B_ACCESS_TOKEN`

---

## Terminology cheat sheet (internal)

| Term | Meaning here |
| --- | --- |
| **WorkOS** | Operator login (PreBroadcast host) |
| **Coinbase CDP** | Custodial execution reference on Base — **not** Arbitrum judge path |
| **CDP (capture scripts)** | Chrome DevTools Protocol for screenshots — unrelated to login |
| **Tier B / external wallet** | MetaMask sends USDC; operator verifies — **builder** path |

---

## Success criteria

- A judge following **only** grant links never hits WorkOS unless they choose operator.
- Hero video shows **clickable public proof** and **SETTLED** readable without pause.
- Anyone who does sign in sees **numbered next step** within one screen.
- `verify-hackquest-pack` and video pipeline docs both point to this runbook.

**Owners:** grant paste (`HACKQUEST_ARBITRUM_COPY.md`), site proof CTAs, operator welcome, `PRODUCT_CAPTURE_PLAN.md`, Remotion VO.
