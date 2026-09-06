#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""从 bank.json 生成 docs/story/（新结构总表）。"""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BANK = ROOT / "src" / "lib" / "game" / "content" / "bank.json"
DOCS = ROOT / "docs" / "story"


def main() -> None:
    bank = json.loads(BANK.read_text(encoding="utf-8"))
    DOCS.mkdir(parents=True, exist_ok=True)
    chapters = {c["id"]: c for c in bank["chapters"]}
    authors = {a["id"]: a for a in bank["authors"]}
    collections = {c["id"]: c for c in bank["collections"]}

    lines = ["# 内容总表", "", "> 本文件由 `scripts/content/export_story_docs.py` 从 bank.json 生成，不要手改。", ""]
    q_total = sum(len(p["questions"]) for p in bank["poems"])
    lines += [
        f"- 开放文集：{sum(1 for c in bank['collections'] if c['playable'])} / {len(bank['collections'])}",
        f"- 章节 {len(bank['chapters'])} · 作者 {len(bank['authors'])} · 诗卡 {len(bank['poems'])} · 题目 {q_total} · 成就 {len(bank['achievements'])}",
        "",
    ]

    for cid, col in collections.items():
        if not col["playable"]:
            lines += [f"## {col['title']}（待开放）", ""]
            continue
        lines += [f"## {col['title']}", ""]
        for ch_id in col["chapterIds"]:
            ch = chapters[ch_id]
            lines += [f"### 第{ch['index']}章 {ch['title']}（{ch['poemCount']} 首）", ""]
            for aid in ch["authorIds"]:
                a = authors[aid]
                lines += [f"**{a['name']}** — {a['poemCount']} 首", ""]
                for g in a["guide"]:
                    lines += [f"> 引导语：{g['text']}", ""]
                lines += ["| 诗卡 | 背景 | 题数 |", "| --- | --- | --- |"]
                for p in bank["poems"]:
                    if p["authorId"] == aid and p["collectionId"] == cid and p["chapterIndex"] == ch["index"]:
                        lines += [f"| {p['title']} | {p['background'].rsplit('/', 1)[-1]} | {len(p['questions'])} |"]
                lines += [""]
        lines += [""]

    lines += ["", "## 成就", "", "| 成就 | 类型 | 达成条件 |", "| --- | --- | --- |"]
    for x in bank["achievements"]:
        lines += [f"| {x['title']}·{x['subtitle']} | {x['kind']} | {x['hint']} |"]
    lines += [""]

    (DOCS / "INDEX.md").write_text("\n".join(lines), encoding="utf-8")
    print(f"✔ docs/story/INDEX.md 已重建（{len(bank['poems'])} 诗卡）")


if __name__ == "__main__":
    main()
