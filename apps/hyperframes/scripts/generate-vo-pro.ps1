# Pro VO: Edge neural TTS (not Kokoro dictation). Output WAV for ffmpeg mux.
param(
  [string]$OutWav = (Join-Path $PSScriptRoot "..\grant-90s\assets\vo-full.wav"),
  [string]$Ssml = (Join-Path $PSScriptRoot "..\grant-90s\assets\vo-full.ssml")
)

$ErrorActionPreference = "Stop"
$Mp3 = [System.IO.Path]::ChangeExtension($OutWav, ".mp3")

if (-not (Test-Path $Ssml)) { throw "Missing SSML: $Ssml" }

Write-Host "Edge TTS (AndrewMultilingual, slowed)..." -ForegroundColor Cyan
edge-tts --file $Ssml --write-media $Mp3 --write-subtitles (Join-Path (Split-Path $OutWav) "vo-full.vtt")

Write-Host "Convert to WAV 48kHz mono..." -ForegroundColor Cyan
ffmpeg -y -i $Mp3 -ar 48000 -ac 1 $OutWav
Remove-Item $Mp3 -ErrorAction SilentlyContinue

$dur = ffprobe -v error -show_entries format=duration -of csv=p=0 $OutWav
Write-Host "VO duration: $dur s -> $OutWav" -ForegroundColor Green
