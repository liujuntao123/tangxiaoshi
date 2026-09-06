#!/usr/bin/env python3
"""Quantize generated art so scenes load fast on phones.

生成图是 2-3MB 的真彩 PNG，手机加载太慢。场景不透明 → 256 色调色板；
立绘/UI 带 alpha → RGBA + 256 色（PIL quantize 保留透明）。
    python3 scripts/art/compress.py            # 全部 art/sprites/ui
    python3 scripts/art/compress.py --check    # 只报告
"""
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
DIRS = ["public/art", "public/sprites", "public/ui"]
MIN_BYTES = 120_000  # 只压大图，小图标跳过


def quantize(path: Path) -> tuple[str, int, int]:
    before = path.stat().st_size
    im = Image.open(path)
    if im.mode == "RGBA":
        q = im.quantize(colors=256, method=Image.FASTOCTREE, dither=Image.FLOYDSTEINBERG)
    elif im.mode == "RGB":
        q = im.quantize(colors=256, method=Image.MEDIANCUT, dither=Image.FLOYDSTEINBERG)
    else:
        return "skip", before, before
    q.save(path, optimize=True)
    after = path.stat().st_size
    return "ok", before, after


def main() -> int:
    check = "--check" in sys.argv
    total_before = total_after = 0
    for d in DIRS:
        for path in sorted((ROOT / d).rglob("*.png")):
            size = path.stat().st_size
            if size < MIN_BYTES:
                continue
            if check:
                print(f"{path.relative_to(ROOT)}: {size // 1024} KB")
                continue
            status, before, after = quantize(path)
            total_before += before
            total_after += after
            print(f"{path.relative_to(ROOT)}: {before // 1024} -> {after // 1024} KB")
    if not check:
        print(f"total {total_before // 1048576}MB -> {total_after // 1048576}MB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
