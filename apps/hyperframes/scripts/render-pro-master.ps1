# Pro ~90s master: UI captures + HyperFrames + Edge VO + optional captions burn-in
$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$Project = Join-Path $PSScriptRoot "..\grant-90s"
$Captures = Join-Path $Project "assets\screens"
$Master = Join-Path $RepoRoot "media\grant\arbitrum-open-house-2026-master.mp4"

Push-Location $RepoRoot
try {
  Write-Host "1/4 Screen captures (Playwright)..." -ForegroundColor Cyan
  $env:RAILGUARD_SITE_URL = if ($env:RAILGUARD_SITE_URL) { $env:RAILGUARD_SITE_URL } else { "https://railguard-site.vercel.app" }
  bun run capture:hyperframes
} finally {
  Pop-Location
}

Push-Location $Project
try {
  Write-Host "2/4 Pro voice (Edge SSML)..." -ForegroundColor Cyan
  & (Join-Path $PSScriptRoot "generate-vo-pro.ps1")

  Write-Host "3/4 HyperFrames render (master-index, production quality)..." -ForegroundColor Cyan
  if (-not (Test-Path "assets\screens\home-hero.png")) {
    Write-Warning "Missing screenshots — master-index will show broken images until capture succeeds."
  }
  npx --yes hyperframes@0.8.98 render -c master-index.html -o out/grant-90s-hf.mp4 -q production --fps 30

  Write-Host "4/4 Mux VO + normalize audio..." -ForegroundColor Cyan
  New-Item -ItemType Directory -Force -Path (Split-Path $Master -Parent) | Out-Null
  $Hf = "out\grant-90s-hf.mp4"
  $Vo = "assets\vo-full.wav"
  $Mux = "out\grant-90s-master-mux.mp4"

  $VoDur = [double](ffprobe -v error -show_entries format=duration -of csv=p=0 $Vo)
  $VidDur = [double](ffprobe -v error -show_entries format=duration -of csv=p=0 $Hf)
  $Target = [Math]::Max($VidDur, $VoDur)
  Write-Host "Video ${VidDur}s · VO ${VoDur}s · mux target ${Target}s" -ForegroundColor DarkGray

  ffmpeg -y -i $Hf -i $Vo `
    -filter_complex "[1:a]loudnorm=I=-16:TP=-1.5:LRA=11[a];[0:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,trim=duration=$Target,setpts=PTS-STARTPTS[v];[a]atrim=duration=$Target,asetpts=PTS-STARTPTS[aout]" `
    -map "[v]" -map "[aout]" -c:v libx264 -crf 18 -preset medium -c:a aac -b:a 192k $Mux

  Copy-Item $Mux $Master -Force
  Write-Host "Master: $Master" -ForegroundColor Green
  Start-Process $Master
} finally {
  Pop-Location
}
