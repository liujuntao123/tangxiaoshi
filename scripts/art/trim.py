#!/usr/bin/env python3
"""Trim transparent margins from game sprite/UI PNGs.

Auto-crops each image to the bounding box of pixels with alpha > 8,
keeping a small symmetric padding so edges never touch. Sizes stay
untouched for images that already fill their canvas. In place, overwrite:

    python3 scripts/art/trim.py            # sprites + ui
    python3 scripts/art/trim.py --check    # only report, no write
"""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
DIRS = ["public/sprites", "public/ui"]
ALPHA_THRESHOLD = 8
PAD_RATIO = 0.02  # keep ~2% padding on each side after crop


def trim(path: Path, write: bool) -> tuple[Path, str]:
    im = Image.open(path)
    if im.mode != "RGBA":
        return path, "skip (no alpha)"
    alpha = im.getchannel("A")
    bbox = alpha.point(lambda a: 255 if a > ALPHA_THRESHOLD else 0).getbbox()
    if not bbox:
        return path, "skip (fully transparent)"
    left, top, right, bottom = bbox
    width, height = im.width, im.height
    if left <= 1 and top <= 1 and right >= width - 1 and bottom >= height - 1:
        return path, "ok (already tight)"
    pad_x = round((right - left) * PAD_RATIO)
    pad_y = round((bottom - top) * PAD_RATIO)
    box = (
        max(0, left - pad_x),
        max(0, top - pad_y),
        min(width, right + pad_x),
        min(height, bottom + pad_y),
    )
    if write:
        im.crop(box).save(path)
    return path, f"trim {width}x{height} -> {box[2]-box[0]}x{box[3]-box[1]}"


def main() -> int:
    write = "--check" not in sys.argv
    total = changed = 0
    for d in DIRS:
        for path in sorted((ROOT / d).rglob("*.png")):
            total += 1
            path, msg = trim(path, write)
            if msg.startswith("trim"):
                changed += 1
                print(f"{path.relative_to(ROOT)}: {msg}")
    print(f"{total} png files, {changed} trimmed{'' if write else ' (dry run)'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
