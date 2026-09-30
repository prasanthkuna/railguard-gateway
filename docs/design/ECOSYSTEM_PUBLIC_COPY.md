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
- Track A (hook deploy) / Track B (external-wallet verification) **without** event names — never “Tier B” on public UI

## Arbitrum page — target narrative

**Hero:** Track A hook on Sepolia; Track B 0.01 USDC external-wallet verification — separate proofs, same lifecycle kernel.

**Side panel:** Reproduce — `bun run arbitrum-sepolia-evidence`, code path, rail id, public proof page + hook README.

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
