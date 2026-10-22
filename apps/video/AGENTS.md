# Video app — agent instructions

Use **Remotion** only. Read `director/STORY.md` and `director/SHOTLIST.json` before editing compositions.

- Motion tokens: `src/railguard/motion-tokens.ts`
- Compositions: `src/compositions/ArbitrumHero.tsx`, `ArbitrumTechnical.tsx`
- Register new compositions in `src/Root.tsx`
- Product PNGs: `bun run capture:product` → `assets/product/`
- Follow Remotion agent skills in repo `.agents/skills/` (install: `bun run video:skills` from monorepo root)

Do not reintroduce HyperFrames or HTML/GSAP render paths in this repo.
