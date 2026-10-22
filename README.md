# Railguard Gateway

[![PR Checks](https://github.com/prasanthkuna/railguard-gateway/actions/workflows/pr-checks.yml/badge.svg)](https://github.com/prasanthkuna/railguard-gateway/actions/workflows/pr-checks.yml)
[![Testnet Evidence](https://github.com/prasanthkuna/railguard-gateway/actions/workflows/testnet-evidence.yml/badge.svg)](https://github.com/prasanthkuna/railguard-gateway/actions/workflows/testnet-evidence.yml)

> **Open-source financial execution firewall for autonomous software.**  
> Agent money. Guarded.

Railguard puts a control boundary between an AI agent and money movement. It binds authorization to the intended recipient, asset, amount, and network; reserves budget before execution; tracks uncertain broadcasts; reconciles settlement against chain facts; and emits inspectable evidence.

**Maturity:** `v0.1.0-alpha` - testnet reference implementation. Not production-ready for mainnet funds.

## Start here

| Surface | Link | Access |
| --- | --- | --- |
| Product | https://railguard-site.vercel.app/ | Public |
| Failure Lab | https://railguard-site.vercel.app/attack | Public |
| Arbitrum Sepolia proof | https://railguard-site.vercel.app/proof/arbitrum-sepolia | Public, no sign-in |
| Monad testnet proof | https://railguard-site.vercel.app/proof/monad-testnet | Public, no sign-in |
| Stellar testnet proof | https://railguard-site.vercel.app/proof/stellar-testnet | Public, no sign-in |
| 84-second product demo | https://youtu.be/L-Gss08bzR0 | Public |
| Railguard Operator | https://prebroadcast.vercel.app/ | Sign-in required |
| Staging API | https://staging-railguard-s4ii.encr.app | Reference API |

## Lifecycle

```text
Financial Intent
      ↓
Authorize
      ↓
Reserve
      ↓
Execute
      ↓
Observe
      ↓
Reconcile
      ↓
Evidence
```

Railguard treats a successful signature or transaction broadcast as **insufficient proof**. Final state comes from reconciliation against the expected transfer facts.

## Verified rails

| Rail | Current proof | Evidence |
| --- | --- | --- |
| Arbitrum Sepolia | Hook deployment + separate external-wallet 0.01 USDC settlement verification | [Public proof](https://railguard-site.vercel.app/proof/arbitrum-sepolia) |
| Monad testnet | External-wallet 1 USDC transfer matched from receipt logs | [Public proof](https://railguard-site.vercel.app/proof/monad-testnet) |
| Stellar testnet | Horizon-confirmed native payment | [Public proof](https://railguard-site.vercel.app/proof/stellar-testnet) |
| Base Sepolia / CDP | Reference execution path | [Integration docs](./docs/INTEGRATION.md) |

The public proof pages distinguish **what Railguard executed** from **what Railguard independently verified**. External-wallet proofs are not presented as Railguard-originated or custodial transfers.

## Core surfaces

| Component | Purpose |
| --- | --- |
| Gateway API | Authorize, reserve, execute, observe, reconcile, evidence |
| SDK | Programmatic `check()` and integration surface |
| CLI | `scan`, `attack`, `protect`, `status`, `receipts` |
| MCP | Agent/tool integration |
| Operator | Authenticated reference console |
| Failure Lab | Adversarial APF failure demonstrations |
| Public proof pages | No-login evidence for settlement claims |

## Quick start

```powershell
git clone https://github.com/prasanthkuna/railguard-gateway.git
cd railguard-gateway
bun install

bun run dev:api
bun run dev:operator
bun run dev:site
```

## CLI

```powershell
bun run railguard scan
bun run railguard attack
bun run railguard protect
bun run railguard status
bun run railguard receipts
```

Advanced commands and MCP integration: [docs/INTEGRATION.md](./docs/INTEGRATION.md).

## SDK

```ts
import { RailguardClient, check, createClientFromEnv } from "@railguard/sdk"

const client = new RailguardClient(createClientFromEnv())
const decision = await check(client, intent)
```

## Verification

```powershell
bun run test:v5
bun run test:integrations
bun run testnet:all
bun run verify-arbitrum-sepolia-pack
bun run verify-monad-metropolis-pack
bun run verify-stellar-testnet-pack
encore check
```

## Architecture and evidence

| Document | Purpose |
| --- | --- |
| [ARCHITECTURE.md](./docs/ARCHITECTURE.md) | Runtime and lifecycle |
| [COMPONENTS.md](./docs/COMPONENTS.md) | Product/repository map |
| [INTEGRATION.md](./docs/INTEGRATION.md) | SDK, CLI, MCP and integration paths |
| [ecosystems.yaml](./docs/ecosystems.yaml) | Public ecosystem manifest |
| [FINAL_VIDEO_QC.md](./docs/media/FINAL_VIDEO_QC.md) | Published demo and QC record |

## Related repositories

| Repository | Role |
| --- | --- |
| [railguard-protocol](https://github.com/prasanthkuna/railguard-protocol) | Core, SignGate and contracts |
| [agent-payment-failure-lab](https://github.com/prasanthkuna/agent-payment-failure-lab) | Failure Lab + Failure Atlas |
| [x402-guard](https://github.com/prasanthkuna/x402-guard) | x402 policy adapter |

## License

Apache-2.0
