# Grant video — HyperFrames (canonical)

**Supersedes** Remotion/CapCut as the **grant master** (`docs/VIDEO-PIPELINE.md` is legacy).

## Purge before render

Delete generated assets (keep source scenes):

- `apps/video/out/*.mp4`
- `apps/video/capcut-pipeline/out/`, `drafts/`, `assets/terminal/*.mp4`, `assets/ui/screenshots/*.png`
- Any stale `media/grant/*.mp4` from prior runs

Do **not** commit seed phrases or wallet keys.

## Story (~90s)

See [LAUNCH.md](../../../LAUNCH.md) and [CLAIM_MAP.md](./CLAIM_MAP.md).

1. Hook — agent + wallet risk  
2. Six failures (Failure Lab / `/attack`)  
3. `railguard protect` → block / reconcile  
4. Receipt + lifecycle  
5. **Arbitrum Sepolia** — Tier B SETTLED + `evidence/arbitrum-sepolia` + Sepolia Arbiscan  
6. Tagline + URLs  

## Tooling

```text
apps/hyperframes/scenes/     # HTML + GSAP scenes
apps/hyperframes/render.ps1  # HyperFrames CLI → PNG sequence → FFmpeg
media/grant/                 # final master (optional in-repo)
```

Install [HyperFrames](https://github.com/hyperframes-dev/hyperframes) per upstream docs, then:

```powershell
cd railguard-gateway\apps\hyperframes
.\render.ps1 -Profile grant-90s
```

## Inserts (real only)

- Terminal: `railguard attack` / `protect` (recorded or typed capture)  
- Browser: site `/attack`, `/ecosystems/arbitrum`, Arbiscan tx  
- No AI-generated fake terminals or txs  
