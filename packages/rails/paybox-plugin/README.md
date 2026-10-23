# railguard-guard: a PayBox (MoonPay) plugin that checks x402 payments before proposing them

Built from the official PayBox plugin starter v1.0.2 (`starter-version.json`). It is a stdio MCP
server bundled to one file, `dist/plugin.mjs`. **The plugin never pays and never holds keys.**
It returns a proposal (`io.paybox/transactionProposal`), and PayBox asks the user to approve and
sign.

## Tools

| Tool | Read-only | What |
|------|-----------|------|
| `railguard_policy` | yes | Shows the allowed hosts and the per-call cap |
| `check_paid_request` | yes | Fetches the unpaid 402 quote and returns ALLOW or DENY with a code. Never pays |
| `propose_guarded_paid_request` | no | Same check, then `proposeX402` for **exactly** the quoted amount. On DENY it returns an error and proposes nothing |

Deny codes: `HOST_NOT_ALLOWED`, `NOT_A_402`, `NO_BASE_USDC_OPTION`, `OVER_PER_CALL_CAP`,
`PAYEE_MISMATCH`, `QUOTE_INVALID`. The host check uses the exact hostname, so look-alike hosts
fail.

## Config (set as plugin secrets/env in PayBox)

| Env var | Default | What |
|---------|---------|------|
| `RAILGUARD_ALLOWED_HOSTS` | empty, so everything is denied | Comma-separated hostnames |
| `RAILGUARD_PER_CALL_CAP_ATOMIC` | `100000` (0.10 USDC) | Max per paid request, in atomic USDC |

## Build and test

Needs Node 24 and pnpm 11.11.0 (as the starter requires).

```bash
cd packages/rails/paybox-plugin
pnpm install --frozen-lockfile
pnpm test            # typecheck + build + PayBox conformance (passed: 3 tools)
bun test packages/rails/paybox-plugin   # from repo root: guard unit tests
```

Upload `dist/plugin.mjs` in PayBox. Note: PayBox x402 payments are **Base mainnet USDC**
(real money). This repo does not make any such payment. A live run is done only by the owner
inside PayBox, after approving it there.
