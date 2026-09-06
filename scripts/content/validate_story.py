#!/usr/bin/env python3
"""Quality gate for the compiled story. Run after build-bank.py.

Enforces the AGENTS.md story tone:
- 对手 = 作者本人：monsterName 必须等于章作者，禁止妖怪/茧/魔王词。
- 无 boss 关：所有 level boss=False。
- 对白口语短句（一句一口气），不出现看不懂的套话。
- 每关诗都有 >= 3 道四选一。
- 先秦（采诗官/屈原）为全量章：关数必须达标。
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
STORY = json.loads((ROOT / "src/lib/game/content/story.json").read_text())
BANK = json.loads((ROOT / "src/lib/game/content/bank.json").read_text())

BANNED_WORDS = ["蛀书", "魔王", "大王", "妖怪", "精怪"]
BANNED_NAME_CHARS = ["茧", "妖", "魔", "怪", "精", "鬼怪"]

# A spoken line must stay inside one bubble: ~30 CJK chars after punctuation.
MAX_LINE = 34

MIN_LEVELS = {
    "xianqin-caishiguan": 20,  # 诗经全书按国/部分组（23 节点 / 299 首）
    "xianqin-quyuan": 7,  # 楚辞屈原全部（7 节点 / 25 篇）
}


def spoken_len(text: str) -> int:
    return len(re.sub(r"[，。！？、；：「」『』（）—…\s]", "", text))


def is_poem_text(text: str, bank: dict) -> bool:
    """Banned-word check skips quotes taken straight from a real poem line."""
    return any(text and text in "".join(p["lines"]) for p in bank.values())


def main() -> int:
    errors: list[str] = []
    chapters = STORY["chapters"]
    levels = [lv for ch in chapters for lv in ch["levels"]]
    bank = {p["id"]: p for p in BANK}

    if len(levels) < 100:
        errors.append(f"levels {len(levels)} < 100")

    # 分组后关卡数不再等同诗数：先秦必须全量入关（其余朝代名篇入历险、全库入练习）。
    xianqin_covered = sum(
        len(lv.get("poemIds") or []) for ch in chapters if ch["dynastyId"] == "xianqin" for lv in ch["levels"]
    )
    if xianqin_covered < 320:
        errors.append(f"xianqin levels cover only {xianqin_covered} poems < 320")

    for ch in chapters:
        min_lv = MIN_LEVELS.get(ch["id"])
        if min_lv and len(ch["levels"]) < min_lv:
            errors.append(f"{ch['id']} levels {len(ch['levels'])} < {min_lv} (先秦必须全量)")
        if not ch.get("token"):
            errors.append(f"{ch['id']} missing token")
        if len(ch.get("opening") or []) < 2:
            errors.append(f"{ch['id']} opening too short")
        places: set[str] = set()
        for lv in ch["levels"]:
            if lv.get("boss") is not False:
                errors.append(f"{lv['id']} boss must be False（无 boss 关）")
            if lv["opponentName"] != ch["poetName"]:
                errors.append(f"{lv['id']} opponent {lv['opponentName']} != author {ch['poetName']}")
            for w in BANNED_NAME_CHARS:
                if w in lv["opponentName"]:
                    errors.append(f"{lv['id']} opponentName contains fantasy char «{w}»")
            if lv["opponentArt"] != f"/sprites/poets/{ch['poetId']}.png":
                errors.append(f"{lv['id']} opponent art must be the poet portrait")
            art_path = ROOT / f"public{lv['sceneBg']}"
            if not str(lv["sceneBg"]).startswith("/art/scene-") or not art_path.exists():
                errors.append(f"{lv['id']} sceneBg not from shared pool: {lv['sceneBg']}")
            if lv["place"] in places:
                errors.append(f"{ch['id']} duplicate place {lv['place']}")
            places.add(lv["place"])
            poem_ids = lv.get("poemIds") or []
            if not poem_ids or any(
                len((bank.get(pid) or {}).get("questions") or []) < 3 for pid in poem_ids
            ):
                errors.append(f"{lv['id']} node poems missing questions")
            intro, outro = lv.get("intro") or [], lv.get("outro") or []
            if len(intro) < 3:
                errors.append(f"{lv['id']} intro {len(intro)}")
            if len(outro) < 2:
                errors.append(f"{lv['id']} outro {len(outro)}")

    # Spoken-line length + banned clichés across every dialogue line.
    def walk(lines: list, where: str) -> None:
        for line in lines or []:
            text = line.get("text", "")
            n = spoken_len(text)
            if n > MAX_LINE:
                errors.append(f"{where} line {n} > {MAX_LINE}: {text[:38]}")
            for w in BANNED_WORDS:
                if w in text and not is_poem_text(text, bank):
                    errors.append(f"{where} banned «{w}»: {text[:38]}")

    walk(STORY.get("prologue"), "prologue")
    for d in STORY["dynasties"]:
        walk(d.get("opening"), f"dynasty:{d['id']}")
    for ch in chapters:
        walk(ch.get("opening"), ch["id"])
        for lv in ch["levels"]:
            walk(lv.get("intro"), lv["id"])
            walk(lv.get("outro"), lv["id"])

    print(f"chapters {len(chapters)} levels {len(levels)} poems {len(BANK)}")
    print(f"dynasties {[d['id'] for d in STORY['dynasties']]}")
    for e in errors:
        print("ERR", e)
    if errors:
        print(f"FAIL {len(errors)} errors")
        return 1
    print("OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
