#!/usr/bin/env python3
"""DeepFilterNet cleanup for human reference recordings."""
import argparse
from pathlib import Path

import soundfile as sf
import torch
from df.enhance import enhance, init_df


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--in", dest="inp", type=Path, required=True)
    p.add_argument("--out", type=Path, required=True)
    args = p.parse_args()

    model, df_state, _ = init_df()
    audio, sr = sf.read(str(args.in))
    if audio.ndim > 1:
        audio = audio.mean(axis=1)
    enhanced = enhance(model, df_state, torch.from_numpy(audio).float(), sr)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    sf.write(str(args.out), enhanced.numpy(), sr)
    print(f"wrote {args.out}")


if __name__ == "__main__":
    main()
