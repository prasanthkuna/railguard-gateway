# Railguard components

One product. These repositories are **parts**, not separate companies.

| Component | Repository | Lifecycle stages |
|-----------|------------|------------------|
| **Railguard Core** | [railguard-protocol](https://github.com/prasanthkuna/railguard-protocol) | Intent model, policy, optional SignGate + on-chain ENFORCE |
| **Railguard Gateway** | [railguard-cdp](https://github.com/prasanthkuna/railguard-cdp) | Authorize, Reserve, Execute, Observe, Reconcile, Evidence (reference runtime) |
| **Failure Lab** | [agent-payment-failure-lab](https://github.com/prasanthkuna/agent-payment-failure-lab) | Adversarial testing; owns [Failure Atlas](https://github.com/prasanthkuna/agent-payment-failure-lab/tree/main/atlas) |
| **x402 adapter** | [x402-guard](https://github.com/prasanthkuna/x402-guard) | Pre-sign policy integration |
| **Marketing site** | `apps/site` | Public positioning, ecosystems, `/r/:id` share links |
| **Operator console** | `apps/operator` | Reference UI for demos/grants (not the public brand) |

## Public architecture (what runs today)

```text
Agent / CLI / MCP
        ↓
   Railguard SDK  —  check() · authorize() · execute() · verify()
        ↓
   Gateway (Encore / TypeScript)  —  staging: staging-railguard-s4ii.encr.app
        ↓
   Policy + reservation + execution (e.g. CDP on Base Sepolia testnet)
        ↓
   Observe + reconcile + evidence
        ↓
   Receipt / verify

Optional: SignGate + hook (railguard-protocol) for ENFORCE mode
```

Failure Lab attacks the full stack. Ecosystem adapters are thin edges — see [ecosystems.yaml](./ecosystems.yaml).
