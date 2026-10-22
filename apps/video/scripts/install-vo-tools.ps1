# Install local VO toolchain (separate venvs avoid transformers conflicts)
param(
  [switch]$Heavy,
  [switch]$DownloadModels,
  [switch]$Audacity,
  [switch]$Fresh
)

$ErrorActionPreference = "Stop"
$VideoRoot = Split-Path $PSScriptRoot -Parent
$ToolsDir = Join-Path $VideoRoot "tools"

function Install-Venv {
  param(
    [string]$Name,
    [string[]]$RequirementFiles,
    [switch]$SkipIfExists
  )
  $Venv = Join-Path $VideoRoot $Name
  $Py = Join-Path $Venv "Scripts\python.exe"
  $Pip = Join-Path $Venv "Scripts\pip.exe"

  if ($Fresh -and (Test-Path $Venv)) {
    Remove-Item -Recurse -Force $Venv
  }

  if (-not (Test-Path $Py)) {
    Write-Host "Creating $Name ..." -ForegroundColor Cyan
    python -m venv $Venv
    & $Py -m pip install --upgrade pip wheel setuptools
  } elseif ($SkipIfExists) {
    Write-Host "Skip $Name (exists). Pass -Fresh to rebuild." -ForegroundColor DarkGray
    return $Venv
  }

  foreach ($req in $RequirementFiles) {
    Write-Host "  pip install -r $(Split-Path $req -Leaf)" -ForegroundColor Yellow
    $null = & $Pip install -r $req
  }
  return ,$Venv
}

Write-Host "== Railguard VO tools ==" -ForegroundColor Cyan

$coreVenv = Install-Venv -Name ".venv-vo" -RequirementFiles @(
  (Join-Path $ToolsDir "requirements-vo-core.txt"),
  (Join-Path $ToolsDir "requirements-vo-cleanup.txt")
) -SkipIfExists:(-not $Fresh)
$corePip = Join-Path $coreVenv "Scripts\pip.exe"
Write-Host "Installing CPU torch/torchaudio (DeepFilterNet)..." -ForegroundColor Yellow
$null = & $corePip install -r (Join-Path $ToolsDir "requirements-vo-torch-cpu.txt")
if (-not (Get-Command sox -ErrorAction SilentlyContinue)) {
  Write-Host "Installing SoX (qwen-tts dependency) via winget..." -ForegroundColor Yellow
  winget install --id ChrisBagwell.SoX -e --accept-source-agreements --accept-package-agreements | Out-Null
}

if ($Heavy) {
  Install-Venv -Name ".venv-vo-qwen" -RequirementFiles @( (Join-Path $ToolsDir "requirements-vo-qwen.txt") ) -SkipIfExists:(-not $Fresh)
  Install-Venv -Name ".venv-vo-chatterbox" -RequirementFiles @( (Join-Path $ToolsDir "requirements-vo-chatterbox.txt") ) -SkipIfExists:(-not $Fresh)
  Install-Venv -Name ".venv-vo-kokoro" -RequirementFiles @( (Join-Path $ToolsDir "requirements-vo-kokoro.txt") ) -SkipIfExists:(-not $Fresh)
}

if ($DownloadModels) {
  $ModelsDir = Join-Path $VideoRoot "models"
  New-Item -ItemType Directory -Force -Path $ModelsDir | Out-Null
  $Hf = Join-Path $coreVenv "Scripts\hf.exe"
  if (-not (Test-Path $Hf)) {
    $Pip = Join-Path $coreVenv "Scripts\pip.exe"
    & $Pip install "huggingface_hub[cli]"
  }
  Write-Host "Downloading Qwen3 0.6B base (CPU-friendly)..." -ForegroundColor Yellow
  & $Hf download Qwen/Qwen3-TTS-12Hz-0.6B-Base --local-dir (Join-Path $ModelsDir "Qwen3-TTS-12Hz-0.6B-Base")
  Write-Host "Optional VoiceDesign 1.7B:" -ForegroundColor DarkGray
  Write-Host "  hf download Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign --local-dir $ModelsDir\Qwen3-TTS-12Hz-1.7B-VoiceDesign"
}

if ($Audacity) {
  winget install --id Audacity.Audacity -e --accept-source-agreements --accept-package-agreements
}

$corePy = Join-Path $coreVenv "Scripts\python.exe"
Write-Host "`nVerify core (.venv-vo):" -ForegroundColor Green
& (Join-Path $coreVenv "Scripts\edge-tts.exe") --version
& $corePy -c "from df.enhance import init_df; import soundfile; print('deepfilternet OK')"

if ($Heavy) {
  $qPy = Join-Path $VideoRoot ".venv-vo-qwen\Scripts\python.exe"
  $cPy = Join-Path $VideoRoot ".venv-vo-chatterbox\Scripts\python.exe"
  $kPy = Join-Path $VideoRoot ".venv-vo-kokoro\Scripts\python.exe"
  & $qPy -c "import qwen_tts; print('qwen-tts OK')"
  & $cPy -c "import chatterbox; print('chatterbox OK')"
  & $kPy -c "import kokoro; print('kokoro OK')"
}

Write-Host "`nVenvs under apps/video/" -ForegroundColor Cyan
Write-Host "  .venv-vo          edge-tts + deepfilternet"
if ($Heavy) {
  Write-Host "  .venv-vo-qwen     Qwen3 VoiceDesign"
  Write-Host "  .venv-vo-chatterbox"
  Write-Host "  .venv-vo-kokoro   draft takes"
}
Write-Host "Docs: apps/video/docs/VO_TOOLCHAIN.md"
