#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""质检门：bank.json 必须全绿（docs/content-rules.md 第五节）。"""

import json
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BANK = ROOT / "src" / "lib" / "game" / "content" / "bank.json"
FORBIDDEN = ["妖怪", "大魔王", "血条", "攻击", "点一下", "boss", "Boss"]
EXPECT_TYPES = ["complete-next", "complete-next", "complete-prev", "title", "title"]

errors: list[str] = []


def err(msg: str) -> None:
    errors.append(msg)


def main() -> None:
    bank = json.loads(BANK.read_text(encoding="utf-8"))
    poems = bank["poems"]
    authors = {a["id"]: a for a in bank["authors"]}
    collections = {c["id"]: c for c in bank["collections"]}

    author_text: dict[str, str] = {}
    for p in poems:
        author_text.setdefault(p["authorId"], "")
        author_text[p["authorId"]] += p["text"]

    # 1) 每诗 5 题、配比正确、四选一、答案唯一且在选项内
    for p in poems:
        qs = p["questions"]
        if len(qs) != 5:
            err(f"{p['id']}「{p['title']}」题数 {len(qs)} ≠ 5")
        if [q["type"] for q in qs] != EXPECT_TYPES:
            err(f"{p['id']} 题型配比错误: {[q['type'] for q in qs]}")
        for q in qs:
            if len(set(q["choices"])) != 4:
                err(f"{q['id']} 选项有重复")
            ai = q["answerIndex"]
            if ai not in (0, 1, 2, 3):
                err(f"{q['id']} answerIndex 越界")
            ans = q["choices"][ai]
            if q["type"] in ("complete-next", "complete-prev"):
                if ans not in p["lines"]:
                    err(f"{q['id']} 补全答案「{ans}」不在该诗半句序列中")
            else:
                if ans != p["title"]:
                    err(f"{q['id']} 诗名答案 ≠ 诗题")
            # 半句长度
            if q["type"] in ("complete-next", "complete-prev"):
                for part in (q["quote"], ans):
                    if len(part) > 14:
                        err(f"{q['id']} 半句超 14 字: {part}")
        if not (p["background"] in collections[p["collectionId"]]["backgrounds"]):
            err(f"{p['id']} 背景不在文集背景清单内")

    # 2) 引导语规范
    for aid, a in authors.items():
        guide = a["guide"]
        if not guide:
            err(f"作者 {aid} 缺引导语")
            continue
        full = "".join(line["text"] for line in guide)
        for word in FORBIDDEN:
            if word in full:
                err(f"作者 {aid} 引导语含禁词「{word}」")
        first = guide[0]["text"]
        first_sentence = re.split(r"[。？！]", first)[0]
        if first_sentence and first_sentence not in author_text.get(aid, ""):
            err(f"作者 {aid} 引导语首句原句未在该作者诗文中逐字找到: {first_sentence}")
        if len(full) > 90:
            err(f"作者 {aid} 引导语超 90 字（{len(full)}）")
        if len(guide) > 3:
            err(f"作者 {aid} 引导语超 3 段")

    # 3) 成就覆盖
    kinds = Counter(x["kind"] for x in bank["achievements"])
    if kinds["author"] != len(authors):
        err(f"作者成就数 {kinds['author']} ≠ 作者数 {len(authors)}")
    playable = [c for c in bank["collections"] if c["playable"]]
    if kinds["collection"] != len(playable):
        err(f"文集成就数 {kinds['collection']} ≠ 开放文集数 {len(playable)}")
    if kinds["dynasty"] != len({p["dynastyId"] for p in poems}):
        err("朝代成就数与已编译朝代数不符")
    for x in bank["achievements"]:
        if x["title"] == x["subtitle"]:
            err(f"成就 {x['id']} 主副标相同")

    # 4) 引用完整性：诗 id 唯一、章节/作者引用存在
    ids = [p["id"] for p in poems]
    if len(set(ids)) != len(ids):
        err("诗 id 有重复")
    for p in poems:
        if p["authorId"] not in authors:
            err(f"{p['id']} 引用不存在的作者 {p['authorId']}")
        if p["collectionId"] not in collections:
            err(f"{p['id']} 引用不存在的文集 {p['collectionId']}")

    # 5) 学段难度与学习常见度（ADR-0020）：难度 1-5、每档至少一关；常见度按分组口径
    VALID_STUDY_RANKS = (0, 1000, 2000, 3000)
    tier_counts: Counter = Counter()
    rank_bad: list[str] = []
    for p in poems:
        difficulty = p.get("difficulty")
        if difficulty in (1, 2, 3, 4, 5):
            tier_counts[difficulty] += 1
        else:
            err(f"{p['id']}「{p['title']}」难度档缺失或非法: {difficulty!r}")
        study_rank = p.get("studyRank")
        if study_rank not in VALID_STUDY_RANKS:
            rank_bad.append(f"{p['id']}:{study_rank!r}")
        elif (study_rank == 0) != (p["collectionId"] == "jiaokeshu-xuanshi"):
            err(f"{p['id']}「{p['title']}」常见度 {study_rank} 与文集 {p['collectionId']} 不匹配")
    if rank_bad:
        err(f"学习常见度缺失或非法（{len(rank_bad)} 处，前 5: {', '.join(rank_bad[:5])}）")
    for t in range(1, 6):
        if tier_counts[t] < 13:
            err(f"难度档 T{t} 仅 {tier_counts[t]} 首，不足一关（13 首）")

    if errors:
        print(f"✘ validate_content：{len(errors)} 处问题")
        for e in errors:
            print("  -", e)
        sys.exit(1)
    q_total = sum(len(p["questions"]) for p in poems)
    tier_text = "、".join(f"T{t} {tier_counts.get(t, 0)} 首" for t in range(1, 6))
    print(f"✔ validate_content：{len(poems)} 诗卡 {q_total} 题、{len(authors)} 作者、"
          f"{len(bank['achievements'])} 成就、难度档 {tier_text}，全部通过")


if __name__ == "__main__":
    main()
