# Product launch video — live UI capture plan

**Goal:** Replace Ken Burns **static PNGs** with **screen recordings** that show real clicks, scrolls, and state changes on:

1. **Marketing site** — `https://railguard-site.vercel.app`
2. **Railguard Operator (PreBroadcast host)** — `https://prebroadcast.vercel.app`

Motion graphics (cold open, attack typography, thesis, pipeline, lockup) stay in **Remotion**. The middle of the film becomes **~80% product**, Linear/Cursor-style.

**Canonical creative:** `web3/arb-video.md` · **Beats:** `SHOTLIST.json`

---

## Gap (current vs target)

| Today | Problem | Target |
| --- | --- | --- |
| `capture-product-screens.ts` → PNG | No motion, no clicks, feels like a slide deck | **WebM/MP4 clips** per chapter |
| `ProductDemoScene` / `TechnicalProductScene` use `KenBurnsImage` | Launch videos don’t Ken Burns screenshots | `<Video>` inside **browser chrome** + optional Remotion zoom |
| Old `video:capture` / `video:seed` | Targets **invoice AP demo** + removed `capcut-pipeline` | New manifest for **site + executions** |
| Operator flow | Not in hero cut at all | **PreBroadcast**: wallet demo → execution detail → broadcast sheet / SETTLED |

---

## Architecture

```text
director/DEMO-FLOWS.yaml     ← versioned click paths (source of truth)
        ↓
record-product-demo.ts       ← Playwright/puppeteer: recordVideo + synthetic cursor
        ↓
public/clips/*.webm          ← normalized 1920×1080 @ 30fps
        ↓
Remotion compositions        ← motion bookends + Video clips + VO + captions
        ↓
out/arbitrum-hero.mp4
```

**Split:**

- **Remotion** — typography, attacks, pipeline, lockup, transitions, audio mix.
- **Recorder** — everything that must be **truthful UI** (site + operator).

Do **not** fake clicks in Remotion DOM; record them once, replay as video.

---

## Clip matrix (hero ~42s / technical ~2:15)

### A — Marketing site (no login)

| Clip ID | Duration target | URL / actions | Proof on screen |
| --- | ---: | --- | --- |
| `site-hook` | 4–5s | `/` — scroll hero, hover mint CTA | Brand + “testnet alpha” |
| `site-failure-lab` | 6–8s | `/attack` — click **Run attacks** (or step through), wait for telemetry lines | “Simulation” visible |
| `site-proof` | 5–6s | `/proof/arbitrum-sepolia` — slow scroll | SETTLED, exec id, tx prefix |
| `site-ecosystems` | 4–5s | `/ecosystems/arbitrum` — scroll hook + wallet verification | Two proofs wording |

### B — Operator / PreBroadcast

| Clip ID | Duration target | URL / actions | Notes |
| --- | ---: | --- | --- |
| `op-executions` | 4s | `/executions` — scroll to wallet demo | “Railguard Operator” / testnet banner |
| `op-create-intent` | 6–8s | Click **Create test intent** → wait for navigation | Live API; may create new exec |
| `op-broadcast-sheet` | 8–10s | Execution detail — external broadcast panel, **copy** recipient, highlight fields | **No MetaMask** in automation — honest copy sheet |
| `op-settled-proof` | 6–8s | Deep link **known SETTLED** execution (see below) | Stable, no API side effects |

**Stable SETTLED deep link (preferred for judge-safe replay):**

`https://prebroadcast.vercel.app/executions/exec_b73824e9-726f-4d59-af49-ac5cd1e1c9aa`

If auth blocks anonymous access, **do not** show login in judge-facing masters: record **public proof** + site clips; use operator only with staging auth injection (`scripts/capture-via-cdp.ts`) or skip operator. Judge vs builder paths: `docs/runbooks/JUDGE_PATH_AND_VIDEO_PLAN.md`. **Submission master:** never include login frames — `docs/media/HACKQUEST_VIDEO_SUBMIT.md`; Remotion default `RAILGUARD_VIDEO_MODE=submission`.

### C — Chain (optional insert)

| Clip ID | Duration | Action |
| --- | ---: | --- |
| `arbiscan-tx` | 4–5s | Scroll Sepolia tx page to token transfer | Real tx hash |

---

## Recorder tool choice

| Option | Verdict |
| --- | --- |
| **Playwright `recordVideo`** | **Primary** — already in monorepo; one `.webm` per flow; deterministic from YAML |
| **Puppeteer + screencast** | Fallback on Windows if Playwright launch hangs (same as old hyperframes capture) |
| **demo-machine** (YAML + quality.json) | **Phase 2** — adopt if we want CI-verified demos and chapter HTML |
| **NarrateAI DemoMaker** | Paid cloud narration; skip unless you want auto-VO |
| **OpenScreen / manual** | **Fallback** for MetaMask segment (10s B-roll) spliced in |

**Launch polish (Screen Studio class):**

1. **Synthetic cursor** — move to element center before click; ease-in-out (demo-machine pattern).
2. **Click ripple** — 200ms CSS circle injected before click (optional post or in-page).
3. **Smart zoom** — ffmpeg crop-to-focus **or** Remotion `scale` on `<Video>` during clip (cheaper than re-recording).
4. **Idle trim** — drop waits > 400ms between actions in post.

---

## Auth & environment

| Surface | Auth |
| --- | --- |
| Site | None |
| Operator create-intent | Calls **production Encore API** with demo principal — needs API up; handle failure with retry or skip clip |
| Operator SETTLED view | Prefer **public proof** if login required; else inject `railguard_identity` for staging org |

**Pre-flight (every record session):**

```powershell
bun run verify-hackquest-pack
# deploy site/operator if copy changed
```

Env vars for recorder:

```text
RAILGUARD_SITE_URL=https://railguard-site.vercel.app
RAILGUARD_OPERATOR_URL=https://prebroadcast.vercel.app
RAILGUARD_SETTLED_EXEC=exec_b73824e9-726f-4d59-af49-ac5cd1e1c9aa
```

---

## Remotion integration (after clips exist)

1. Add `src/railguard/components/BrowserFrame.tsx` — macOS-style chrome, 1920×1080 content area.
2. Add `src/railguard/components/ProductClip.tsx` — wraps `<Video src={staticFile('clips/site-proof.webm')} />`.
3. Replace `ProductDemoScene` sequences:

   ```text
   site-failure-lab → op-create-intent → op-settled-proof → site-proof
   ```

   (Order matches VO: problem on site → operator control → proof.)

4. **Technical cut** — longer operator + full site tour; reuse same clips with extended takes.
5. Keep **attack montage + pipeline** as pure Remotion (no fake UI).

**Audio:** Extend `vo-hero.txt` to mention clicks (“watch the operator create an intent…”) or re-record after picture lock.

---

## `DEMO-FLOWS.yaml` (to implement)

Single file, chapters as list:

```yaml
defaults:
  viewport: { width: 1920, height: 1080 }
  fps: 30
  site: ${RAILGUARD_SITE_URL}
  operator: ${RAILGUARD_OPERATOR_URL}

chapters:
  - id: site-failure-lab
    base: site
    steps:
      - goto: /attack
      - waitForText: Failure Lab
      - click: button:has-text("Run")
      - wait: 2500
  - id: op-create-intent
    base: operator
    steps:
      - goto: /executions#wallet-verification-demo
      - click: button:has-text("Create test intent")
      - waitForNavigation: true
      - wait: 2000
  # ...
```

Script: `apps/video/scripts/record-product-demo.ts`  
CLI: `bun run record:product` (add to root `package.json`).

Post-step: `ffmpeg -i clip.webm -r 30 -vf scale=1920:1080 clips/site-failure-lab.mp4`

---

## Operator UX tweaks (small, high ROI)

Add **`data-testid`** on video-critical controls (no product behavior change):

| Element | testid |
| --- | --- |
| Create test intent | `wallet-demo-create-intent` |
| Copy recipient | `external-copy-recipient` |
| Observe & settle | `external-observe` |

Enables stable Playwright selectors across deploys.

---

## Production phases

| Phase | Work | Outcome |
| --- | --- | --- |
| **P0** | Write `DEMO-FLOWS.yaml` + `record-product-demo.ts` + `record:product` | Clips in `public/clips/` |
| **P1** | `BrowserFrame` + swap hero/technical product scenes to `<Video>` | Launch-style hero |
| **P2** | testids on operator + trim/zoom pass + caption burn-in | Judge-ready |
| **P3** | Optional demo-machine port for CI `quality.json` | Repeatable on every deploy |

**Deprecate for final masters:** `bun run capture:product` (PNG) except as **thumbnail/storyboard** reference.

---

## Risks

| Risk | Mitigation |
| --- | --- |
| Playwright hang on Windows | Puppeteer fallback recorder (same YAML interpreter) |
| Create intent fails (API) | Record SETTLED deep link + site only; show create-intent in Studio mock |
| MetaMask not automatable | Show broadcast **copy sheet** only; label VO “you send from your wallet” |
| Clip length ≠ VO | Remotion `playbackRate` or trim; re-record chapter |
| Operator auth wall | Public proof page for SETTLED; auth inject for executions list |

---

## Success criteria

- [x] Hero product section shows **at least one visible click** and **URL bar** (site or operator).
- [x] SETTLED / tx hash readable without pause frame (site proof clip; operator detail when PreBroadcast is current).
- [x] No PNG Ken Burns in `ProductDemoScene` / `TechnicalProductScene` — `<Video>` via `ProductClip`.
- [x] `record:product` reproducible from `director/demo-flows.json` (+ optional `RECORD_CHAPTER=id1,id2`).

**Ops:** `bun run record:product` → `bun run video:record-quality` → `bun run render:hero` / `render:technical`.

**Note:** If `prebroadcast.vercel.app` lags repo, operator clips may look sparse until redeploy; `op-create-intent` currently records the **broadcast sheet** on the known SETTLED exec (no live “Create test intent” on stale deploy).
