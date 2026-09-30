# Ecosystem pages — public copy vs submission pack

## Principle

| Surface | Audience | Tone |
| --- | --- | --- |
| **Marketing site** (`apps/site`, `/ecosystems/*`) | Developers, integrators, operators | Product + proof: what runs, how to verify, links to evidence |
| **Operator** (`prebroadcast`) | Paying / pilot users | Console, lifecycle, no hackathon CTAs |
| **Video (HyperFrames)** | HackQuest judges + X | Same **product story** as the site; proof on screen, not “dear reviewers” |
| **Repo docs** (`docs/grants/*`) | You + form paste | Programs, deadlines, HackQuest URLs — **never** primary CTAs on site |

Judges discover programs from the submission form. The **Arbitrum page** should read like infra documentation, not a grant application.

## Banned on public UI

- “Grant reviewers”, “grant one-pager”, “Open submission portal” (primary button)
- “Every grant submission must…”
- “For grant reviewers” in card narratives
- Video VO: “Open House”, “HackQuest”, “judges”, “submission”

## Allowed on public UI

- Status: `SEPOLIA VERIFIED`, evidence links, `oneCommand`, APF coverage
- “Reproduce this proof”, “Integration details”, “View evidence”
- Technical Track A / Tier B language **without** event names

## Arbitrum page — target narrative

**Hero:** Hook + adapter on Sepolia; Tier B USDC settlement through the same lifecycle as other rails.

**Side panel:** Reproduce — `bun run arbitrum-sepolia-evidence`, code path, rail id, links to hook README + operator execution.

**Optional footer (text link only):** External buildathon page — not a mint CTA.

## Video alignment (before render)

- `apps/hyperframes/SCRIPT.md` — product VO only (see revised script)
- On-screen proof cards — tx hash, hook address, SETTLED (no event branding)
- `GOAL.md` / `docs/grants/*` — may mention HackQuest for agent context; not spoken in VO

## Checklist before `render.ps1`

- [ ] `/ecosystems/arbitrum` has no grant-reviewer heading or submission portal button
- [ ] Card link says “Integration details” not “Grant one-pager”
- [ ] SCRIPT has no buildathon / grant program names
- [ ] `bun run verify-hackquest-pack` still passes (technical URLs unchanged)
