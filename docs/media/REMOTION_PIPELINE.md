# Remotion pipeline (canonical)

HyperFrames was removed Oct 2026. All grant and launch video work lives in **`apps/video`**.

## Setup

1. Install **Remotion Cursor plugin** (Marketplace or clone to `%USERPROFILE%\.cursor\plugins\local\remotion`).
2. From repo root: `bun install` then `bun run video:skills`.
3. `bun run dev:video` — Remotion Studio.

## Render

```powershell
bun run record:product      # live UI → apps/video/public/clips/*.mp4
bun run video:record-quality
bun run render:hero         # apps/video/out/arbitrum-hero.mp4
bun run render:technical
```

Re-record one chapter: `$env:RECORD_CHAPTER="site-proof"; bun run record:product`

Operator clips on production need a session (never commit tokens):

```powershell
$env:RAILGUARD_RECORD_ACCESS_TOKEN="<WorkOS access token from a builder session>"
bun run record:product
# or local operator: $env:RAILGUARD_RECORD_DEV_AUTH="1"
```

Judge-facing story stays on **site clips** — see `docs/runbooks/JUDGE_PATH_AND_VIDEO_PLAN.md`.

**HackQuest submit (no sign-in in video):**

```powershell
bun run record:product:submission
bun run video:submission-clips
bun run video:vo
bun run render:hero:submission
```

Details: `docs/media/HACKQUEST_VIDEO_SUBMIT.md`. Default render excludes `op-*` clips; use `RAILGUARD_VIDEO_MODE=full` only for internal cuts.

Storyboard PNGs only: `bun run capture:product` (deprecated for final masters).

## Director docs

- `apps/video/director/STORY.md` — thesis and tone (`arb-video.md`)
- `apps/video/director/SHOTLIST.json` — beats per composition
- `docs/media/CLAIM_MAP.md` — on-screen claims vs evidence

## Master exports (optional copy)

```text
media/grant/arbitrum-hero.mp4
media/grant/arbitrum-technical.mp4
```

Create `media/grant/` locally; MP4s are gitignored.
