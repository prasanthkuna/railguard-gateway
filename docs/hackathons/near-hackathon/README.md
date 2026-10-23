# NEAR HACKATHON: AI Security & Defense (Railguard), scaffold for the Nov 1-14 window

**Status:** design and scaffold only. **No NEAR code is written before Nov 1.**

**Rules re-checked Oct 24, 2026** at <https://nearhackathon.com/> and
<https://nearhackathon.com/HACKATHON.md>:

- Development runs **Nov 1 00:00 UTC to Nov 14 23:59 UTC**, which is **Nov 1 05:30 IST to Nov 15 05:29 IST**.
  Judging is Nov 16-18 and results come by Nov 18.
- Step 01 of the official flow is "**Build your project during the hackathon**." We respect that: the
  NEAR rail, the guard contract and the demo are written only inside the window. This folder holds
  only the design, the file plan and a draft of the submission text.
- No sign-up. **One** submission per team, through the form or `POST /api/applications`, only
  between Nov 1 and Nov 14 23:59 UTC. A submission **cannot be edited**, and a second one with the
  same name or email is rejected.
- Needs a **public repo** and a **public X demo post** that says it was built at NEAR HACKATHON,
  with a video or screenshots. Prize payout goes to a **NEAR mainnet account** (a named account or
  a 64-char implicit one). Prasanth creates that account himself. It is only an address, and no
  transaction is needed.
- Judges: Helius and Electric Capital, plus **Claude Code and Codex as AI judges**. Write the README
  for a machine reader too: what it is, the problem, and "do X, see Y" steps. No marketing.
- Prize per track: 1st $10K, 2nd $3K, 3rd $2K, paid in NEAR. The grand prize is $55K.

**Tracks to tick:** `security` (06, AI Security & Defense: "spending limits, policy engines,
sandboxed wallets"; hints FUNCTION CALL KEYS, TEE ATTESTATION) and `agents` (07, Agent Economy).

- Design: [DESIGN.md](./DESIGN.md)
- Submission draft and payload template: [SUBMISSION.md](./SUBMISSION.md)
- Code folder (empty until Nov 1): [packages/rails/near/](../../../packages/rails/near/README.md)

## Only Prasanth can do

1. Create a **NEAR testnet account** for the demo (e.g. via MyNearWallet or Meteor testnet) and fund
   it from the testnet faucet. Keep the key in `~/.near-credentials`, outside the repo.
2. Create or choose a **NEAR mainnet account** for the prize payout. It is only an address, so no
   funds are needed.
3. Record the demo and **publish the X post** (it must say "built at NEAR HACKATHON").
4. Approve the exact JSON payload before it is sent once, between Nov 1 and Nov 14 23:59 UTC
   (target **Nov 14, 8:00 PM IST**).

Env var names the window code will use: `NEAR_TESTNET_ACCOUNT_ID`, `NEAR_TESTNET_CREDENTIALS_PATH`
(key file path, never the key), `NEAR_TESTNET_RPC_URL` (default `https://rpc.testnet.near.org`),
`NEAR_GUARD_CONTRACT_ID`, `NEAR_TESTNET_USDC_CONTRACT`.
