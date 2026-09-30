# Screen captures for grant master mux

Record **1920×1080** or **1280×720** (scale in ffmpeg). Name files exactly as below.

| File | Source | Duration target |
| --- | --- | --- |
| `attack-apf.mp4` | https://railguard-site.vercel.app/attack — run one attack | 5–8s |
| `operator-settled.mp4` | https://prebroadcast.vercel.app/executions/exec_b73824e9-726f-4d59-af49-ac5cd1e1c9aa | 8–12s |
| `arbiscan-tx.mp4` | https://sepolia.arbiscan.io/tx/0x243ec1e8eb6a992a85a035af11edd5ff70d78e3b84e7eb6c78ab5badc409608d | 6–10s |

Optional: `protect-cli.mp4` — terminal `railguard protect` deny.

Mux after HyperFrames render:

```powershell
cd railguard-gateway\apps\hyperframes
.\render.ps1 -Profile grant-90s
# Then edit concat list in grant-90s\mux\concat.txt and run grant-90s\mux\mux.ps1
```
