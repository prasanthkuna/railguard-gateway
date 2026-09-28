# Railguard Gateway

[![PR Checks](https://github.com/prasanthkuna/railguard-gateway/actions/workflows/pr-checks.yml/badge.svg)](https://github.com/prasanthkuna/railguard-gateway/actions/workflows/pr-checks.yml)
[![Testnet Evidence](https://github.com/prasanthkuna/railguard-gateway/actions/workflows/testnet-evidence.yml/badge.svg)](https://github.com/prasanthkuna/railguard-gateway/actions/workflows/testnet-evidence.yml)

> **Open-source financial execution firewall for autonomous software.**  
> Agent money. Guarded.

**Railguard Gateway** is the reference runtime: API, policy, reservation, execution, reconciliation, and evidence.  
GitHub: **`prasanthkuna/railguard-gateway`**. Clone into folder **`railguard-gateway/`**.

| Surface | URL |
|---------|-----|
| Staging API | https://staging-railguard-s4ii.encr.app |
| Operator console (reference) | https://prebroadcast.vercel.app |
| Reviewer pack | https://prebroadcast.vercel.app/zebpay |

**Maturity:** `v0.1.0-alpha` — testnet reference implementation. Not production-ready for mainnet funds.

## Lifecycle

```text
Financial Intent → Authorize → Reserve → Execute → Observe → Reconcile → Evidence
```

## Components

See [docs/COMPONENTS.md](./docs/COMPONENTS.md) — Core (protocol), Gateway (this repo), Failure Lab, x402 adapter.

## Quick start (Windows)

```powershell
git clone https://github.com/prasanthkuna/railguard-gateway.git
cd railguard-gateway
bun install
bun run dev:api    # Encore :4000
bun run dev:web    # Operator console :3000
```

## CLI (public vocabulary)

```powershell
bun run railguard scan      # configuration & posture
bun run railguard attack    # Failure Lab adversarial profiles
bun run railguard protect   # enable / compare protection
bun run railguard status    # execution metrics
bun run railguard receipts  # verify & evidence
```

Advanced: `doctor`, `verify`, `inject`, `lab`, MCP — [docs/INTEGRATION.md](./docs/INTEGRATION.md).

## SDK

```ts
import { RailguardClient, check, createClientFromEnv } from "@railguard/sdk"

const client = new RailguardClient(createClientFromEnv())
const decision = await check(client, intent)
```

## Tests

```powershell
bun run test:v5
bun run test:integrations
bun run testnet:all
encore check
```

## Docs

| Doc | Purpose |
|-----|---------|
| [ARCHITECTURE.md](./docs/ARCHITECTURE.md) | Lifecycle + deployed stack |
| [COMPONENTS.md](./docs/COMPONENTS.md) | Repo map |
| [INTEGRATION.md](./docs/INTEGRATION.md) | CLI, MCP, SDK |
| [docs/ecosystems.yaml](./docs/ecosystems.yaml) | Grant / ecosystem manifest |

## Sibling repos

| Repo | Role |
|------|------|
| [railguard-protocol](https://github.com/prasanthkuna/railguard-protocol) | Core + SignGate + contracts |
| [agent-payment-failure-lab](https://github.com/prasanthkuna/agent-payment-failure-lab) | Failure Lab + Failure Atlas |
| [x402-guard](https://github.com/prasanthkuna/x402-guard) | x402 adapter |

## License

Apache-2.0
