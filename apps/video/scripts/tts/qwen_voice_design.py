#!/usr/bin/env python3
"""Generate one WAV with Qwen3 VoiceDesign. Requires: install-vo-tools.ps1 -Heavy"""
import argparse
import os
from pathlib import Path

import soundfile as sf
import torch
from qwen_tts import Qwen3TTSModel

ROOT = Path(__file__).resolve().parents[2]
MODELS = ROOT / "models"
DEFAULT_MODEL = os.environ.get(
    "QWEN_TTS_MODEL",
    "Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign",
)
INSTRUCT = os.environ.get(
    "RAILGUARD_VOICE_INSTRUCT",
    (
        "Male English narrator, early 30s, low-mid pitch, close-mic studio. "
        "Calm technical authority, understated, infrastructure engineer tone. "
        "Not advertising, trailer, or explainer. Sentence endings fall slightly."
    ),
)


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--text", required=True)
    p.add_argument("--out", type=Path, required=True)
    p.add_argument("--language", default="English")
    p.add_argument("--instruct", default=INSTRUCT)
    p.add_argument("--model", default=DEFAULT_MODEL)
    args = p.parse_args()

    device = "cuda:0" if torch.cuda.is_available() else "cpu"
    dtype = torch.bfloat16 if device.startswith("cuda") else torch.float32
    attn = "flash_attention_2" if device.startswith("cuda") else None

    local = MODELS / Path(args.model).name
    model_id = str(local) if local.is_dir() else args.model

    kwargs = {"device_map": device, "dtype": dtype}
    if attn:
        kwargs["attn_implementation"] = attn

    model = Qwen3TTSModel.from_pretrained(model_id, **kwargs)
    wavs, sr = model.generate_voice_design(
        text=args.text,
        language=args.language,
        instruct=args.instruct,
    )
    args.out.parent.mkdir(parents=True, exist_ok=True)
    sf.write(str(args.out), wavs[0], sr)
    print(f"wrote {args.out}")


if __name__ == "__main__":
    main()
