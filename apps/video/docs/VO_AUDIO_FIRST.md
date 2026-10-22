# Audio first (approve before video)

## Ollama

**Ollama does not speak.** Your models (`gemma3:4b`, etc.) are text LLMs only.

Use Ollama optionally to **rewrite** a line for speakability (`RAILGUARD_USE_OLLAMA=1`). **TTS** is Edge, Qwen VoiceDesign, or Chatterbox in `.venv-vo-*`.

## Build the master

```powershell
cd c:\Users\PrasanthKuna\personal\web3\railguard-gateway

# Default: Edge, sparse script, variable pauses (no robotic 0.55s grid)
bun run video:vo:master

# Optional: Qwen VoiceDesign (slow on CPU, GPU better)
$env:RAILGUARD_VO_PROVIDER = "qwen"
bun run video:vo:master

# Optional: Ollama polishes each line before TTS
$env:RAILGUARD_USE_OLLAMA = "1"
bun run video:vo:master
```

**Listen:**

- `apps/video/public/vo/vo-master.wav`
- `media/grant/vo-master.wav` (same file)

Edit beats in `apps/video/director/voice-performance.json` (pauses, copy, rate per line).

## Approve

Open `apps/video/public/vo/vo-master.json` and set:

```json
"approved": true
```

## Sync video (only after approve)

```powershell
bun run video:vo:sync
```

This renders hero with the approved master (wired in a follow-up when you confirm audio).
