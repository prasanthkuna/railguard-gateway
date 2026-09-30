# Quick sample: ~35s HyperFrames + Kokoro TTS (local)
$ErrorActionPreference = "Stop"
$Project = Join-Path $PSScriptRoot "..\grant-90s"
$RepoRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$Out = Join-Path $RepoRoot "media\grant\railguard-sample-with-voice.mp4"

Push-Location $Project
try {
  if (-not (Test-Path "assets\vo-sample.wav")) {
    Write-Host "Generating TTS (requires: pip install kokoro-onnx soundfile)..." -ForegroundColor Cyan
    npx hyperframes tts assets/vo-sample.txt -o assets/vo-sample.wav -v am_adam
  }
  npx hyperframes render -c sample-index.html -o out/sample-vo-preview.mp4 -q draft --fps 24
  New-Item -ItemType Directory -Force -Path (Split-Path $Out -Parent) | Out-Null
  ffmpeg -y -i out/sample-vo-preview.mp4 -i assets/vo-sample.wav `
    -c:v libx264 -crf 18 -c:a aac -b:a 192k -map 0:v:0 -map 1:a:0 -shortest $Out
  Write-Host "Done: $Out" -ForegroundColor Green
  Start-Process $Out
} finally {
  Pop-Location
}
