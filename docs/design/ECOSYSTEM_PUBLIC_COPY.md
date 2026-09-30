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
- **Track A / Track B**, **Tier B** (internal shorthand — use plain names below)

## Allowed on public UI

- Status: `SEPOLIA VERIFIED`, evidence links, `oneCommand`, APF coverage
- “Reproduce this proof”, “Integration details”, “View evidence”
- **Hook deployment** and **external-wallet verification** as separate proofs

## Arbitrum page — target narrative

**Hero:** Hook contracts on Sepolia; separately, 0.01 USDC external-wallet verification — two independent proofs, same lifecycle kernel.

**Side panel:** Reproduce — `bun run arbitrum-sepolia-evidence`, code path, rail id, public proof page + hook README.

**Optional footer (text link only):** External buildathon page — not a mint CTA.

## Video alignment (before render)

- `apps/hyperframes/SCRIPT.md` — product VO only (see revised script)
- On-screen proof cards — tx hash, hook address, SETTLED (no event branding)
- `GOAL.md` / `docs/grants/*` — may mention HackQuest for agent context; not spoken in VO
