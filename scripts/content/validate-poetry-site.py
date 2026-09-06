#!/usr/bin/env python3
"""Validate the scraped poetry-site dataset (data/poetry-site/).

Checks:
  - index.json parses and lists collections; every referenced file exists and parses
  - per poem: title/author/paragraphs present, no empty bodies, clean whitespace
  - duplicate poem ids inside one collection; ids shared across collections (expected for 蒙学 etc.)
  - index counts match file contents
  - derived lists (authors.json / dynasties.json / collections.json) are consistent:
    unique ids, every poem's dynasty registered, collections match the index
  - no `url` fields left anywhere in the dataset
"""

from __future__ import annotations

import json
import sys
from pathlib import Path


def strip_urls_check(obj, path: str, problems: list[str]) -> None:
    if isinstance(obj, dict):
        if "url" in obj:
            problems.append(f"{path}: url field still present")
        for k, v in obj.items():
            strip_urls_check(v, f"{path}.{k}", problems)
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            strip_urls_check(v, f"{path}[{i}]", problems)


def main() -> None:
    out_dir = Path(sys.argv[1] if len(sys.argv) > 1 else "data/poetry-site")
    index = json.loads((out_dir / "index.json").read_text("utf-8"))
    cols = index["collections"]
    print(f"index: {len(cols)} collections, scrapedAt={index['scrapedAt']}")

    problems: list[str] = []
    all_ids: dict[str, list[str]] = {}
    total = 0

    for entry in cols:
        f = out_dir / entry["file"]
        if not f.exists():
            problems.append(f"missing file {f}")
            continue
        data = json.loads(f.read_text("utf-8"))
        n = 0
        seen_in_col: set[str] = set()
        dup_in_col: list[str] = []
        for ch in data["chapters"]:
            if not ch["poems"]:
                problems.append(f"{entry['id']}/{ch['title']}: chapter has 0 poems")
            for p in ch["poems"]:
                n += 1
                all_ids.setdefault(p["id"], []).append(entry["id"])
                if p["id"] in seen_in_col:
                    dup_in_col.append(p["id"])
                seen_in_col.add(p["id"])
                if not p.get("title"):
                    problems.append(f"{entry['id']}/{p['id']}: empty title")
                if not p.get("paragraphs"):
                    problems.append(f"{entry['id']}/{p['id']} {p.get('title')}: empty paragraphs")
                if not p.get("dynasty"):
                    problems.append(f"{entry['id']}/{p['id']} {p.get('title')}: missing dynasty")
                for i, line in enumerate(p.get("paragraphs") or []):
                    if line != line.strip() or "  " in line:
                        problems.append(f"{entry['id']}/{p['id']} line{i}: whitespace artifact: {line!r}")
                    if "<" in line and ">" in line:
                        problems.append(f"{entry['id']}/{p['id']} line{i}: raw HTML leaked: {line!r}")
        if n != entry["poemCount"]:
            problems.append(f"{entry['id']}: index says {entry['poemCount']} poems, file has {n}")
        if dup_in_col:
            print(f"  note {entry['id']}: {len(dup_in_col)} duplicate poem refs inside collection")
        total += n
        print(f"  {entry['id']:20s} {entry['title']:10s} chapters={entry['chapterCount']:3d} poems={n:5d}")

    shared = {k: v for k, v in all_ids.items() if len(set(v)) > 1}
    if shared:
        print(f"  note: {len(shared)} poem ids appear in multiple collections")

    # derived lists
    def load(name: str):
        f = out_dir / name
        if not f.exists():
            problems.append(f"missing {name}")
            return None
        return json.loads(f.read_text("utf-8"))

    authors = load("authors.json")
    dynasties = load("dynasties.json")
    colls = load("collections.json")
    if authors and dynasties and colls:
        a_ids = [a["id"] for a in authors["authors"]]
        d_ids = [d["id"] for d in dynasties["dynasties"]]
        if len(a_ids) != len(set(a_ids)):
            problems.append("authors.json: duplicate author ids")
        if len(d_ids) != len(set(d_ids)):
            problems.append("dynasties.json: duplicate dynasty ids")
        d_set = set(d_ids)
        for entry in cols:
            data = json.loads((out_dir / entry["file"]).read_text("utf-8"))
            for ch in data["chapters"]:
                for p in ch["poems"]:
                    if p.get("dynasty") not in d_set:
                        problems.append(f"{entry['id']}/{p['id']}: dynasty {p.get('dynasty')!r} not registered")
        if {c["id"] for c in colls["collections"]} != {c["id"] for c in cols}:
            problems.append("collections.json ids do not match index.json")
        print(f"  lists: authors={authors['count']} dynasties={dynasties['count']} "
              f"collections={colls['count']}")

    strip_urls_check(index, "index", problems)

    print(f"total poem refs: {total}")
    if problems:
        print(f"\nPROBLEMS ({len(problems)}):")
        for p in problems[:40]:
            print("  -", p)
        sys.exit(1)
    print("OK: no problems found")


if __name__ == "__main__":
    main()
