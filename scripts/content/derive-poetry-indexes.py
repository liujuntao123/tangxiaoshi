#!/usr/bin/env python3
"""Derive consumption-ready lists from the scraped poetry-site dataset.

Reads data/poetry-site/<collectionId>.json and:
  1. strips the site page URLs (`url` fields) everywhere — they are not needed downstream
  2. infers each poem's dynasty (`dynasty` field) from its meta tags, falling back to
     collection-level defaults (诗经->xianqin, 花间集->wudai, …)
  3. writes three standalone lists next to the data:
       authors.json      one entry per poet (简体规范名, 繁简变体归一, 游戏 poetId 对齐)
       dynasties.json    one entry per dynasty (game dynastyId 对齐: xianqin/hanwei/tang/song/…)
       collections.json  one entry per collection

Pipeline order: scrape-poetry-site.py -> derive-poetry-indexes.py -> validate-poetry-site.py
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import unicodedata
from collections import Counter
from pathlib import Path

try:
    import opencc
    _CC = opencc.OpenCC("t2s")
    def t2s(s: str | None) -> str:
        return _CC.convert(s or "")
except Exception:  # noqa: BLE001 - optional dependency
    def t2s(s: str | None) -> str:
        return s or ""

try:
    from pypinyin import lazy_pinyin
except Exception:  # noqa: BLE001 - optional dependency
    lazy_pinyin = None

# tag (as found on the site) -> canonical dynasty id
TAG_TO_DYNASTY = {
    "先秦": "xianqin",
    "两汉": "hanwei", "魏晋": "hanwei", "南北朝": "hanwei",
    "唐代": "tang",
    "五代": "wudai",
    "宋代": "song",
    "元代": "yuan",
    "明代": "ming",
    "清代": "qing",
    "近代": "modern", "现代": "modern", "当代": "modern",
}

# collections whose content sits inside a single dynasty; None = mixed, tags only
COLLECTION_DEFAULT_DYNASTY = {
    "shijing": "xianqin",
    "gushi-shijiu-shou": "hanwei",
    "huajianji": "wudai",
    "nantang-erzhu-ci": "wudai",
    "tangshi-sanbaishou": "tang",
    "tangshi-mengxue": "tang",
    "songci-sanbaishou": "song",
    "sanzijing": "song",
    "shenglv-qimeng": "qing",
    "qianjiashi": None,
    "jiaokeshu-xuanshi": None,
}

# same person, different spellings (opencc keeps 夐/敻 and 馀/余 distinct)
NAME_ALIASES = {
    "朱庆馀": "朱庆余",
    "顾夐": "顾敻",
}

DYNASTY_META = {
    # id: (name, scope note) — xianqin/hanwei/tang/song match world.py DYNASTIES
    "xianqin": ("先秦", "诗经等上古歌谣"),
    "hanwei": ("汉魏", "两汉、魏晋、南北朝"),
    "tang": ("唐", "唐诗"),
    "wudai": ("五代", "花间词、南唐词"),
    "song": ("宋", "宋诗宋词"),
    "yuan": ("元", "元代诗文"),
    "ming": ("明", "明代诗文"),
    "qing": ("清", "清代诗文"),
    "modern": ("近现代", "近代与现代诗文"),
    "unknown": ("未知", "站点数据未标注朝代"),
}
DYNASTY_ORDER = ["xianqin", "hanwei", "tang", "wudai", "song", "yuan", "ming", "qing",
                 "modern", "unknown"]


def pinyin_id(name: str) -> str:
    if lazy_pinyin is None:
        slug = unicodedata.normalize("NFKD", name)
        slug = re.sub(r"[^a-z0-9]", "", slug.encode("ascii", "ignore").decode().lower())
        return slug or "unknown"
    parts = [p for p in lazy_pinyin(name) if re.fullmatch(r"[a-z0-9]+", p)]
    return "".join(parts) or "unknown"


def load_bank_poet_ids(bank_path: Path) -> dict[str, str]:
    """poetName(简体) -> poetId, from the compiled game bank (bank v2: authors[].authorName/authorId)."""
    try:
        bank = json.loads(bank_path.read_text("utf-8"))
    except Exception as e:  # noqa: BLE001
        print(f"bank unreadable ({e}); poet ids will be freshly generated", file=sys.stderr)
        return {}
    entries = bank.get("authors", []) if isinstance(bank, dict) else bank
    out: dict[str, str] = {}
    for e in entries:
        if not isinstance(e, dict):
            continue
        name, pid = e.get("authorName") or e.get("poetName"), e.get("authorId") or e.get("poetId")
        if name and pid:
            out.setdefault(t2s(name), pid)
    return out


def strip_urls(obj, key: str = "url") -> int:
    """Recursively drop `url` fields; return count removed."""
    n = 0
    if isinstance(obj, dict):
        if key in obj:
            del obj[key]
            n += 1
        for v in obj.values():
            n += strip_urls(v, key)
    elif isinstance(obj, list):
        for v in obj:
            n += strip_urls(v, key)
    return n


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--data", default="data/poetry-site", help="dataset directory")
    ap.add_argument("--bank", default="src/lib/game/content/bank.json",
                    help="compiled game bank, used to reuse existing poetIds")
    args = ap.parse_args()
    data_dir = Path(args.data)

    index = json.loads((data_dir / "index.json").read_text("utf-8"))
    collections = []
    for entry in index["collections"]:
        f = data_dir / entry["file"]
        collections.append(json.loads(f.read_text("utf-8")))

    # 1) strip urls + 2) infer per-poem dynasty
    removed_urls = 0
    for payload in collections:
        removed_urls += strip_urls(payload)
        cid = payload["collection"]["id"]
        default_dyn = COLLECTION_DEFAULT_DYNASTY.get(cid)
        for ch in payload["chapters"]:
            strip_urls(ch)
            for p in ch["poems"]:
                dyn = next((TAG_TO_DYNASTY[t] for t in p["tags"] if t in TAG_TO_DYNASTY), None)
                p["dynasty"] = dyn or default_dyn or "unknown"
    removed_urls += strip_urls(index)
    index["urlsStripped"] = True
    (data_dir / "index.json").write_text(json.dumps(index, ensure_ascii=False, indent= 2) + "\n", "utf-8")
    for payload, entry in zip(collections, index["collections"]):
        (data_dir / entry["file"]).write_text(
            json.dumps(payload, ensure_ascii=False, indent=2) + "\n", "utf-8")
    print(f"stripped {removed_urls} url fields; dynasties inferred per poem")

    # 3) author registry (繁简归一, 佚名归并)
    bank_ids = load_bank_poet_ids(Path(args.bank))
    authors: dict[str, dict] = {}
    used_ids: set[str] = set()
    bank_by_name: dict[str, str] = {}  # assigned bank ids, first pass priority

    def canonical(name: str) -> str:
        return NAME_ALIASES.get(name, name)

    def author_id(name: str, anonymous: bool) -> str:
        if anonymous:
            pid = "yiming"
        else:
            pid = bank_by_name.get(name) or pinyin_id(name)
        base, n = pid, 2
        while pid in used_ids:
            pid = f"{base}-{n}"
            n += 1
        used_ids.add(pid)
        return pid

    for payload in collections:
        cid = payload["collection"]["id"]
        for ch in payload["chapters"]:
            for p in ch["poems"]:
                raw = (p.get("author") or "").strip()
                anonymous = not raw or t2s(raw) == "佚名"
                norm = canonical(t2s(raw)) if raw else "佚名"
                a = authors.setdefault(norm, {
                    "variants": set(), "poemIds": set(), "collections": set(),
                    "dynasties": set(), "anonymous": anonymous, "id": None,
                })
                a["variants"].add(raw or "佚名")
                a["poemIds"].add(p["id"])
                a["collections"].add(cid)
                if p.get("dynasty"):
                    a["dynasties"].add(p["dynasty"])

    # poem-less dynasties: fill from collection defaults where the author only
    # appears in single-dynasty collections
    col_dyn_sets: dict[str, set[str]] = {}
    for payload in collections:
        cid = payload["collection"]["id"]
        dyns = {p["dynasty"] for ch in payload["chapters"] for p in ch["poems"] if p.get("dynasty")}
        col_dyn_sets[cid] = dyns
    for a in authors.values():
        if not a["dynasties"]:
            pooled = [d for cid in a["collections"] for d in col_dyn_sets.get(cid, set())]
            a["dynasties"] = set(pooled) or {"unknown"}

    # id assignment, two passes so bank ids claim first and never collide:
    # pass 1 — authors already known to the game bank keep their poetId
    for name, pid in bank_ids.items():
        if name in authors and pid not in used_ids:
            authors[name]["id"] = pid
            used_ids.add(pid)
            bank_by_name[name] = pid
    # pass 2 — everyone else gets pinyin ids, suffix -2/-3… on collision
    author_list = []
    for norm, a in authors.items():
        if a["id"] is None:
            a["id"] = author_id(norm, a["anonymous"])
        author_list.append({
            "id": a["id"],
            "name": norm,
            "variants": sorted(a["variants"] - {norm}) or [norm],
            "anonymous": a["anonymous"] or norm == "佚名",
            "dynasties": sorted(a["dynasties"], key=DYNASTY_ORDER.index),
            "poemCount": len(a["poemIds"]),
            "collections": sorted(a["collections"]),
        })
    author_list.sort(key=lambda x: (DYNASTY_ORDER.index(x["dynasties"][0]),
                                    -x["poemCount"], x["id"]))

    # 4) dynasty list
    dyn_poems: dict[str, set[str]] = {d: set() for d in DYNASTY_ORDER}
    dyn_authors: dict[str, set[str]] = {d: set() for d in DYNASTY_ORDER}
    dyn_cols: dict[str, set[str]] = {d: set() for d in DYNASTY_ORDER}
    name_to_id = {a["name"]: a["id"] for a in author_list}
    for a in author_list:
        for d in a["dynasties"]:
            dyn_authors[d].add(a["id"])
    for payload in collections:
        cid = payload["collection"]["id"]
        for ch in payload["chapters"]:
            for p in ch["poems"]:
                d = p.get("dynasty") or "unknown"
                dyn_poems[d].add(p["id"])
                dyn_cols[d].add(cid)
                if p["author"]:
                    aid = name_to_id.get(t2s(p["author"].strip()) or "佚名")
                    if aid:
                        dyn_authors[d].add(aid)
    dyn_list = [{
        "id": d,
        "name": DYNASTY_META[d][0],
        "scope": DYNASTY_META[d][1],
        "authorCount": len(dyn_authors[d]),
        "poemCount": len(dyn_poems[d]),
        "collections": sorted(dyn_cols[d]),
        "authors": sorted(dyn_authors[d]),
    } for d in DYNASTY_ORDER if dyn_poems[d] or dyn_authors[d]]

    # 5) collection list
    col_list = []
    for payload in collections:
        meta = payload["collection"]
        cid = meta["id"]
        poems = [p for ch in payload["chapters"] for p in ch["poems"]]
        dyns = {p.get("dynasty") or "unknown" for p in poems}
        auths = {t2s(p["author"].strip()) if p["author"] else "佚名" for p in poems}
        col_list.append({
            "id": cid,
            "title": meta["title"],
            "editor": meta.get("editor"),
            "dynasties": sorted(dyns, key=DYNASTY_ORDER.index),
            "authorCount": len(auths),
            "chapterCount": len(payload["chapters"]),
            "poemCount": len(poems),
        })

    (data_dir / "authors.json").write_text(
        json.dumps({"count": len(author_list), "authors": author_list},
                   ensure_ascii=False, indent=2) + "\n", "utf-8")
    (data_dir / "dynasties.json").write_text(
        json.dumps({"count": len(dyn_list), "dynasties": dyn_list},
                   ensure_ascii=False, indent=2) + "\n", "utf-8")
    (data_dir / "collections.json").write_text(
        json.dumps({"count": len(col_list), "collections": col_list},
                   ensure_ascii=False, indent=2) + "\n", "utf-8")

    print(f"authors.json: {len(author_list)} authors "
          f"(佚名={sum(1 for a in author_list if a['anonymous'])})")
    for d in dyn_list:
        print(f"  {d['id']:8s} {d['name']:3s} authors={d['authorCount']:3d} "
              f"poems={d['poemCount']:4d} collections={len(d['collections'])}")
    print(f"dynasties.json: {len(dyn_list)}; collections.json: {len(col_list)}")


if __name__ == "__main__":
    main()
