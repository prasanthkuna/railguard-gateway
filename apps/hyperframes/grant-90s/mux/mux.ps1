param(
  [string]$HfRender = "..\out\grant-90s-hf.mp4",
  [string]$Out = "..\..\..\media\grant\arbitrum-open-house-2026-master.mp4"
)

$ErrorActionPreference = "Stop"
$MuxDir = $PSScriptRoot
$Captures = Join-Path (Split-Path (Split-Path $MuxDir -Parent) -Parent) "captures"

if (-not (Test-Path $HfRender)) {
  Write-Error "Render HyperFrames first: cd grant-90s; npm run render — expected $HfRender"
}

New-Item -ItemType Directory -Force -Path (Split-Path $Out -Parent) | Out-Null

# Simple concat when captures exist; otherwise copy HF-only master
$captureFiles = @(
  (Join-Path $Captures "attack-apf.mp4"),
  (Join-Path $Captures "operator-settled.mp4"),
  (Join-Path $Captures "arbiscan-tx.mp4")
) | Where-Object { Test-Path $_ }

if ($captureFiles.Count -eq 0) {
  Write-Host "No captures yet — copying HF render to master (add captures/ for final mux)." -ForegroundColor Yellow
  Copy-Item $HfRender $Out -Force
  Write-Host "Output: $Out"
  exit 0
}

$listFile = Join-Path $MuxDir "concat.txt"
$lines = @("file '$((Resolve-Path $HfRender).Path)'")
foreach ($c in $captureFiles) {
  $lines += "file '$((Resolve-Path $c).Path)'"
}
$lines | Set-Content -Path $listFile -Encoding utf8

ffmpeg -y -f concat -safe 0 -i $listFile -c copy $Out
Write-Host "Muxed master: $Out" -ForegroundColor Green
