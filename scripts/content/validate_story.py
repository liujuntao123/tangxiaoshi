#!/usr/bin/env python3
"""Quality gate for authored story. Run after build-bank.py."""

from __future__ import annotations

import json
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
STORY = json.loads((ROOT / "src/lib/game/content/story.json").read_text())
BANK = json.loads((ROOT / "src/lib/game/content/bank.json").read_text())

BANNED = [
    "先答题",
    "钥匙给你。下一站",
    "小诗，别怕。把《",
    "应该的！我们走。",
]


def main() -> int:
    errors: list[str] = []
    warnings: list[str] = []
    chapters = STORY["chapters"]
    if len(chapters) < 35:
        errors.append(f"chapters {len(chapters)} < 35")
    levels = [lv for ch in chapters for lv in ch["levels"]]
    if len(levels) < 140:
        errors.append(f"levels {len(levels)} < 140")

    places = Counter()
    monsters = Counter()
    for ch in chapters:
        if len(ch.get("opening") or []) < 3:
            errors.append(f"{ch['id']} opening too short")
        for lv in ch["levels"]:
            intro, outro = lv.get("intro") or [], lv.get("outro") or []
            if len(intro) < 4:
                errors.append(f"{lv['id']} intro {len(intro)}")
            if len(outro) < 3:
                errors.append(f"{lv['id']} outro {len(outro)}")
            text = "。".join(line.get("text", "") for line in intro + outro)
            for ban in BANNED:
                if ban in text:
                    errors.append(f"{lv['id']} banned «{ban}»")
            places[lv["place"]] += 1
            monsters[lv["monsterName"]] += 1
            if lv.get("boss") and lv["monsterName"] != "大魔王":
                errors.append(f"{lv['id']} boss not 大魔王")
        ch_places = [lv["place"] for lv in ch["levels"]]
        if len(ch_places) != len(set(ch_places)):
            errors.append(f"{ch['id']} duplicate place {ch_places}")

    for monster, n in monsters.items():
        if monster == "大魔王":
            continue
        if n > 1:
            errors.append(f"monster reused {monster} x{n}")

    poems = {p["id"]: p for p in BANK}
    for lv in levels:
        poem = poems.get(lv["poemId"])
        if not poem or len(poem.get("questions") or []) < 3:
            errors.append(f"{lv['id']} poem missing questions")

    print(f"chapters {len(chapters)} levels {len(levels)} poems {len(BANK)}")
    print(f"dynasties {[d['id'] for d in STORY['dynasties']]}")
    for w in warnings:
        print("WARN", w)
    for e in errors:
        print("ERR", e)
    if errors:
        print(f"FAIL {len(errors)} errors")
        return 1
    print("OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
