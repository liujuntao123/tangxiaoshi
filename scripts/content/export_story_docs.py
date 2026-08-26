#!/usr/bin/env python3
"""Write a human-readable story index from compiled JSON + source modules."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CONTENT = ROOT / "src/lib/game/content"
DOCS = ROOT / "docs/story"
sys.path.insert(0, str(Path(__file__).resolve().parent))
from story import WORLD  # noqa: E402


def main() -> None:
    story = json.loads((CONTENT / "story.json").read_text())
    bank = json.loads((CONTENT / "bank.json").read_text())
    poems = {p["id"]: p for p in bank}
    DOCS.mkdir(parents=True, exist_ok=True)
    chapters_dir = DOCS / "chapters"
    chapters_dir.mkdir(exist_ok=True)

    lines = [
        "# 剧情索引",
        "",
        WORLD["logline"],
        "",
        f"练习库 {len(bank)} 首。历险 {len(story['chapters'])} 章 / {sum(len(c['levels']) for c in story['chapters'])} 关。",
        "",
        "改剧情请改 `scripts/content/story/`，再跑 `python3 scripts/content/build-bank.py`。",
        "",
        "## 总表",
        "",
        "| 朝 | 章 | 诗人 | 关数 | 钩子 | 详情 |",
        "| --- | --- | --- | --- | --- | --- |",
    ]
    for dynasty in story["dynasties"]:
        for ch in story["chapters"]:
            if ch["dynastyId"] != dynasty["id"]:
                continue
            slug = ch["id"]
            lines.append(
                f"| {dynasty['name']} | {ch['title']} | {ch['poetName']} | {len(ch['levels'])} | {ch.get('hook','')} | [{slug}](chapters/{slug}.md) |"
            )

    lines += ["", "## 朝代", ""]
    for dynasty in story["dynasties"]:
        n = sum(1 for c in story["chapters"] if c["dynastyId"] == dynasty["id"])
        lines.append(f"- **{dynasty['name']}**　{dynasty.get('tagline','')}　{n} 章")

    (DOCS / "INDEX.md").write_text("\n".join(lines) + "\n", encoding="utf-8")

    for ch in story["chapters"]:
        body = [
            f"# {ch['title']}",
            "",
            f"- 诗人：{ch['poetName']}",
            f"- 朝代：{ch['dynastyId']}",
            f"- 钩子：{ch.get('hook','')}",
            f"- 时代：{ch.get('era','')}",
            f"- 标签：{', '.join(ch.get('tags') or [])}",
            f"- 钥匙：{ch['keysToBoss']}",
            "",
            "## 开场",
            "",
        ]
        for line in ch.get("opening") or []:
            who = line.get("name") or "旁白"
            body.append(f"- {who}：{line['text']}")
        body += ["", "## 关卡", ""]
        for lv in ch["levels"]:
            poem = poems.get(lv["poemId"], {})
            flag = "（Boss）" if lv.get("boss") else ""
            body.append(f"### {lv['order']}. {lv['place']}{flag}")
            body.append("")
            body.append(f"- 诗：《{poem.get('title','?')}》")
            body.append(f"- 怪：{lv['monsterName']}")
            body.append(f"- id：`{lv['id']}`")
            body.append("")
            body.append("开场：")
            for line in lv.get("intro") or []:
                who = line.get("name") or "旁白"
                body.append(f"- {who}：{line['text']}")
            body.append("")
            body.append("过关：")
            for line in lv.get("outro") or []:
                who = line.get("name") or "旁白"
                body.append(f"- {who}：{line['text']}")
            body.append("")
        (chapters_dir / f"{ch['id']}.md").write_text("\n".join(body), encoding="utf-8")

    print(f"wrote {DOCS / 'INDEX.md'} and {len(story['chapters'])} chapter files")


if __name__ == "__main__":
    main()
