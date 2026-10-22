# HackQuest video — judge-safe submission plan

**Story source:** `web3/videoplan-0410.md` · **Remotion brief:** `apps/video/director/STORY.md`

Hero is **Remotion-native** (lifecycle + replay + failure table + real Sepolia receipt). No site B-roll montage.

---

## Render

```powershell
cd c:\Users\PrashanthKuna\personal\web3\railguard-gateway
bun run video:vo                    # optional — generates public/vo-hero.wav from vo-hero.txt
bun run --filter @railguard/video render:hero
bun run --filter @railguard/video render:technical
Copy-Item apps\video\out\arbitrum-hero.mp4 media\grant\arbitrum-hero.mp4
```

Preview: `bun run --filter @railguard/video dev` → compositions `ArbitrumHero`, `ArbitrumTechnical`.

---

## Checklist before upload

- [ ] Hero shows: happy path → **REPLAY BLOCKED** → failure table → **SETTLED** proof (no WorkOS / PreBroadcast)
- [ ] VO matches picture (regenerate if you changed `vo-hero.txt`)
- [ ] `bun run verify-hackquest-pack` passes
- [ ] YouTube unlisted URL in `docs/grants/HACKQUEST_ARBITRUM_COPY.md`

---

## Optional polish

- Short (≤8s) capture of public proof page — insert only if it adds clarity; not required for v1 hero.
