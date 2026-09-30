# Paste into Claude Code (`/goal`)

```text
Produce the Railguard Arbitrum demo master video (~90s) using the Claude/Fable orchestration lane. Public VO is product-only (no HackQuest/grant names on screen or in SCRIPT.md):

- Storyboard: apps/hyperframes/STORYBOARD.md
- Voiceover: apps/hyperframes/SCRIPT.md (chunk VO-1 and VO-2 for TTS ≤60s)
- Claims/proof: docs/media/CLAIM_MAP.md — every row must appear on screen
- Brand: packages/brand/tokens.css, Logo.tsx / icon.svg
- Real inserts only: prebroadcast execution exec_b73824e9-726f-4d59-af49-ac5cd1e1c9aa (SETTLED), evidence/arbitrum-sepolia/manifest.json (ok:true), Sepolia tx 0x243ec1e8eb6a992a85a035af11edd5ff70d78e3b84e7eb6c78ab5badc409608d
- No AI-generated fake terminals, wallets, or blockchain footage

Workflow:
1) Author or update GSAP scenes in apps/hyperframes/scenes/
2) hyperframes tts from SCRIPT.md; render scenes; ffmpeg concat with captures/
3) Word-level transcribe; retime on-screen text to VO
4) Visual QA: frame grabs per beat; fix timing/layout failures
5) Output media/grant/arbitrum-open-house-2026-master.mp4 via render.ps1

Stop only when claim map is fully satisfied and Sepolia proof is legible. Quality bar: credible infra demo, not a grant application narrated aloud.
```
