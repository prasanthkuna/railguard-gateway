# Arbitrum submission — complete editorial and technical audit

**Audit date:** 2026-10-04  
**Scope:** Existing Hero and Technical renders, old and new narration, voice copy, scene copy, Remotion compositions, proof claims, recorded product clips, audio/video encoding, and submission gates.  
**Status:** Strategy only. No production media or composition has been changed.

## Final verdict

The primary submission video should be **regenerated**, not patched. Keep the strongest Railguard design components and verified proof data, but replace the narration script, timing model, product-capture sequence, sound mix, captions, and most scene choreography.

Do **not** integrate `vo/vo-master.wav` unchanged. It is technically clean, but its copy and pacing are not suitable for the Arbitrum submission. Use its voice only if a human A/B listen confirms that the timbre is worth keeping, then regenerate a new performance from the proposed script in `director/SCRIPT_V2_PROPOSED.md`.

The current `ArbitrumTechnical` should not be published. It is a 73-second rearrangement of Hero scenes using the same Hero narration—not a technical walkthrough. Rebuild it later from the approved primary master and real product footage, or omit it from the submission.

## Evidence reviewed

- `out/arbitrum-hero.mp4` and `out/arbitrum-technical.mp4`
- `public/vo-hero.wav`, `public/vo-hero.txt`, and `public/vo-hero.vtt`
- `public/vo/vo-master.wav`, its manifest, and `director/voice-performance.json`
- Both Remotion compositions, all mounted scenes, shared visual components, timing constants, and render scripts
- Every available public product clip plus the clip manifest and submission gates
- Arbitrum Sepolia settlement manifest, hook deployment evidence, grant copy, public claim map, and judge-path runbook
- YouTube, EBU, Adobe, Remotion, Apple, and Arbitrum first-party guidance linked below

## Issue register

### P0 — blocks submission

1. **Both renders use the old audio.** `ArbitrumHero.tsx` and `ArbitrumTechnical.tsx` explicitly load `vo-hero.wav`.
2. **The audio sync command is a no-op.** `sync-hero-to-vo-master.ts` checks `approved` and starts a render, but never references/copies `vo-master.wav` and never retimes the composition.
3. **The new narration is not submission-ready.** It contains only 60 words over 79.924 seconds—45 effective words per minute—and never says Arbitrum, Sepolia, 0.01 USDC, public proof, explorer transaction, open source, or testnet.
4. **The new narration is intentionally unapproved.** Its manifest says `approved: false` and identifies the provider as Edge `en-US-GuyNeural`.
5. **No canonical duration exists.** Current sources separately specify 42s, ~61s, 73s, 90s, ~2:07, and 135s. This guarantees timing drift.
6. **The Hero does not show the real product.** `ProductDemoScene` exists but is not mounted. The render is almost entirely recreated text and terminal cards.
7. **The Technical cut is not technical.** It repeats Hero scenes, repeats `BudgetRaceScene` for the “unknown” section, uses the Hero VO, and has no real walkthrough.
8. **The current Arbiscan clip is unusable.** All sampled frames across 36.5s show Cloudflare “Performing security verification,” not the transaction.
9. **Capture QA is red.** `manifest.json` has no clips, `record-quality.json` has no chapters, and both submission checks fail.
10. **Proof relationships can be misread.** The hook deployment and the 0.01 USDC external-wallet settlement are separate proofs; the settlement transaction did not traverse the hook. The video must say and show that distinction.
11. **Failure Lab copy is factually inconsistent.** The site and grant pack define six APF classes; the video invents an eight-row table with different names and outcomes.
12. **The “happy path” uses invented demo facts.** It shows “25 USDC → service X” under “TESTNET LIFECYCLE,” while the verified transaction is a separate 0.01 USDC external-wallet flow. This risks implying the synthetic card is the real proof.
13. **Captions are broken and absent.** The old VTT resets timestamps to zero for every synthesized block, and neither composition displays or exports reviewed captions.
14. **The rendered color metadata is wrong for YouTube SDR.** The Hero is full-range `yuvj420p` tagged `bt470bg`, not limited-range BT.709.

### P1 — major quality problems

15. **New VO pacing is unnaturally slow.** Speaking-only pace is 80 WPM; the six one-word beats (“Authorize” through “Prove”) each occupy roughly 1.9–2.1 seconds.
16. **The new file is a voice stem, not a finished soundtrack.** It contains a 16s silent block and a 6s silent tail with no music, ambience, or designed transitions.
17. **The old script is denser but awkward.** “Authorize, reserve, execute, observe, reconcile, and evidence” uses “evidence” unnaturally as a verb; “zero point zero one U-S-D-C” is TTS-shaped copy rather than natural narration.
18. **Railguard arrives too late in the new script.** The product name first appears around 44 seconds; the chain never appears.
19. **The story remains abstract for too long.** The new copy explains state boundaries but never demonstrates a concrete user action, failure, recovery, or proof.
20. **The pipeline animation cannot complete.** Seven stages advance every 28 frames inside a 150-frame scene; the final `EVIDENCE` stage never activates.
21. **Replay is held too long.** `REPLAY DETECTED / BLOCKED` appears at 2.5s in a 12s scene and then remains essentially static.
22. **Motion density is extremely low.** Freeze detection reports long static spans, including roughly 27.3 seconds from 16.0–43.3s in the Hero at a −45 dB threshold.
23. **No editorial transitions exist.** Plain `Series` cuts move between scenes without J/L cuts, audio bridges, match cuts, fades, or designed handoffs.
24. **Visual hierarchy is too small and sparse.** Critical labels use 12–18px type, while most frames leave the majority of 1920×1080 empty. This becomes unreadable on a laptop or embedded judging page.
25. **The recreated proof card is less convincing than the actual proof page.** It is accurate data rendered as a terminal mockup, but does not visually prove the public page or transaction source.
26. **Available captures are not edit-ready.** `site-judge-path` duplicates proof/Failure Lab content across 31.8s; raw pages need intentional crops and holds. The site captures should not simply be played full-frame.
27. **The brand lockup is incomplete.** The current close uses text only and does not apply the official Arbitrum logo/clear-space treatment.
28. **Audio is not mixed as a program.** There are no dialogue/music/SFX stems or dialogue-driven ducking. The Technical render falls to −22.1 LUFS because the short Hero VO ends before picture.

### P2 — delivery and maintainability

29. **Rendered video bitrate is exceptionally low.** Hero is ~156 kb/s and Technical ~135 kb/s. Static content compresses efficiently, but fine text and dark gradients need more headroom before YouTube transcodes them.
30. **Timing is duplicated across files.** Story docs, shot list, constants, scene-local thresholds, audio manifests, and claim maps all carry independent durations.
31. **The product-clip manifest is imported at build time but is empty.** Even if `ProductDemoScene` were mounted, it would fall back to guessed clip lengths.
32. **The proof terminology needs one mapping.** Chain evidence says transaction `CONFIRMED`; the application execution is `SETTLED`. The film should explain that the confirmed transfer causes Railguard to record the execution as settled.
33. **Limitations are missing.** Public copy calls the project v0.1 alpha/testnet-first and the Failure Lab a client-side simulation; the film should not imply production guarantees.
34. **The MP4 is fast-start and otherwise compatible.** H.264 High Profile, two B-frames, AAC-LC 48 kHz stereo, and front-loaded `moov` are already correct and should be retained.

## Revised production strategy

### One master first

Build one **82–88 second judge-facing master**. It should contain approximately 130–150 spoken words, 12–18 seconds of intentional breathing/proof holds, and no unauthenticated or blocked browser footage. Derive all duration, scene, caption, and ducking cues from one approved timeline manifest.

### Story structure

| Time | Purpose | Required evidence |
| --- | --- | --- |
| 0–6s | Problem and hook | Agent intent plus exact-payment risk; no logo-only opening |
| 6–20s | What Railguard controls | Intent → bound authorization → reserve → execute → observe/reconcile |
| 20–38s | Six failure classes | Real Failure Lab interaction, with APF names matching the site |
| 38–53s | Why post-broadcast state matters | Crash/unknown result; observe and reconcile instead of guessing |
| 53–66s | Arbitrum integration | Hook deployment, clearly labeled as one proof |
| 66–80s | Separate wallet settlement | Actual public proof: 0.01 USDC, matching facts, tx confirmed, execution SETTLED |
| 80–88s | Honest close | Open source, testnet-first, public URL, Railguard × Arbitrum lockup |

### Picture

- Use real UI/proof footage for at least half the runtime; use motion graphics to orient and explain it.
- Replace the Cloudflare Arbiscan recording with a deterministic proof treatment: public proof page, verified manifest fields, shortened tx hash, and the explorer URL in the description. Use an explorer capture only if it can be recorded without a challenge page.
- Crop/pan product footage so the current action is readable. Do not show an entire 1920px page when the judge needs one card or transaction fact.
- Keep one claim per frame. Body copy should generally be at least 30–32px at 1080p; major claims 48–72px.
- Use reviewed sentence-case captions, maximum two lines, applied after every overlay.
- Use official Arbitrum navy/blue/teal and an approved white/full-color logo with correct clear space.

### Audio

- Regenerate the proposed script beat by beat. A/B the existing Edge timbre against one higher-quality provider or a clean human read before committing.
- Avoid six isolated one-word TTS files; speak lifecycle phrases in complete thoughts so cadence is human.
- Use separate dialogue, music, ambience, and SFX stems. Music should bridge visual cuts and duck smoothly under speech; SFX should mark only meaningful state changes.
- Target final program loudness around −18 to −16 LUFS, 4–9 LU LRA, and ≤ −1 dBTP. Validate headphones, laptop speakers, and a phone.

### Delivery

- MP4, H.264 High Profile, 1920×1080, progressive 30 fps, yuv420p, limited-range BT.709, front-loaded `moov`.
- Use H.264 CRF 16–18 or a deliberate 8–12 Mb/s upload target; AAC-LC 48 kHz stereo at 320–384 kb/s.
- Upload unlisted, wait for 1080p processing, then inspect the YouTube transcode—not only the local master.

## Acceptance gates

1. Script claims map to the evidence manifest and explicitly separate hook deployment from wallet settlement.
2. Human approves the regenerated dry VO before picture timing is changed.
3. A single timeline manifest drives composition duration, captions, music ducking, and proof holds.
4. Submission capture manifest is populated and both capture gates pass.
5. No WorkOS/login, Cloudflare, blank, private operator, or synthetic-as-real frame appears.
6. First rough cut works with only VO, real captures, and basic cards before polish.
7. Final mix and encode pass objective checks plus three-device human playback.
8. Every claim remains legible in a phone-sized preview and every proof fact stays on screen after motion settles.
9. YouTube 1080p playback is reviewed before the URL is submitted.

## First-party guidance checked

- [YouTube recommended upload encoding settings](https://support.google.com/youtube/answer/1722171)
- [EBU R 128 s2 — Loudness in Streaming](https://tech.ebu.ch/docs/r/r128s2.pdf)
- [Adobe: auto-match loudness](https://helpx.adobe.com/premiere/desktop/add-audio-effects/adjust-volume-and-levels/auto-match-audio-loudness.html)
- [Adobe: dialogue-driven audio ducking](https://helpx.adobe.com/premiere/desktop/add-audio-effects/adjust-volume-and-levels/automatically-duck-audio.html)
- [Remotion encoding guide](https://www.remotion.dev/docs/encoding)
- [Apple: cohesive story, real UI, legible copy, and professional VO](https://developer.apple.com/app-store/app-previews/)
- [Arbitrum brand kit](https://arbitrum.io/brand-kit)

