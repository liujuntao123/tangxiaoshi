#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""编译器：data/poetry-site（唯一源）+ scripts/content/catalog.py（手写）
→ src/lib/game/content/bank.json

生成规则唯一权威是 docs/content-rules.md；改规则先改文档再改这里。
"""

import hashlib
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data" / "poetry-site"
OUT = ROOT / "src" / "lib" / "game" / "content" / "bank.json"
sys.path.insert(0, str(Path(__file__).resolve().parent))
import catalog  # noqa: E402

SPLIT_RE = re.compile(r"[，。？！；、]")
# 「集序」匹配散文序章（如 花间集序：欧阳炯序文带 [1] 脚注，非诗词，不入库）
INTRO_RE = re.compile(r"介绍|序言|前言|凡例|集序")
MIN_HALF = 2
MAX_HALF = 14
BGS_PER_COLLECTION = 5


class SkipPoem(Exception):
    """该诗素材不足不入库（docs/content-rules.md：编译日志记录，不中断编译）。"""


def note(msg: str) -> None:
    print(f"  [编译] {msg}")


def md5(s: str) -> str:
    return hashlib.md5(s.encode("utf-8")).hexdigest()


def stable_order(items: list[str], seed: str) -> list[str]:
    # 命名空间 pick|：仅用于「选哪几个」；位置打乱在 make_question 用 pos| 前缀，
    # 两者绝不能共享种子——否则按 md5 最小选出的干扰项会在位置排序中永远压过答案。
    return sorted(items, key=lambda x: md5(f"pick|{seed}|{x}"))


def split_paragraph(paragraph: str) -> list[str]:
    return [p.strip() for p in SPLIT_RE.split(paragraph) if p.strip()]


def ok_half(seg: str) -> bool:
    return MIN_HALF <= len(seg) <= MAX_HALF


def qualified_pairs(paragraphs: list[str]) -> list[tuple[str, str]]:
    pairs: list[tuple[str, str]] = []
    for p in paragraphs:
        segs = split_paragraph(p)
        for a, b in zip(segs, segs[1:]):
            # 叠句（如 荷叶杯「知么知，知么知」）出题无意义，排除
            if ok_half(a) and ok_half(b) and a != b:
                pairs.append((a, b))
    return pairs


def clamp_seg(seg: str) -> str:
    return seg[:MAX_HALF]


# ---------------------------------------------------------------- 数据装载

def load_site() -> tuple[dict, dict, dict, dict]:
    index = json.loads((DATA / "index.json").read_text(encoding="utf-8"))
    collections_meta = {
        c["id"]: c for c in json.loads((DATA / "collections.json").read_text(encoding="utf-8"))["collections"]
    }
    dynasties = json.loads((DATA / "dynasties.json").read_text(encoding="utf-8"))
    authors: dict[str, dict] = {}
    for a in json.loads((DATA / "authors.json").read_text(encoding="utf-8"))["authors"]:
        # 主名优先；variants（繁简/别名 scrapings）作兜底，如 朱庆馀→zhuqingyu
        authors.setdefault(a["name"], a)
        for v in a.get("variants", []):
            authors.setdefault(v, a)
    return index, collections_meta, dynasties, authors


def load_open_collections(open_ids: list[str]) -> dict[str, dict]:
    out = {}
    for cid in open_ids:
        path = DATA / f"{cid}.json"
        if not path.exists():
            raise SystemExit(f"catalog.OPEN_COLLECTIONS 里的 {cid} 在 data/poetry-site 不存在")
        out[cid] = json.loads(path.read_text(encoding="utf-8"))
    return out


# ---------------------------------------------------------------- 诗句解析

def parse_poems(site: dict[str, dict], name_to_author: dict) -> list[dict]:
    poems: list[dict] = []
    seen_ids: set[str] = set()
    for cid, data in site.items():
        kept_idx = 0
        for raw_ch in data["chapters"]:
            title = raw_ch["title"]
            if INTRO_RE.search(title):
                note(f"{cid} 过滤介绍章「{title}」")
                continue
            valid = [p for p in raw_ch["poems"] if p.get("author")]
            dropped = len(raw_ch["poems"]) - len(valid)
            if dropped:
                note(f"{cid}「{title}」过滤 {dropped} 首无作者诗文")
            if not valid:
                note(f"{cid} 过滤空章「{title}」")
                continue
            kept_idx += 1
            for p in valid:
                # 重复诗去重：千家诗 × 唐诗蒙学 等共享 scraped id，或同文集内诗目重复；
                # 先编译的收编，后到的跳过
                if p["id"] in seen_ids:
                    note(f"{cid} 跳过重复诗「{p['title']}」（id 已入库）")
                    continue
                seen_ids.add(p["id"])
                author_name = p["author"]
                entry = name_to_author.get(author_name)
                if entry is None:
                    raise SystemExit(f"authors.json 缺少作者「{author_name}」（诗 {p['id']}）")
                # 诗名变体归一：数据源用「A / B」记录别名（如「淮上喜会梁川故人 / 淮上喜会梁州故人」），
                # 游戏内统一取第一段，避免诗名题选项出现歧义双题名
                raw_title = p["title"]
                norm_title = raw_title.split("/")[0].strip() or raw_title
                paragraphs = p["paragraphs"]
                segs = [s for para in paragraphs for s in split_paragraph(para)]
                poems.append(
                    {
                        "id": p["id"],
                        "collectionId": cid,
                        "chapterIndex": kept_idx,
                        "chapterTitle": title,
                        "authorId": entry["id"],
                        "authorName": author_name,
                        "dynastyId": p["dynasty"],
                        "title": norm_title,
                        "paragraphs": paragraphs,
                        "segs": segs,
                        "pairs": qualified_pairs(paragraphs),
                    }
                )
    return poems


# ---------------------------------------------------------------- 出题

def completion_distractors(answer: str, qid: str, pools: list[list[str]], quote: str = "") -> list[str]:
    picked: list[str] = []
    for level, pool in enumerate(pools):
        if 3 - len(picked) <= 0:
            break
        relax_len = level >= len(pools) - 1  # 最后一级放宽长度限制
        cands = [
            s
            for s in pool
            if s != answer and s != quote and (relax_len or abs(len(s) - len(answer)) <= 4)
        ]
        for cand in stable_order(cands, qid):
            if len(picked) >= 3:
                break
            if cand in picked:
                continue
            picked.append(cand)
    if len(picked) < 3:
        raise SkipPoem(f"{qid} 干扰项不足（answer={answer}）")
    return picked


def title_distractors(answer: str, qid: str, pools: list[list[str]]) -> list[str]:
    picked: list[str] = []
    prefix = answer.split("·")[0] if "·" in answer else None

    def bad(t: str) -> bool:
        if t == answer:
            return True
        if prefix is not None and t.split("·")[0] == prefix:
            return True
        return False

    for pool in pools:
        for cand in stable_order([t for t in pool if not bad(t)], qid):
            if len(picked) >= 3:
                break
            if cand in picked:
                continue
            picked.append(cand)
        if len(picked) >= 3:
            break
    if len(picked) < 3:
        raise SkipPoem(f"{qid} 诗名干扰项不足（answer={answer}）")
    return picked


def make_question(qid: str, qtype: str, prompt: str, quote: str, answer: str, distractors: list[str]) -> dict:
    opts = [answer] + distractors[:3]
    order = sorted(range(4), key=lambda i: md5(f"pos|{qid}|{opts[i]}"))
    choices = [opts[i] for i in order]
    return {
        "id": qid,
        "type": qtype,
        "prompt": prompt,
        "quote": quote,
        "choices": choices,
        "answerIndex": order.index(0),
    }


def build_questions(poem: dict, pools: dict) -> list[dict]:
    pairs = poem["pairs"]
    if not pairs:
        raise SkipPoem(f"无合格句对")
    segs = poem["segs"]
    qids = [f"{poem['id']}-q{i}" for i in range(1, 6)]
    seg_pool_order = [
        pools["seg_author"][poem["authorId"]],
        pools["seg_chapter"][(poem["collectionId"], poem["chapterIndex"])],
        pools["seg_collection"][poem["collectionId"]],
        pools["seg_dynasty"][poem["dynastyId"]],
        pools["seg_all"],
    ]
    title_pools = [
        pools["title_author"][poem["authorId"]],
        pools["title_collection"][poem["collectionId"]],
        pools["title_dynasty"][poem["dynastyId"]],
        pools["title_all"],
    ]

    pair1 = pairs[0]
    pair2 = pairs[1] if len(pairs) > 1 else pairs[0]
    pair3 = pairs[-1]
    questions = [
        make_question(
            qids[0],
            "complete-next",
            f"「{pair1[0]}」的下一句是？",
            pair1[0],
            pair1[1],
            completion_distractors(pair1[1], qids[0], seg_pool_order, quote=pair1[0]),
        ),
        make_question(
            qids[1],
            "complete-next",
            f"「{pair2[0]}」的下一句是？",
            pair2[0],
            pair2[1],
            completion_distractors(pair2[1], qids[1], seg_pool_order, quote=pair2[0]),
        ),
        make_question(
            qids[2],
            "complete-prev",
            f"「{pair3[1]}」的上一句是？",
            pair3[1],
            pair3[0],
            completion_distractors(pair3[0], qids[2], seg_pool_order, quote=pair3[1]),
        ),
    ]

    quote_a = clamp_seg(segs[0]) if segs else poem["title"]
    quote_b = clamp_seg(segs[1]) if len(segs) > 1 else quote_a
    questions.append(
        make_question(
            qids[3],
            "title",
            f"「{quote_a}，{quote_b}」出自哪一首？",
            f"{quote_a}，{quote_b}",
            poem["title"],
            title_distractors(poem["title"], qids[3], title_pools),
        )
    )
    pair_quotes = sorted({f"{a}，{b}" for a, b in pairs}, key=lambda s: md5(f"{qids[4]}|{s}"))
    chosen5 = next((s for s in pair_quotes if s != f"{quote_a}，{quote_b}"), pair_quotes[0])
    questions.append(
        make_question(
            qids[4],
            "title",
            f"「{chosen5}」出自哪一首？",
            chosen5,
            poem["title"],
            title_distractors(poem["title"], qids[4], title_pools),
        )
    )
    return questions


# ---------------------------------------------------------------- 素材池

def build_pools(poems: list[dict]) -> dict:
    seg_buckets: dict[tuple[str, object], list[str]] = {}
    title_buckets: dict[tuple[str, object], list[str]] = {}
    for p in poems:
        seg_buckets.setdefault(("author", p["authorId"]), []).extend(p["segs"])
        seg_buckets.setdefault(("chapter", (p["collectionId"], p["chapterIndex"])), []).extend(p["segs"])
        seg_buckets.setdefault(("collection", p["collectionId"]), []).extend(p["segs"])
        seg_buckets.setdefault(("dynasty", p["dynastyId"]), []).extend(p["segs"])
        seg_buckets.setdefault(("all", ""), []).extend(p["segs"])
        title_buckets.setdefault(("author", p["authorId"]), []).append(p["title"])
        title_buckets.setdefault(("collection", p["collectionId"]), []).append(p["title"])
        title_buckets.setdefault(("dynasty", p["dynastyId"]), []).append(p["title"])
        title_buckets.setdefault(("all", ""), []).append(p["title"])

    def pick(buckets: dict, kind: str) -> dict:
        return {k[1]: v for k, v in buckets.items() if k[0] == kind}

    return {
        "seg_author": pick(seg_buckets, "author"),
        "seg_chapter": pick(seg_buckets, "chapter"),
        "seg_collection": pick(seg_buckets, "collection"),
        "seg_dynasty": pick(seg_buckets, "dynasty"),
        "seg_all": seg_buckets[("all", "")],
        "title_author": pick(title_buckets, "author"),
        "title_collection": pick(title_buckets, "collection"),
        "title_dynasty": pick(title_buckets, "dynasty"),
        "title_all": title_buckets[("all", "")],
    }


# ---------------------------------------------------------------- 主流程

def main() -> None:
    index, collections_meta, dynasties_meta, name_to_author = load_site()
    site = load_open_collections(catalog.OPEN_COLLECTIONS)
    all_ids = [c["id"] for c in index["collections"]]
    for cid in catalog.OPEN_COLLECTIONS:
        if cid not in all_ids:
            raise SystemExit(f"未知文集 {cid}")

    print("① 解析诗文…")
    poems = parse_poems(site, name_to_author)
    # 无合格句对的诗先剔除，保证素材池/章节/作者计数与最终诗卡一致
    kept: list[dict] = []
    for p in poems:
        if not p["pairs"]:
            note(f"{p['collectionId']} 跳过「{p['title']}」（{p['id']}）：无合格句对")
            continue
        kept.append(p)
    poems = kept

    print("② 建立素材池…")
    pools = build_pools(poems)

    print("③ 出题（每诗 5 题）…")
    poems_out = []
    for p in poems:
        try:
            questions = build_questions(p, pools)
        except SkipPoem as e:
            note(f"{p['collectionId']} 跳过「{p['title']}」（{p['id']}）：{e}")
            continue
        bgs = [f"/art/bg/collections/{p['collectionId']}-{i}.png" for i in range(1, BGS_PER_COLLECTION + 1)]
        bg = bgs[int(md5(p["id"])[:8], 16) % BGS_PER_COLLECTION]
        poems_out.append(
            {
                "id": p["id"],
                "collectionId": p["collectionId"],
                "chapterIndex": p["chapterIndex"],
                "authorId": p["authorId"],
                "authorName": p["authorName"],
                "dynastyId": p["dynastyId"],
                "title": p["title"],
                "lines": p["segs"],
                "text": "".join(p["paragraphs"]),
                "background": bg,
                "questions": questions,
            }
        )

    print("④ 组装层级…")
    authors_out = []
    for aid, meta in catalog.AUTHORS.items():
        owned = [p for p in poems if p["authorId"] == aid]
        if not owned:
            continue
        authors_out.append(
            {
                "id": aid,
                "name": owned[0]["authorName"],
                "portrait": f"/sprites/poets/{aid}.png",
                "collectionIds": sorted({p["collectionId"] for p in owned}),
                "poemCount": len(owned),
                "guide": [
                    {"speaker": "other", "name": owned[0]["authorName"], "text": line}
                    for line in meta["guide"]
                ],
            }
        )
    compiled_author_ids = {a["id"] for a in authors_out}
    missing = {p["authorId"] for p in poems if p["authorId"] not in compiled_author_ids}
    if missing:
        raise SystemExit(f"catalog.AUTHORS 缺少已编译作者的手写条目: {sorted(missing)}")

    chapters_out = []
    for cid in catalog.OPEN_COLLECTIONS:
        prefix = collections_meta[cid]["title"]
        by_idx: dict[int, dict] = {}
        for p in poems:
            if p["collectionId"] != cid:
                continue
            ch = by_idx.setdefault(
                p["chapterIndex"],
                {
                    "id": f"{cid}-c{p['chapterIndex']}",
                    "collectionId": cid,
                    "index": p["chapterIndex"],
                    "title": p["chapterTitle"],
                    "authorIds": [],
                    "poemCount": 0,
                },
            )
            if p["authorId"] not in ch["authorIds"]:
                ch["authorIds"].append(p["authorId"])
            ch["poemCount"] += 1
        for ch in sorted(by_idx.values(), key=lambda c: c["index"]):
            display = ch["title"][len(prefix):] if ch["title"].startswith(prefix) else ch["title"]
            ch["title"] = display or ch["title"]
            n = ((ch["index"] - 1) % 10) + 1
            ch["art"] = f"/art/avatars/chapter-{n}.png"
            chapters_out.append(ch)
    chapters_out.sort(key=lambda c: (c["collectionId"], c["index"]))

    collections_out = []
    for c in index["collections"]:
        cid = c["id"]
        playable = cid in catalog.OPEN_COLLECTIONS
        meta = collections_meta[cid]
        own_chapters = [ch for ch in chapters_out if ch["collectionId"] == cid] if playable else []
        compiled_count = sum(1 for p in poems if p["collectionId"] == cid)
        collections_out.append(
            {
                "id": cid,
                "title": c["title"],
                "editor": meta.get("editor"),
                "dynasties": meta.get("dynasties", []),
                "playable": playable,
                "art": f"/art/avatars/collection-{cid}.png",
                "backgrounds": (
                    [f"/art/bg/collections/{cid}-{i}.png" for i in range(1, BGS_PER_COLLECTION + 1)]
                    if playable
                    else []
                ),
                "chapterIds": [ch["id"] for ch in own_chapters],
                "poemCount": compiled_count if playable else c["poemCount"],
            }
        )

    dynasties_out = [
        {
            "id": d["id"],
            "name": catalog.DYNASTIES.get(d["id"], {}).get("name", d["name"]),
            "art": f"/art/avatars/dynasty-{d['id']}.png",
        }
        for d in dynasties_meta["dynasties"]
    ]

    print("⑤ 生成成就定义…")
    achievements = []
    for a in authors_out:
        ac = catalog.AUTHORS[a["id"]]["achievement"]
        achievements.append(
            {
                "id": f"author-{a['id']}",
                "kind": "author",
                "title": ac["title"],
                "subtitle": ac["subtitle"],
                "hint": f"通关{a['name']}的全部 {a['poemCount']} 首诗卡",
                "art": a["portrait"],
            }
        )
    for c in collections_out:
        if not c["playable"]:
            continue
        ac = catalog.COLLECTIONS[c["id"]]
        achievements.append(
            {
                "id": f"collection-{c['id']}",
                "kind": "collection",
                "title": f"读罢{c['title']}",
                "subtitle": ac["subtitle"],
                "hint": f"通关{c['title']}全部 {c['poemCount']} 首诗卡",
                "art": c["art"],
            }
        )
    for did in sorted({p["dynastyId"] for p in poems}):
        total = sum(1 for p in poems if p["dynastyId"] == did)
        dname = catalog.DYNASTIES.get(did, {}).get("name", did)
        sub = catalog.DYNASTIES.get(did, {}).get("subtitle", f"{dname}风华")
        achievements.append(
            {
                "id": f"dynasty-{did}",
                "kind": "dynasty",
                "title": f"走遍{dname}",
                "subtitle": sub,
                "hint": f"通关{dname}已上线的全部 {total} 首诗卡",
                "art": f"/art/avatars/dynasty-{did}.png",
            }
        )

    bank = {
        "version": 2,
        "collections": collections_out,
        "chapters": chapters_out,
        "authors": authors_out,
        "poems": poems_out,
        "dynasties": dynasties_out,
        "achievements": achievements,
    }
    OUT.write_text(json.dumps(bank, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    q_total = sum(len(p["questions"]) for p in poems_out)
    print(
        f"✔ bank.json：{len(collections_out)} 文集（开放 {len(catalog.OPEN_COLLECTIONS)}）、"
        f"{len(chapters_out)} 章节、{len(authors_out)} 作者、{len(poems_out)} 诗卡、{q_total} 题、"
        f"{len(achievements)} 成就"
    )


if __name__ == "__main__":
    main()
