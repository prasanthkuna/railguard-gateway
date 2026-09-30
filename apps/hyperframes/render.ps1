param(
    [ValidateSet("grant-90s")]
    [string]$Profile = "grant-90s",
    [string]$HyperFramesCli = "hyperframes"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$OutDir = Join-Path $Root "media\grant"
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

Write-Host "HyperFrames profile: $Profile" -ForegroundColor Cyan
Write-Host "Install HyperFrames CLI and add scenes under apps/hyperframes/scenes/ before running." -ForegroundColor Yellow

if (-not (Get-Command $HyperFramesCli -ErrorAction SilentlyContinue)) {
    Write-Error "HyperFrames CLI not found. See docs/media/HYPERFRAMES_PIPELINE.md"
}

$Master = Join-Path $OutDir "arbitrum-open-house-2026-master.mp4"
Write-Host "Target output: $Master" -ForegroundColor Green
# Example after scenes exist:
# & $HyperFramesCli render --config ./scenes/grant-90s.json --out $OutDir
Write-Host "Wire scene config and FFmpeg concat in this script after HyperFrames project is authored."
