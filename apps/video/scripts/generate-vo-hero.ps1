$ErrorActionPreference = "Stop"
$GatewayRoot = Join-Path $PSScriptRoot "..\..\.."
Push-Location $GatewayRoot
try {
  bun run apps/video/scripts/generate-vo-hero.ts
} finally {
  Pop-Location
}
