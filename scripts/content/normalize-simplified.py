#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""一次性数据修复（2026-08，ADR-0014）：全部文集开放前源数据规范化。

1. 繁转简：data/poetry-site/*.json 里所有字符串值走 opencc t2s
   （诗正文、诗题、章节名、作者名、编者等；`id` 键的值跳过）。
   面向小学生统一简体，之后 bank 引文与源数据仍逐字一致。
2. 声律启蒙数据修复：上卷/下卷 30 首诗 author=null，会全部并入「佚名」；
   补标真实作者 车万育。

幂等：已简体文本转换后不变，已标注 author 不再改。
跑完必须执行：python3 scripts/content/derive-poetry-indexes.py
             python3 scripts/content/validate-poetry-site.py
"""

import json
from pathlib import Path

import opencc

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data" / "poetry-site"
CC = opencc.OpenCC("t2s")
SKIP_KEYS = {"id"}


def conv(obj, path: str, stats: dict) -> object:
    if isinstance(obj, str):
        fixed = CC.convert(obj)
        if fixed != obj:
            stats["strings"] += 1
            if stats["samples"] < 12:
                stats["samples"] += 1
                print(f"  {path}: {obj[:24]!r} -> {fixed[:24]!r}")
        return fixed
    if isinstance(obj, list):
        return [conv(v, f"{path}[{i}]", stats) for i, v in enumerate(obj)]
    if isinstance(obj, dict):
        return {
            k: (v if k in SKIP_KEYS else conv(v, f"{path}.{k}", stats))
            for k, v in obj.items()
        }
    return obj


def fix_shenglv_authors() -> int:
    f = DATA / "shenglv-qimeng.json"
    data = json.loads(f.read_text(encoding="utf-8"))
    n = 0
    for ch in data["chapters"]:
        if CC.convert(ch["title"]) in ("上卷", "下卷"):
            for p in ch["poems"]:
                if not p.get("author"):
                    p["author"] = "车万育"
                    n += 1
    f.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", "utf-8")
    return n


def main() -> None:
    stats = {"strings": 0, "samples": 0}
    for f in sorted(DATA.glob("*.json")):
        data = json.loads(f.read_text(encoding="utf-8"))
        before = stats["strings"]
        fixed = conv(data, f.name, stats)
        f.write_text(json.dumps(fixed, ensure_ascii=False, indent=2) + "\n", "utf-8")
        print(f"{f.name}: {stats['strings'] - before} 处字符串转换")
    n = fix_shenglv_authors()
    print(f"声律启蒙 补标作者 车万育：{n} 首")
    print(f"合计转换 {stats['strings']} 处")


if __name__ == "__main__":
    main()
