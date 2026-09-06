#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""全局背景 7 张 + 已开放文集背景（每集 5 张）。1024x1536 不透明。"""

import sys
from pathlib import Path

sys.path.insert(0, Path(__file__).resolve().parent)
import lib  # noqa: E402
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "content"))
import catalog  # noqa: E402

SIZE = "1024x1536"


def items() -> list[dict]:
    out = []
    for key, scene in catalog.ART["global_backgrounds"].items():
        out.append(
            {
                "name": f"bg-{key}",
                "prompt": lib.bg_prompt(scene),
                "size": SIZE,
                "transparent": False,
                "path": lib.ROOT / "public/art/bg" / f"{key}.png",
            }
        )
    for cid, motifs in catalog.ART["collection_backgrounds"].items():
        for i, motif in enumerate(motifs, start=1):
            out.append(
                {
                    "name": f"bgc-{cid}-{i}",
                    "prompt": lib.bg_prompt(motif),
                    "size": SIZE,
                    "transparent": False,
                    "path": lib.ROOT / "public/art/bg/collections" / f"{cid}-{i}.png",
                }
            )
    return out


if __name__ == "__main__":
    lib.run_items(items(), force="--force" in sys.argv, only=next((a.split("=")[1] for a in sys.argv if a.startswith("--only=")), None))
