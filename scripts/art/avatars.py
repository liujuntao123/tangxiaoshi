#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""形象：文集 11 + 朝代 10 + 通用章节书签 10。1024x1024 透明。"""

import sys
from pathlib import Path

sys.path.insert(0, Path(__file__).resolve().parent)
import lib  # noqa: E402
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "content"))
import catalog  # noqa: E402

SIZE = "1024x1024"


def items() -> list[dict]:
    out = []
    for cid, meta in catalog.COLLECTIONS.items():
        out.append(
            {
                "name": "collection",
                "prompt": lib.avatar_prompt(meta["motif"]),
                "size": SIZE,
                "transparent": True,
                "path": lib.ROOT / "public/art/avatars" / f"collection-{cid}.png",
            }
        )
    for did, meta in catalog.DYNASTIES.items():
        out.append(
            {
                "name": f"dynasty-{did}",
                "prompt": lib.avatar_prompt(meta["motif"]),
                "size": SIZE,
                "transparent": True,
                "path": lib.ROOT / "public/art/avatars" / f"dynasty-{did}.png",
            }
        )
    for n in range(1, 11):
        out.append(
            {
                "name": f"chapter-{n}",
                "prompt": lib.avatar_prompt(catalog.ART["chapter_bookmark"].format(n=n)),
                "size": SIZE,
                "transparent": True,
                "path": lib.ROOT / "public/art/avatars" / f"chapter-{n}.png",
            }
        )
    return out


if __name__ == "__main__":
    only = next((a.split("=")[1] for a in sys.argv if a.startswith("--only=")), None)
    todo = items()
    if only == "collection":
        todo = [x for x in todo if x["name"] == "collection"]
    lib.run_items(todo, force="--force" in sys.argv, only=None if only == "collection" else only)
