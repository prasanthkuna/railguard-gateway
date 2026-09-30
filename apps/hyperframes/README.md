# HyperFrames — Railguard grant video

**~90s HackQuest master** — Claude/Fable-style lane (VO + GSAP scenes + real captures).

| File | Purpose |
| --- | --- |
| `STORYBOARD.md` | Beats, proof IDs, what is HF vs screen recording |
| `SCRIPT.md` | VO text (TTS chunks ≤60s) |
| `GOAL.md` | Paste-ready Claude Code `/goal` prompt |
| `render.ps1` | Export to `media/grant/` |

Pipeline: `docs/media/HYPERFRAMES_PIPELINE.md` · claims: `docs/media/CLAIM_MAP.md`

## Render (pro path)

```powershell
cd railguard-gateway\apps\hyperframes
.\render.ps1 -Profile grant-90s          # HF-only → media/grant/
.\render.ps1 -Profile grant-90s -MuxCaptures   # after captures/ filled
cd grant-90s && npm run dev              # preview in browser
bun run verify-hackquest-pack            # from repo root
```

Composition lives in **`grant-90s/index.html`** (90s, brand + APF + Sepolia proof typography).
