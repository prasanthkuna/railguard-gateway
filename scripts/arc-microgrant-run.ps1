# Arc Microgrant — safe end-to-end (minimal spend). Requires .env.local keys — never commit.
# Usage:
#   cd railguard-gateway
#   .\scripts\arc-microgrant-run.ps1 -PreflightOnly
#   .\scripts\arc-microgrant-run.ps1 -ExecuteProof

param(
  [switch]$PreflightOnly,
  [switch]$ExecuteProof
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

Write-Host "=== Arc microgrant pipeline (5042) ===" -ForegroundColor Cyan

bun run arc-mainnet-preflight
if ($LASTEXITCODE -ne 0) {
  Write-Host @"

NOT FUNDED on Arc mainnet yet.

Minimal fund plan (keep most USDC in YOUR wallet):
  1. Add wallet to MetaMask/Rabby: Chain ID 5042, RPC https://rpc.mainnet.arc.io
  2. Bridge USDC via Circle CCTP (Standard = 0 protocol fee): https://developers.circle.com/cctp
     Recommended first bridge: 5-8 USDC (not 15 unless you want headroom)
  3. In .env.local (local only):
       ARC_MAINNET_PRIVATE_KEY=0x...
       ARC_MAINNET_RECIPIENT=0x...   # wallet YOU control (recover the 0.01 USDC proof)
  4. Re-run: .\scripts\arc-microgrant-run.ps1 -PreflightOnly

"@ -ForegroundColor Yellow
  exit 1
}

if ($PreflightOnly) {
  Write-Host "Preflight OK. To send 0.01 USDC proof: .\scripts\arc-microgrant-run.ps1 -ExecuteProof" -ForegroundColor Green
  exit 0
}

if (-not $ExecuteProof) {
  Write-Host "Pass -ExecuteProof to run the on-chain transfer (0.01 USDC + gas)." -ForegroundColor Yellow
  exit 0
}

$env:ARC_CONFIRM = "yes"
bun run arc-mainnet-usdc-proof
if ($LASTEXITCODE -ne 0) { exit 1 }

bun run sync-arc-public-proof
bun run verify-arc-microgrant-pack
Write-Host @"

NEXT (human):
  1. git add evidence/arc apps/site/lib/arc-public-proof.ts
  2. git commit && git push origin main
  3. Vercel redeploy site
  4. Submit: https://community.arc.io/public/events/arc-microgrants-f8tijfjhyq
  5. Paste from docs/grants/ARC_MICROGRANT_PORTAL_PASTE.md

"@ -ForegroundColor Green
