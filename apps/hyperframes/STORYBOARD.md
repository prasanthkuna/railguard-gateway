# Demo master — storyboard (Claude / HyperFrames lane)

**Runtime:** ~90s · **Profile:** `grant-90s`  
**Style:** Fable-style pipeline — VO + code-timed motion (HyperFrames/GSAP) + **real** UI/terminal/Arbiscan inserts only.

| Beat | Time | Type | Visual | VO hook | Proof ID |
| --- | --- | --- | --- | --- | --- |
| 1 | 0:00–0:10 | HF | Dark mint brand field; agent icon → wallet → unsigned arrow | Hook | LAUNCH |
| 2 | 0:10–0:35 | HF + capture | Six tiles animate in (APF-001…006); cut to `/attack` or Failure Lab | Six failures | APF-001…006 |
| 3 | 0:35–0:55 | capture + HF | `railguard protect` block OR staging policy deny; green “blocked” pulse | Policy gate | CLI / API |
| 4 | 0:55–1:10 | capture + HF | Receipt JSON / operator lifecycle diagram | Evidence | `/r/demo`, receipt |
| 5 | 1:10–1:22 | capture | Public proof + **SETTLED**; Sepolia Arbiscan tx | Wallet verification | manifest + tx |
| 6 | 1:22–1:30 | HF | Logo, tagline, URLs | Close | site + operator |

## Beat 1 — Hook (HF)

- **Camera:** slow push on centered “autonomous agent” node; second node “wallet”.
- **Motion:** dashed payment line tries to draw; red **UNAUTHORIZED** stamp on word “autonomous”.
- **On-screen text (timed to VO):** “Agents can move money” → “without guardrails, that’s liability.”

## Beat 2 — Six failures (HF list → real lab)

- **HF:** 2×3 grid, each tile: code + one-line failure (from APF set).
- **Insert:** 3–5s site `/attack` or terminal `railguard attack` (recorded, not synthetic).
- **Director note:** emphasise **variety** (replay, amount, chain, recipient, session, evidence).

## Beat 3 — Protect (real CLI/API)

- **Insert:** terminal `protect` or operator authorize flow stopping bad path.
- **HF overlay:** policy rule card slides in; checkmark on “execution blocked”.

## Beat 4 — Receipt lifecycle

- **Insert:** receipt JSON or operator execution timeline (intent → authorize → observe → settled).
- **HF:** simple state machine, mint accent on **SETTLED** state (preview only; full proof in beat 5).

## Beat 5 — Arbitrum Sepolia (real only)

- **Insert sequence:**
  1. `https://prebroadcast.vercel.app/executions/exec_b73824e9-726f-4d59-af49-ac5cd1e1c9aa` — status **SETTLED**
  2. `evidence/arbitrum-sepolia/manifest.json` — `"ok": true`
  3. Arbiscan: `https://sepolia.arbiscan.io/tx/0x243ec1e8eb6a992a85a035af11edd5ff70d78e3b84e7eb6c78ab5badc409608d`
- **Optional 2s HF:** hook address caption `0x7568…965E` (hook deployment) — text only, no fake chain footage.

## Beat 6 — Close (HF)

- Logo from `packages/brand/`
- **URLs:** `railguard-site.vercel.app` · `prebroadcast.vercel.app`
- **Tagline:** (match site hero — keep under 8 words)

## Scene files (to author)

```text
scenes/01-hook.html
scenes/02-failures.html
scenes/03-protect-overlay.html
scenes/04-lifecycle.html
scenes/06-close.html
captures/   # screen recordings you drop in; not generated
grant-90s.json   # HyperFrames composition timeline (word markers from SCRIPT.md)
```

## Claude Code `/goal` (orchestration)

Use when driving the full pipeline from Claude Code + Fable-class model:

1. Read this file + `SCRIPT.md` + `docs/media/CLAIM_MAP.md`.
2. Generate/update scene HTML under `scenes/` (GSAP, brand tokens from `packages/brand/tokens.css`).
3. Run HyperFrames TTS from `SCRIPT.md` (chunks ≤60s); mux VO.
4. Place **only** captures listed in beat 3–5; reject AI-fake terminals or txs.
5. Transcribe final VO; retime HF text to words.
6. Export `media/grant/arbitrum-open-house-2026-master.mp4`; verify every claim row in CLAIM_MAP has a visible proof frame.

**Stop condition:** 100% claim map covered; Sepolia tx hash readable on at least one frame; total 85–95s.

See `GOAL.md` for a paste-ready goal prompt.
