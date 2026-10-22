# @railguard/video (Remotion)

Arbitrum grant films and future launch cuts. **HyperFrames removed** — this app is the only video engine.

## Cursor / agent setup

1. **Remotion Cursor plugin** (local): `~/.cursor/plugins/local/remotion` — reload Cursor after install.
2. **Project skills**: from repo root run `bun run video:skills` (installs `.agents/skills` from Remotion).
3. Brief the agent with `director/STORY.md` + `director/SHOTLIST.json` + `src/railguard/motion-tokens.ts`.

## Commands (from repo root)

```powershell
bun run dev:video          # Remotion Studio
bun run render:hero        # out/arbitrum-hero.mp4
bun run render:technical   # out/arbitrum-technical.mp4
bun run capture:product    # UI PNGs → assets/product/
```

## Layout

```text
director/           STORY, SHOTLIST
src/compositions/   ArbitrumHero, ArbitrumTechnical
src/railguard/      motion tokens, shared components (grow here)
assets/product/     captured site/operator screenshots
out/                rendered MP4 (gitignored)
```

## License

Remotion: free for teams ≤3 people — see [Remotion license](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md).
