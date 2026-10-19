> [!IMPORTANT]
> This file covers the **previous Arc Microgrants round that closed on 14 Oct 2026**. For the active **Arc Microgrants: Built with Arc Studio** round closing **1 Nov 2026**, use [ARC_STUDIO_MICROGRANT_SUBMIT.md](./ARC_STUDIO_MICROGRANT_SUBMIT.md) and [ARC_STUDIO_BUILD_PROMPT.md](./ARC_STUDIO_BUILD_PROMPT.md).

# Arc Microgrant — submission pack

**Deadline:** **14 Oct 2026, 23:59 ET**  
**Event:** [Arc Microgrants](https://community.arc.io/public/events/arc-microgrants-f8tijfjhyq)  
**Fee:** none stated

## Eligibility (critical)

Microgrant requires **live Arc mainnet** (chain **5042**), **public repo**, and a small amount of **USDC for gas** — not testnet-only evidence.

| Check | Status |
| --- | --- |
| Registered on Arc House / event | **Done** (user) |
| Application submitted | **Not yet** |
| Arc **mainnet** deploy + proof | **Not done** — today only `bun run arc-testnet-evidence` (RPC ping) |

## What to submit when ready

| Asset | Notes |
| --- | --- |
| Live URL | Product or demo on Arc mainnet |
| Repo | https://github.com/prasanthkuna/railguard-gateway |
| Ecosystem | https://railguard-site.vercel.app/ecosystems/arc |
| Evidence | Mainnet settlement manifest (pattern: `arbitrum-one-evidence` / settlement verify on `arc`) |

## Engineering path

1. Fund Arc mainnet wallet (USDC + gas on chain 5042).
2. Deploy or verify USDC transfer / contract per grant brief.
3. Generate committed evidence under `evidence/arc/` (add gitignore whitelist when manifest exists).
4. Complete Arc House form with live links.

## RPC reference

- Mainnet: `https://rpc.mainnet.arc.io`
- Testnet (readiness only): `bun run arc-testnet-evidence`
