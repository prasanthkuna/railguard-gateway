# VO toolchain (local install)

## One-time setup

```powershell
cd c:\Users\PrasanthKuna\personal\web3\railguard-gateway
bun run video:vo:install
```

This creates **four isolated Python venvs** (transformers version conflicts if merged):

| Venv | Packages |
| --- | --- |
| `apps/video/.venv-vo` | edge-tts, deepfilternet, huggingface_hub |
| `apps/video/.venv-vo-qwen` | qwen-tts (VoiceDesign) |
| `apps/video/.venv-vo-chatterbox` | chatterbox-tts |
| `apps/video/.venv-vo-kokoro` | kokoro (draft only) |

Core-only (no GPU stacks):

```powershell
powershell -File apps/video/scripts/install-vo-tools.ps1 -Fresh
```

## Download model weights (large)

```powershell
bun run video:vo:models
# or full VoiceDesign 1.7B:
apps\video\.venv-vo\Scripts\hf.exe download Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign --local-dir apps\video\models\Qwen3-TTS-12Hz-1.7B-VoiceDesign
```

## Run scripts

```powershell
# Qwen VoiceDesign take
apps\video\.venv-vo-qwen\Scripts\python.exe apps\video\scripts\tts\qwen_voice_design.py `
  --text "Giving an agent a wallet is easy." `
  --out apps\video\public\vo\takes\01_hook_A.wav

# Clean your phone reference
apps\video\.venv-vo\Scripts\python.exe apps\video\scripts\tts\clean_human.py `
  --in reference.m4a --out apps\video\public\vo\reference-clean.wav
```

## System tools (already present)

- **ffmpeg** — mix/master
- **edge-tts** — global CLI OK; venv copy used by `bun run video:vo`

## Optional GUI

```powershell
powershell -File apps/video/scripts/install-vo-tools.ps1 -Audacity
```

## CPU note

This machine has **PyTorch CPU**. Qwen 1.7B VoiceDesign is slow without CUDA; use short A/B lines first or Edge takes while iterating.
