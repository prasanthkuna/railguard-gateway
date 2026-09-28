# Railguard Gateway monorepo layout

Local folder: **`railguard-gateway/`** (GitHub: `railguard-cdp` → `railguard-gateway`).

```text
railguard-gateway/
├── apps/
│   ├── api/          Encore Gateway
│   ├── web/          Operator console (reference UI)
│   └── demo-agent/
├── packages/
│   ├── kernel/       FinancialIntent, lifecycle, evidence
│   ├── sdk/          check(), authorize, execute, verify
│   ├── cli/
│   ├── integrations/
│   ├── settlement/
│   └── mcp/
├── evidence/         Testnet proofs (gitignored blobs; manifests in-repo where needed)
├── docs/ecosystems.yaml   Grant / ecosystem manifest (tracked)
└── docs/
```

Sibling repos (not merged): **railguard-protocol**, **agent-payment-failure-lab**, **x402-guard**.

Workspace index: [../../WORKSPACE.md](../../WORKSPACE.md) · Charter: [../../plan28.1-EXECUTION.md](../../plan28.1-EXECUTION.md).
