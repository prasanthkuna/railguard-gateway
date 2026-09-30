param(
    [ValidateSet("grant-90s")]
    [string]$Profile = "grant-90s",
    [switch]$MuxCaptures
)

$ErrorActionPreference = "Stop"
$HyperframesRoot = $PSScriptRoot
$RepoRoot = Split-Path (Split-Path $HyperframesRoot -Parent) -Parent
$ProjectDir = Join-Path $HyperframesRoot $Profile
$OutDir = Join-Path $ProjectDir "out"
$MediaGrant = Join-Path $RepoRoot "media\grant"
New-Item -ItemType Directory -Force -Path $OutDir, $MediaGrant | Out-Null

if (-not (Test-Path (Join-Path $ProjectDir "index.html"))) {
    Write-Error "Missing $ProjectDir\index.html"
}

Push-Location $ProjectDir
try {
    Write-Host "HyperFrames check..." -ForegroundColor Cyan
    npm run check
    if ($LASTEXITCODE -ne 0) {
        Write-Error "hyperframes check failed - fix lint before render"
    }
    $HfMp4 = Join-Path $OutDir "$Profile-hf.mp4"
    Write-Host "Rendering $HfMp4 ..." -ForegroundColor Cyan
    npx --yes hyperframes@latest render --output $HfMp4
    if ($LASTEXITCODE -ne 0) { throw "hyperframes render failed" }
} finally {
    Pop-Location
}

$HfMp4 = Join-Path $OutDir "$Profile-hf.mp4"
$Master = Join-Path $MediaGrant "arbitrum-open-house-2026-master.mp4"

if ($MuxCaptures) {
    & (Join-Path $ProjectDir "mux\mux.ps1") -HfRender $HfMp4 -Out $Master
} else {
    Copy-Item $HfMp4 $Master -Force
    Write-Host "HF master: $Master" -ForegroundColor Green
    Write-Host 'Optional: add captures then re-run with -MuxCaptures' -ForegroundColor Yellow
}
