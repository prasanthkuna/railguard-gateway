# Pro voiceover — HyperFrames master

## Problem (Kokoro / flat TTS)

Default `npx hyperframes tts` + `am_adam` reads like **dictation**: even pace, no breath, no emphasis. Judges hear “text-to-speech,” not product narrative.

## Pro stack (Railguard default)

| Piece | Choice | Why |
| --- | --- | --- |
| Voice | **Edge `en-US-AndrewMultilingualNeural`** | Warm, conversational (Copilot-class), not announcer-shout |
| Script | **`grant-90s/assets/vo-full.ssml`** | `<break>`, `<prosody rate="-8%">`, em-dashes for phrasing |
| Pace | ~125–135 wpm effective | Slower than 145 wpm “read the spec” |
| Captions | `vo-full.vtt` from edge-tts | Burn-in optional; required for muted social |
| Visuals | **`master-index.html`** | Real site captures (Ken Burns) + proof typography |

## Commands

```powershell
cd railguard-gateway
git push origin main   # deploy site first so captures match copy

cd apps\hyperframes\scripts
.\render-pro-master.ps1
```

Output: `media/grant/arbitrum-open-house-2026-master.mp4`

## Upgrade path (optional)

- **ElevenLabs** clone or “Narration” preset for VO-1/VO-2 if Edge still feels flat on your machine.
- **Manual record** in Audacity; replace `vo-full.wav` and keep VTT for captions.
- Duck **-24 LUFS** ambient bed under VO (not shipped in v1 script).

## QA

- First 5s: outcome + risk (not logo-only).
- ≥50% runtime: **real UI** (hero, Failure Lab, proof page).
- Tx hash readable at ~1:05 pause frame.
- Length within **85–95s** (trim SSML breaks if over).
