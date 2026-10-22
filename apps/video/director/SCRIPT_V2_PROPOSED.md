# Arbitrum submission narration — proposed v2

**Status:** Editorial draft for approval; do not synthesize or retime video yet.  
**Target:** 82–88 seconds including proof holds and the final lockup.  
**Intent:** Clear, technically honest, judge-facing narration with real product and proof on screen.

## Narration

Giving an agent a wallet is easy. Giving it financial authority safely is not.

Railguard sits between agent intent and the wallet. Before signing, it binds authorization to network, token, recipient, amount, and budget. It reserves spend, tracks broadcast state, verifies settlement, reconciles uncertainty, and emits evidence.

The Failure Lab tests six classes: replay, budget race, crash after broadcast, settlement mismatch, stale authorization, and policy bypass. Unsafe requests are blocked before broadcast. Ambiguous transactions are observed and reconciled instead of being guessed successful or failed.

On Arbitrum Sepolia, we deployed Railguard’s execution-hook contracts. Separately, an external wallet sent zero point zero one USDC. Railguard matched the chain, token, recipient, and amount. The transfer was confirmed, the execution recorded as settled, and the proof is public—no sign-in required.

Railguard is open source and testnet-first. Failure-safe money movement for agents, built on Arbitrum.

## Performance direction

- Calm infrastructure engineer, conversational rather than trailer-like.
- Read complete thoughts; do not synthesize lifecycle verbs as separate two-second files.
- Slight lift on “six explicit failure classes”; firm downward finish on “settled.”
- Brief pause after “Separately” so the hook deployment and external-wallet proof cannot be conflated.
- Read “USDC” naturally as the initialism; audition pronunciation before rendering the full take.
- Leave the longest holds after the Failure Lab outcome, the confirmed transaction, and the final URL—not between every sentence.

## Required on-screen qualifications

- Failure Lab: **CLIENT-SIDE SIMULATION · APF-001–006**
- Hook: **ARBITRUM SEPOLIA DEPLOYMENT · SEPARATE PROOF**
- Wallet settlement: **EXTERNAL-WALLET TEST · 0.01 USDC · TRANSACTION CONFIRMED**
- Application state: **EXECUTION SETTLED AFTER MATCHING CHAIN, TOKEN, RECIPIENT, AND AMOUNT**
- Close: **OPEN SOURCE · V0.1 ALPHA · TESTNET-FIRST**

