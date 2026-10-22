# Hero voiceover (pro pipeline)

## Why the old VO felt bad

Single `edge-tts --file` pass = **one breathless paragraph**, default voice, no pauses, no loudness mastering. Reads like dictation, not a product film.

## Current pipeline

`bun run video:vo` → `apps/video/scripts/generate-vo-hero.ts`

1. Split `public/vo-hero.txt` on **blank lines** (one beat per block).
2. Synthesize each beat separately.
3. Insert **~0.55s silence** between beats.
4. Master: high-pass, light compression, **EBU loudnorm −16 LUFS**.

## Edge (free default)

```powershell
$env:RAILGUARD_VO_VOICE = "en-US-EmmaMultilingualNeural"   # or en-US-RogerNeural, en-US-BrianMultilingualNeural
$env:RAILGUARD_VO_RATE = "-12%"
$env:RAILGUARD_VO_PITCH = "-2Hz"
bun run video:vo
```

List voices: `edge-tts --list-voices | Select-String "en-US.*Neural"`

## ElevenLabs (best quality)

```powershell
$env:RAILGUARD_VO_PROVIDER = "elevenlabs"
$env:ELEVENLABS_API_KEY = "<your key>"
# optional: $env:ELEVENLABS_VOICE_ID = "..."
bun run video:vo
```

Then re-render: `bun run --filter @railguard/video render:hero`

## Manual (top tier)

Record in Audacity/Descript → replace `public/vo-hero.wav` (48 kHz mono). Keep script in `vo-hero.txt` for captions.
