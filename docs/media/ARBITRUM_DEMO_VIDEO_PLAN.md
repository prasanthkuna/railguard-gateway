# Arbitrum demo video — pro production plan

**Goal:** One **~90s product demo master** (submitted to HackQuest via form + unlisted URL) that shows real proof — using **Claude + Fable + HyperFrames**. **Spoken/on-screen copy = marketing site voice** ([ECOSYSTEM_PUBLIC_COPY.md](../design/ECOSYSTEM_PUBLIC_COPY.md)); grant program names live only in `docs/grants/*`.

**Canonical assets:** `apps/hyperframes/STORYBOARD.md`, `SCRIPT.md`, `GOAL.md`, `CLAIM_MAP.md`.

---

## Can we get “Claude / Fable style” videos?

**Yes — for the motion-graphic + VO + edit lane.** That is exactly what went viral (Nate Herk–style): long-horizon agent drives **script → TTS → HTML/GSAP (HyperFrames) → ffmpeg → word-timed captions → QA loop**.

**No — if you expect a single prompt to output a cinematic AI movie.** Fable does not render pixels; neither does HyperFrames alone. Wan/Veo/Kling clips are optional **B-roll only** (5–8s hook). Your **proof** must stay **real captures** (operator, Arbiscan, manifest).

| Layer | Tool | Railguard use |
| --- | --- | --- |
| Orchestration | Claude Code + Fable-class model (or Sonnet + skills) | `/goal` from `GOAL.md`; iterate scenes |
| Motion + typography | **HyperFrames** (HTML + paused GSAP, `npx hyperframes render`) | Beats 1, 2, 4 overlay, 6 |
| Voice | HyperFrames `tts` or ElevenLabs | `SCRIPT.md` chunks ≤60s |
| Proof inserts | Screen capture (OBS / Win+G) | Beats 3–5 — **non-negotiable** |
| Optional hook | Wan/Veo **one** clip | Agent/wallet metaphor; no fake tx |
| Publish | YouTube unlisted + form URL | Master 16:9; social 9:16 from same timeline |

Install once:

```powershell
cd railguard-gateway\apps\hyperframes
npx skills add heygen-com/hyperframes
npx hyperframes init . --force   # if not already scaffolded; merge with existing scenes/
```

Agent loop (what “pro” teams do): `preview` → small prompt fixes → `lint` → `render` → `transcribe` → retime `data-start` on clips.

---

## What judges and X expect (2026 consensus)

Hackathon guides converge on the same shape for **90s**:

| Time | Job |
| --- | --- |
| 0:00–0:10 | **Outcome hook** — one sentence, user + risk (not “hi I’m…”) |
| 0:10–0:20 | What you built (UI flash) |
| 0:20–0:55 | **One happy path** — input → policy → execution → observe |
| 0:55–0:70 | **Technical proof** — explorer tx, hook address, manifest `ok: true` |
| 0:70–0:85 | Why Arbitrum / rubric fit (hook deployment + wallet settlement proof) |
| 0:85–0:90 | CTA + URLs |

Rules from ElevenLabs / Tensor / Web3 demo guides:

- **~80% product**, not slides or avatar-only talk.
- **Captions** (muted X/Discord viewing).
- **Pre-record** the fragile path (MetaMask, staging API).
- **One path** — no codebase tour.

Your `STORYBOARD.md` already maps to this; tighten beat 2 so Failure Lab is **≤8s** insert, not 25s lecture.

---

## Recommended format for Railguard (pro)

**Primary:** HyperFrames **+ real screen capture** (hybrid). This beats pure avatar Fable demos for **DeFi judges** because tx hash and SETTLED status are visible.

**Secondary (distribution):** 3–5 vertical cuts from the same master:

1. Hook only (0:10)
2. Six failures montage (0:15)
3. Wallet verification SETTLED + Arbiscan (0:20)
4. Hook deployment address (0:15)
5. CTA → `/ecosystems/arbitrum`

Do **not** ship 20 unrelated AI clips; ship **one master + matrix**.

---

## Production phases (order matters)

### Phase 0 — Lock proof (½ day)

- [ ] Re-run or confirm `evidence/arbitrum-sepolia/manifest.json` `ok: true`
- [ ] Bookmark: operator execution, Sepolia tx, hook on Arbiscan
- [ ] Capture **1080p** PNG/video: SETTLED row, tx page, manifest snippet (redact tokens)

### Phase 1 — Captures first (½ day)

Record in one session (dark browser, zoom 110%, notifications off):

1. `railguard-site.vercel.app/attack` — one failure firing
2. Public proof page + optional testnet console execution **SETTLED**
3. Sepolia Arbiscan tx (scroll to token transfer)
4. Optional: 5s terminal `protect` block

Save under `apps/hyperframes/captures/` with names matching storyboard beats.

### Phase 2 — HyperFrames scenes (1 day)

Author `scenes/01-hook.html` … `06-close.html`:

- Import `packages/brand/tokens.css`
- Every timed element: `class="clip"`, `data-start`, `data-duration`, `data-track-index`
- Register GSAP on `window.__timelines` (see HyperFrames `/gsap` skill)
- **No async** in timeline setup

`npx hyperframes preview` until beats 1–2–6 feel alive (≥2 motion patterns per scene).

### Phase 3 — Audio (2–4 hours)

```powershell
npx hyperframes tts --input apps/hyperframes/SCRIPT.md --voice <id>
```

Or ElevenLabs with VO-1 / VO-2 split. Target **~145 wpm**. Run `transcribe` for caption SRT.

### Phase 4 — Assembly (½ day)

- Composition JSON: HF scenes + capture clips on timeline
- Lower-third captions for every `{braced}` line in SCRIPT
- Music: low ambient, **duck under VO** (-18 LUFS bed max)
- Export: `media/grant/arbitrum-open-house-2026-master.mp4`

### Phase 5 — QA gate (required)

| Check | Pass |
| --- | --- |
| First 5s states outcome | “Agents move money / guardrails” |
| CLAIM_MAP row visible | Each timestamp has a frame |
| Tx hash readable | Pause test at 1:15 |
| Length | 85–95s |
| Captions | Burn-in or YouTube auto + review |
| No fake UI | Manual eyeball |

### Phase 6 — Submit + social

- Upload unlisted YouTube → paste in HackQuest form
- Update `HACKQUEST_ARBITRUM_COPY.md` video URL
- Post master + 1 vertical cut with `@Arbitrum` / `#HackQuest` if rules allow

---

## Claude / Fable workflow (how “everyone” runs it)

1. Open **`apps/hyperframes`** in Claude Code (Max or Fable if you want autonomous `/goal`).
2. Paste **`GOAL.md`**; add: “Phase 1 captures are in `captures/` — do not regenerate proof.”
3. Agent loop: author scenes → lint → preview → render → frame QA (subagents on Sonnet for screenshot checks — optional cost save).
4. **You** record captures and drop files; agent must not invent Arbiscan.

**Cost reality:** Full autonomous Fable runs can burn **~30–40% of a Max plan** for one video if verification subagents run wild. Cheaper pro path: **you** capture proof; **Sonnet + HyperFrames skills** polish scenes and timing.

---

## What we are not doing

- Avatar-only video with no on-chain proof
- AI-generated terminal or wallet UI
- 30s pure Wan clip as the whole submission
- Remotion/CapCut as master (legacy — see `VIDEO-PIPELINE.md`)

---

## Next concrete step

Run **Phase 0 + Phase 1** today (captures + proof). Parallel: `npx hyperframes init` in `apps/hyperframes` and scaffold `01-hook.html` from brand tokens. Then one `/goal` session for scenes 02–06 + mux.

**Owner checklist file:** tick phases above in this doc as you go.
