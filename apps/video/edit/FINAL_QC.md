# Arbitrum hero — final quality report

## Master

- File: `edit/final.mp4`
- Duration: 84.245 seconds
- Video: H.264, 1920×1080, 30 fps
- Audio: AAC, 48 kHz, stereo
- Size: 6,702,219 bytes

## Audio

- Approved narration: Andrew V2, 84.180 seconds
- Integrated loudness: -16.1 LUFS
- Loudness range: 3.4 LU
- True peak: -3.2 dBFS
- Ambient underscore: 48 kHz mono source, mastered below dialogue
- No silence of 1.5 seconds or longer detected at -45 dB

## Visual

- Reviewed representative frames across all five chapters.
- Reviewed ±1.5 seconds around all four chapter boundaries.
- No black holds of 0.5 seconds or longer detected.
- Essential type remains inside a 104 px horizontal safe area.
- Canonical Railguard SVG from `packages/brand/assets/icon.svg` is used in the persistent header and closing lockup.
- `NO SIGN-IN` is scoped only to the public proof page; PreBroadcast operator replay is explicitly labelled `SIGN-IN REQUIRED`.
- The closing CTA gives the public proof and authenticated operator equal visual weight, and includes the real open-source repository URL.
- Failure Lab is labelled as client-side simulation.
- Hook deployment and external-wallet settlement are explicitly separated.
- Cloudflare-blocked Arbiscan capture is not used.

## Build verification

- TypeScript: passed
- Remotion render: passed, 2526/2526 frames
- Source duration: 2526 frames / 30 fps = 84.2 seconds
- A/V tail difference: approximately 0.065 seconds including container padding

