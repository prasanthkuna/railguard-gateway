# @railguard/cli

CLI for the Railguard Gateway (v0.1.0-alpha).

## Install (monorepo)

```powershell
cd c:\Users\PrashanthKuna\personal\web3\railguard-gateway
bun install
```

## Public commands

```powershell
$env:RAILGUARD_ACCESS_TOKEN = "<token>"
$env:RAILGUARD_BASE_URL = "https://staging-railguard-s4ii.encr.app"

bun run railguard scan
bun run railguard attack
bun run railguard protect
bun run railguard status
bun run railguard receipts <executionId>
```

Aliases `doctor`, `lab`, `metrics`, and `verify` remain for scripts and CI.
