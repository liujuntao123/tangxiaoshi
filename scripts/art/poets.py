#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""作者立绘：1024x1536 透明。只生成 catalog.AUTHORS 里出现的作者。"""

import sys
from pathlib import Path

sys.path.insert(0, Path(__file__).resolve().parent)
import lib  # noqa: E402
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "content"))
import catalog  # noqa: E402

SIZE = "1024x1536"


def items() -> list[dict]:
    out = []
    for aid, meta in catalog.AUTHORS.items():
        out.append(
            {
                "name": f"poet-{aid}",
                "prompt": f"{meta['persona']}。{lib.STYLE}。全身立绘，纯透明背景。{lib.NO_TEXT}。",
                "size": SIZE,
                "transparent": True,
                "path": lib.ROOT / "public/sprites/poets" / f"{aid}.png",
            }
        )
    return out


if __name__ == "__main__":
    # --slice=i:n：把待生成列表按 (index % n)==i 分片，便于多进程并行加速
    slice_arg = next((a for a in sys.argv if a.startswith("--slice=")), None)
    items_ = items()
    if slice_arg:
        i, n = (int(x) for x in slice_arg.split("=")[1].split(":"))
        items_ = [it for idx, it in enumerate(items_) if idx % n == i]
    workers = next((int(a.split("=")[1]) for a in sys.argv if a.startswith("--workers=")), 4)
    lib.run_items(
        items_,
        force="--force" in sys.argv,
        only=next((a.split("=")[1] for a in sys.argv if a.startswith("--only=")), None),
        workers=workers,
    )
