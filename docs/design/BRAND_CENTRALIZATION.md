# Brand centralization — site, operator, HyperFrames

## Problem (before)

| Surface | Fonts | Theme | Favicon | Logo |
|---------|-------|-------|---------|------|
| `apps/site` | Space Grotesk + Geist Mono | Dark mint (`globals.css`) | Missing | `components/Logo.tsx` |
| `apps/operator` | Inter + JetBrains (CDS light) | Coinbase blue / white | Missing | Duplicate `Logo.tsx` |

Two products on camera → grant video and judges see a mismatch.

## Target architecture

```text
packages/brand/
  tokens.css           ← --bg, --mint, --font-display (marketing source of truth)
  operator-theme.css   ← --rg-* mapped to tokens (operator Tailwind/components)
  Logo.tsx             ← single mark
  assets/icon.svg      ← favicon master
```

```text
apps/site/app/icon.svg          ← copy of brand icon (Next App Router)
apps/operator/app/icon.svg
apps/hyperframes/scenes/*.html  ← <link href=.../tokens.css>
```

## Phases

### Phase 0 — Done in repo

- [x] `@railguard/brand` package
- [x] Favicon `app/icon.svg` + metadata on site and operator
- [x] Shared `Logo` component
- [x] Site imports `tokens.css`
- [x] Operator imports `operator-theme.css` (dark mint, same fonts as site)
- [x] Remove `@coinbase/cds-web` font shim from operator layout

### Phase 1 — Operator polish (follow-up)

- [ ] Audit hard-coded `rgb(0, 82, 255)` / light surfaces in operator components
- [ ] Align `rg-card`, buttons, tables with site card styles (optional shared `@layer` in brand)
- [ ] Login / auth screens: same background as marketing

### Phase 2 — HyperFrames

- [ ] Base scene template linking `packages/brand/tokens.css`
- [ ] Capture URLs: site + prebroadcast with identical tab icon and fonts
- [ ] Document in `apps/hyperframes/README.md`

### Phase 3 — Optional `@railguard/ui`

- Extract shared `PageHeader`, `Button`, `SectionCard` when operator and site converge further
- Not required for HackQuest; avoid big-bang refactor

## Deploy

Redeploy **railguard-site** and **prebroadcast** on Vercel after merge. Hard refresh (or clear favicon cache) to see tab icon.

## Commands

```powershell
cd railguard-gateway
bun install
bun run --filter @railguard/site build
bun run --filter @railguard/operator build
```
