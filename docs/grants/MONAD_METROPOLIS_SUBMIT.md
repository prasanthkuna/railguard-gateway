# Monad Metropolis — submission pack

**Deadline:** **13 Oct 2026** (build window 1 Sep–13 Oct) · **Judging:** 14–27 Oct · **Winners:** 3 Nov  
**Portal:** [hackathon.monad.xyz](https://hackathon.monad.xyz/) · **Program:** [monad.xyz/metropolis](https://www.monad.xyz/developers/hackathons/metropolis)  
**Prize pool:** $250K+ (four tracks × $30K each + grand champion + sponsor bounties) · **Fee:** none stated

## Link check (2026-10-04)

| URL | Global (official) | Your network (Excitel) |
| --- | --- | --- |
| [hackathon.monad.xyz](https://hackathon.monad.xyz/) | **Up** — sign-in / register portal | **Blocked** — DNS → `domain.block.excitel.in` |
| [monad.xyz/metropolis](https://www.monad.xyz/developers/hackathons/metropolis) | **Up** — program + tracks + FAQ | **Blocked** (same DNS sinkhole) |
| [faucet.monad.xyz](https://faucet.monad.xyz) | Official MON faucet | **Likely blocked** (same domain) |
| [docs.monad.xyz](https://docs.monad.xyz/developer-essentials/testnets) | RPC list + chain 10143 | **Likely blocked** |
| [risein.com/.../monad-metropolis](https://www.risein.com/monad/monad-metropolis-hackathon) | Mirror / aggregator (deadline Oct 12 on page) | **Unreachable** from here (timeout) |
| [railguard-site …/ecosystems/monad](https://railguard-site.vercel.app/ecosystems/monad) | Your slice | **200 OK** |
| GitHub submit pack (this file) | Always use when Monad sites fail | **200 OK** |

**Verdict:** URLs are correct; **ISP DNS is blocking `*.monad.xyz`**, not a dead hackathon. Same class of problem as Airwallex if their portal is blocked on your line.

### Unblock portal (pick one before register / faucet)

1. **DNS:** Set Windows adapter DNS to **1.1.1.1** and **1.0.0.1** (Cloudflare) or **8.8.8.8**, then `ipconfig /flushdns`. Re-test: `Resolve-DnsName hackathon.monad.xyz` should **not** show `excitel.in`.
2. **VPN** or **mobile hotspot** (different ISP) — open [hackathon.monad.xyz](https://hackathon.monad.xyz/) and complete GitHub/Google login once.
3. **Do not wait on “broken links”** — engineering can continue offline via repo + Ankr/Monadinfra RPC (see below).

Official submit still goes through **hackathon.monad.xyz** (Metropolis “Apply” buttons point there). Rise In is informational only unless Monad redirects you there.

## Recommended track

**Trust, Identity & AI Infrastructure** — policy-bound agent payments, observe/reconcile, APF failure taxonomy.  
Secondary narrative: **Consumer Products & Payments** (USDC settlement-verify on Monad testnet).

## What judges expect (official)

Working product + **public project profile**: demo, short write-up, **link to public code**. Work shown on 13 Oct should be **built during the build window** (existing product OK if new work is visible).

## Railguard proof story (mirror Arbitrum / Stellar)

| Layer | Asset |
| --- | --- |
| Product | https://railguard-site.vercel.app |
| Ecosystem | https://railguard-site.vercel.app/ecosystems/monad |
| Code | `monad-testnet` in `packages/settlement/src/chains.ts` + `settlementVerifyRail` |
| On-chain | USDC transfer on **Monad testnet** (chain **10143**), verified read-only |
| Reproduce | `bun run monad-testnet-evidence` → `evidence/monad-testnet/manifest.json` |
| Verify pack | `bun run verify-monad-metropolis-pack` |
| Public proof | https://railguard-site.vercel.app/proof/monad-testnet |

## Engineering checklist

- [x] Chain registry + fallback RPCs (Ankr / Monadinfra — QuickNode URL often times out)
- [x] `packages/settlement/src/monad-testnet.ts` + `bun run monad-testnet-evidence`
- [x] Builder-wallet testnet USDC tx: `0x1cbd46100de39c60d88d8d7ee7a1dc66cf2c9c16956ebb403b69c1751b98aab2`
- [x] Generate `evidence/monad-testnet/manifest.json` with `ok: true` / `CONFIRMED`
- [x] Public proof page + ecosystem card → `/proof/monad-testnet` (deployed)
- [ ] Hackathon profile: demo video or Loom, GitHub link, 1-paragraph write-up

## Generate evidence (PowerShell)

1. Add Monad testnet to wallet (chain ID **10143**). RPC (try in order): `https://rpc.ankr.com/monad_testnet` · `https://rpc-testnet.monadinfra.com` · `https://monad-testnet.drpc.org`
2. Faucet MON for gas: https://faucet.monad.xyz — **requires unblocked DNS/VPN**; or fund wallet from a builder who can reach the faucet.
3. Get test USDC from Circle's official faucet: https://faucet.circle.com/ — select **Monad Testnet** and send it to the proof wallet. Do not call `mintFaucet()` directly on the token contract; that path can revert and still consume gas.
4. The completed proof sent **1 USDC** (1000000 base units, 6 decimals) on testnet USDC `0x534b2f3A21130d7a60830c2Df862319e593943A3`.
5. Run:

```powershell
cd railguard-gateway
$env:MONAD_TESTNET_TX_HASH="0x1cbd46100de39c60d88d8d7ee7a1dc66cf2c9c16956ebb403b69c1751b98aab2"
$env:MONAD_TESTNET_SENDER="0x9a3f50804306fDB12046243bDF2dB33D61dcBA2d"
$env:MONAD_TESTNET_RECIPIENT="0x8c7e2543aa8bf69dc8458Dc28104234f6a334233"
$env:MONAD_TESTNET_AMOUNT="1000000"
bun run monad-testnet-evidence
bun run verify-monad-metropolis-pack
```

Optional: `$env:MONAD_TESTNET_RPC_URL="https://rpc-testnet.monadinfra.com"`

## Portal submission fields (draft)

| Field | Suggested value |
| --- | --- |
| Project name | Railguard |
| Tagline | Policy-bound settlement for agentic payments |
| Repo | https://github.com/prasanthkuna/railguard-gateway |
| Live demo | https://railguard-site.vercel.app/ecosystems/monad |
| On-chain proof | Explorer link from manifest + `bun run monad-testnet-evidence` |
| Track | Trust, Identity & AI Infrastructure |

## Registration status

- [x] Portal reachable with **VPN** (Excitel still DNS-blocks `*.monad.xyz` without VPN/DNS fix)
- [ ] Paste all fields from **[MONAD_METROPOLIS_PORTAL_PASTE.md](./MONAD_METROPOLIS_PORTAL_PASTE.md)** into hackathon profile
- [ ] Create **public project profile** before 13 Oct
- [ ] Final submit on portal by deadline

**Paste doc:** [MONAD_METROPOLIS_PORTAL_PASTE.md](./MONAD_METROPOLIS_PORTAL_PASTE.md)

## Days left (from 2026-10-04)

~9 days to submission — prioritize **one USDC evidence tx** + **portal profile** this week.
