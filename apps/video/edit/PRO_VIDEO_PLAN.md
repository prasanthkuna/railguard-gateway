# Railguard x Arbitrum — first-place video plan

## Objective

Create an 84.18-second, 1920x1080, 30 fps judge film that makes Railguard feel like a real, defensible product rather than a motion-graphics concept. Every major claim must resolve into visible product or testnet evidence.

The film should directly support the published judging criteria: smart-contract quality, product-market fit, innovation and creativity, real problem solving, and a qualifying Arbitrum deployment.

## Current-cut diagnosis

- The current render is 61.31 seconds while Andrew's approved narration is 84.18 seconds; replacing audio alone would truncate the final 22.87 seconds.
- The presentation is visually repetitive: black field, centered card, dissolve, repeat. It lacks escalation and a memorable visual motif.
- Typography is undersized for a judged video. Important UI and captions occupy too little of a 1920x1080 frame.
- Product proof arrives late. Most of the current film uses illustrative terminal cards rather than the working Railguard surface.
- The pipeline is a vertical list, not a visual explanation of the control boundary between agent intent and wallet signing.
- The existing Failure Lab table does not demonstrate the six tests or explain the crucial difference between `BLOCKED` and `RECONCILED`.
- The current lifecycle uses a fictional 25 USDC example next to the separate 0.01 USDC testnet proof, creating avoidable ambiguity.
- The Arbiscan capture is unusable because it shows a Cloudflare human-verification screen.
- Arbitrum identity and deployed-contract evidence are too weak for a competition whose eligibility requires deployment on an Arbitrum chain.
- There is no visual product-market-fit moment: who needs this, what goes wrong, and what Railguard changes are not connected in one clear before/after.

## Creative direction

**Concept: The signing boundary.** A single luminous transaction line travels from an autonomous agent toward a wallet. Railguard expands around that line into a control boundary: binding, reservation, execution state, reconciliation, and evidence. The same line becomes the visual spine across the whole film, finally resolving into a real Arbitrum Sepolia transaction and public receipt.

The look is precise infrastructure cinema: near-black graphite, restrained Railguard mint, off-white type, red only for unsafe states, and Arbitrum blue only for chain/deployment/proof moments. Use large editorial typography, cropped real product UI, fine technical labels, and controlled depth. Avoid generic glowing cards, random particle fields, excessive gradients, and flashy transition packs.

## Approved timeline

| Time | Narration beat | Visual story | Judge signal |
| --- | --- | --- | --- |
| 0:00–0:07.06 | Wallet vs authority | A payment intent races toward `SIGN`; freeze one frame before it. The Railguard boundary closes around it. Large two-line hook, no logo. | Real problem |
| 0:07.06–0:14.50 | Sits between intent and wallet | One continuous diagram: `AGENT → INTENT → RAILGUARD → WALLET → ARBITRUM`. Camera pushes into Railguard. | Product clarity |
| 0:14.50–0:21.50 | Binds authorization | Five constraints lock onto the transaction line: chain, token, recipient, amount, budget. Use one-at-a-time reveals. | Security design |
| 0:21.50–0:27.85 | Lifecycle and evidence | The line advances through reserve, broadcast, observe, settle, evidence. State remains persistent instead of resetting per slide. | Technical completeness |
| 0:27.85–0:37.80 | Six failure classes | Real Failure Lab UI fills the frame; the six APF cells activate in narration order. Product footage, not a recreated table. | Working product / UX |
| 0:37.80–0:44.20 | Block before broadcast | Zoom into replay and budget-race outcomes. A pre-broadcast gate closes; `0 USDC MOVED` lands as the payoff. | Safety / wow moment |
| 0:44.20–0:50.61 | Reconcile ambiguity | Contrast two lanes: deterministic unsafe request → `BLOCKED`; broadcast uncertainty → `OBSERVE → RECONCILE`. | Innovation |
| 0:50.61–0:57.80 | Arbitrum hook deployment | Arbitrum-blue environment shift. Show Sepolia chain ID, execution-hook contract address, and deployment evidence as a compact verified plate. | Eligibility / contract quality |
| 0:57.80–1:05.50 | Separate external-wallet transfer | Explicit divider: `HOOK DEPLOYMENT` versus `EXTERNAL-WALLET PROOF`. Animate 0.01 USDC from sender to recipient; never imply this transfer traversed the hook. | Claim integrity |
| 1:05.50–1:14.23 | Matched and settled | Use the real public proof surface. Highlight chain, token, recipient, amount, `SETTLED`, execution ID, and transaction hash in sync. | Verifiable proof |
| 1:14.23–1:15.18 | Breath | Hold the complete receipt. Add `PUBLIC PROOF PAGE · NO SIGN-IN` and disclose that operator replay requires sign-in. | Trust |
| 1:15.18–1:24.18 | Open-source close | Canonical product mark, `OPEN SOURCE · TESTNET-FIRST`, public-proof URL, and explicit access boundary: public proof needs no sign-in; operator replay does. | Credibility / recall |

## Visual system changes

- Replace Segoe UI with a deliberate display/body system: Manrope for editorial copy and JetBrains Mono for state/evidence. Load deterministically through `@remotion/google-fonts`.
- Increase type scale: 82–104 px hero, 48–64 px section statements, 26–34 px proof values, 18–22 px technical labels. Keep all essential text inside a 112 px safe margin.
- Build a 12-column layout and reusable `EvidencePlate`, `MetricChip`, `StateRail`, and `ProductViewport` components.
- Raise foreground contrast and introduce three depth levels: graphite base, subtle grid/noise field, and focused panels. Keep backgrounds quiet enough for product evidence.
- Use a continuous transaction rail and persistent scene labels to create visual continuity.
- Prefer hard motivated cuts and 8–12-frame masked pushes. Use transitions only when the spatial layout changes.
- Use real product screenshots/clips at readable crop levels; never show a whole 4K page shrunk into the frame.
- Add restrained lower-third phrase captions only where product UI is not carrying dense text. Captions remain above every overlay.

## Sound plan

- Andrew WAV is the locked dialogue master at 48 kHz mono, approximately -16 LUFS and -1 dBTP.
- Add a minimal, license-safe electronic underscore with no melody competing with speech. Target roughly -28 to -24 LUFS beneath dialogue and duck under dense phrases.
- Use six purposeful effects only: intent launch, guard close, constraint locks, replay denial, Arbitrum network reveal, and settled receipt. Avoid trailer booms and constant UI clicks.
- Final mix target: dialogue remains dominant; integrated master around -14 to -16 LUFS with true peak at or below -1 dBTP.

## Evidence rules

- Label Failure Lab visuals as simulations.
- Label the contract deployment and external-wallet settlement as separate proof paths.
- Show only exact values from repository evidence.
- Do not use the Cloudflare-blocked Arbiscan capture.
- Do not claim the 0.01 USDC transaction traversed the execution hook.
- Keep the public proof URL visible long enough to read and verify.
- Scope `NO SIGN-IN` only to the public marketing proof page. PreBroadcast operator replay is authenticated.

## Implementation sequence after approval

1. Sync Andrew as the hero master and rebuild the composition duration from its 2526-frame metadata.
2. Replace the motion tokens and scene shell; add the reusable cinematic layout primitives.
3. Rebuild five narration chapters as one continuous spatial system.
4. Integrate the Failure Lab, hook evidence, and proof footage with readable crops.
5. Add restrained captions, score, and effects; mix beneath Andrew.
6. Render a half-resolution review, inspect start/end and every scene boundary, then render the 1080p final.
7. Verify duration, A/V sync, legibility, loudness, true peak, and claim accuracy before delivery.

## Acceptance gate

- A judge understands the problem and product within 15 seconds.
- Working product appears before 30 seconds.
- All four published qualitative criteria receive an explicit visual proof point.
- Arbitrum deployment and the separate settlement evidence cannot be confused.
- No critical text is too small at 1080p or in an embedded player.
- The final frame gives one memorable category statement and two verifiable destinations.
