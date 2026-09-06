#!/usr/bin/env python3
"""Scrape the Chinese-poetry web reader (awesome-poetry.top/huajianji/) into structured JSON.

Site hierarchy (verified 2026-08):
  /huajianji/                          index; 「中文诗歌」 cards -> ./www/<集名>.html or ./www/list/<集名>.html
  /huajianji/www/<集名>.html           collection page -> ../www/list/<卷名>.html links (+ optional editor line)
  /huajianji/www/list/<卷名>.html      chapter page   -> ../../www/poetrys/<id>.html links
  /huajianji/www/poetrys/<id>.html     poem page: .title / .author / .content p* / .meta (chapter backlink, tags) / optional #notes

Output (default data/poetry-site/):
  index.json                 provenance + per-collection stats
  <collectionId>.json        one self-contained file per collection

Usage:
  python3 scripts/content/scrape-poetry-site.py            # incremental (uses /tmp cache)
  python3 scripts/content/scrape-poetry-site.py --fresh    # ignore cache, refetch everything
"""

from __future__ import annotations

import argparse
import concurrent.futures as futures
import hashlib
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass, field
from html.parser import HTMLParser
from pathlib import Path

BASE = "https://awesome-poetry.top/huajianji/"
CACHE_DIR = Path("/tmp/poetry-site-cache")
PROXY: dict[str, str | None] = {"url": None, "on": False}  # set via --proxy (per-run, not persisted)

# Stable ASCII ids for the known collections; unknown ones fall back to a hash slug.
COLLECTION_IDS = {
    "花间集": "huajianji",
    "南唐二主词": "nantang-erzhu-ci",
    "唐诗三百首": "tangshi-sanbaishou",
    "宋词三百首": "songci-sanbaishou",
    "教科书选诗": "jiaokeshu-xuanshi",
    "古诗十九首": "gushi-shijiu-shou",
    "诗经": "shijing",
    "千家诗": "qianjiashi",
    "声律启蒙": "shenglv-qimeng",
    "三字经": "sanzijing",
    "唐诗三百首·蒙学": "tangshi-mengxue",
}

CN_DIGITS = {"零": 0, "一": 1, "二": 2, "两": 2, "三": 3, "四": 4, "五": 5,
             "六": 6, "七": 7, "八": 8, "九": 9}
CN_UNITS = {"十": 10, "百": 100, "千": 1000}


def cn_num_to_int(s: str) -> int | None:
    """Parse Chinese numerals like 十 / 十一 / 二十 / 一百零五; None if not parseable."""
    if not s:
        return None
    total, segment = 0, 0
    for ch in s:
        if ch in CN_DIGITS:
            segment = segment * 10 + CN_DIGITS[ch] if segment >= 10 or total else CN_DIGITS[ch]
            # handle 一百零五 style: digit after 零 starts fresh segment
            if ch == "零":
                segment = 0
        elif ch in CN_UNITS:
            unit = CN_UNITS[ch]
            if segment == 0:
                segment = 1
            total += segment * unit
            segment = 0
        else:
            return None
    return total + segment


# ---------------------------------------------------------------- HTML parsing

class PageParser(HTMLParser):
    """Extract fields from collection / chapter / poem pages.

    Page-specific conventions (from the generated HTML):
      - .title            page title (poem name / chapter name / collection name)
      - .author           poem author (poem pages only)
      - div[class~=content] with exact class "content" -> poem body paragraphs
      - div class "meta content" / "content meta"        -> meta lines (editor, chapter link, tags)
      - div#notes         optional: h3 section header + div.notes.content p items
    """

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.title: str | None = None
        self.author: str | None = None
        self.paragraphs: list[str] = []
        self.meta_lines: list[str] = []          # text lines inside meta div (no links)
        self.meta_links: list[tuple[str, str]] = []  # (href, text) inside meta div
        self.notes_sections: list[dict] = []     # [{"kind": "注释", "items": [...]}]

        self._stack: list[tuple[str, dict | None]] = []
        self._buf: list[str] = []
        self._capture: str | None = None  # title | author | body-p | meta-p | meta-a | note-h3 | note-p
        self._cur_note_section: dict | None = None
        self._in_notes = False
        self._div_classes: list[str] | None = None

    # -- helpers ------------------------------------------------------------
    @staticmethod
    def _classes(attrs) -> list[str]:
        d = dict(attrs or [])
        return d.get("class", "").split()

    def handle_starttag(self, tag, attrs):
        ad = dict(attrs)
        cls = self._classes(attrs)
        if tag == "div":
            if ad.get("id") == "notes":
                self._in_notes = True
            self._stack.append(("div", ad))
            if "title" in cls and self.title is None:
                self._capture = "title"
                self._buf = []
            elif "author" in cls:
                self._capture = "author"
                self._buf = []
            elif cls == ["content"]:
                # poem body container (exact match avoids "meta content" boxes)
                self._div_classes = cls
            elif "content" in cls and "meta" in cls:
                self._div_classes = cls
            elif self._in_notes and "notes" in cls and "content" in cls:
                self._cur_note_section = self._cur_note_section or {"kind": None, "items": []}
        elif tag == "p":
            if self._div_classes == ["content"]:
                self._capture = "body-p"
                self._buf = []
            elif self._div_classes and "meta" in self._div_classes:
                self._capture = "meta-p"
                self._buf = []
            elif self._in_notes and self._cur_note_section is not None:
                self._capture = "note-p"
                self._buf = []
        elif tag == "a" and self._div_classes and "meta" in self._div_classes:
            self._capture = "meta-a"
            self._buf = []
            self._meta_href = ad.get("href", "")
        elif tag == "h3" and self._in_notes:
            self._capture = "note-h3"
            self._buf = []

    def handle_endtag(self, tag):
        text = re.sub(r"\s+", " ", "".join(self._buf)).strip()
        if tag == "p" or tag == "a" or tag == "h3":
            if self._capture == "body-p":
                if text:
                    self.paragraphs.append(text)
            elif self._capture == "meta-p":
                if text:
                    self.meta_lines.append(text)
            elif self._capture == "meta-a":
                self.meta_links.append((self._meta_href, text))
            elif self._capture == "note-h3":
                if self._cur_note_section is None:
                    self._cur_note_section = {"kind": text or "注释", "items": []}
                else:
                    self._cur_note_section["kind"] = text or "注释"
                self.notes_sections.append(self._cur_note_section)
            elif self._capture == "note-p":
                if self._cur_note_section is not None and text:
                    self._cur_note_section["items"].append(text)
            self._capture = None
            self._buf = []
        elif tag == "div":
            if self._div_classes is not None:
                self._div_classes = None
            if self._stack and self._stack[-1][0] == "div":
                _, ad = self._stack.pop()
                if ad and ad.get("id") == "notes":
                    self._in_notes = False
                    self._cur_note_section = None
        if tag == "div" and self._capture in ("title", "author"):
            # closed by div end (handled above) — keep text
            if self._capture == "title" and text and self.title is None:
                self.title = text
                self._capture = None
            elif self._capture == "author" and text:
                self.author = text
                self._capture = None

    def handle_data(self, data):
        if self._capture:
            self._buf.append(data)


def clean_line(s: str) -> str:
    return re.sub(r"\s+", " ", s.replace("\u3000", " ").replace("\xa0", " ")).strip()


def parse_page(html: str) -> dict:
    p = PageParser()
    p.feed(html)
    return {
        "title": p.title,
        "author": p.author,
        "paragraphs": p.paragraphs,
        "meta_lines": p.meta_lines,
        "meta_links": p.meta_links,
        "notes_sections": p.notes_sections,
    }


# ---------------------------------------------------------------- fetching

def _http_get(url: str, timeout: int = 25, proxy: str | None = None) -> bytes:
    handlers = []
    if proxy:
        handlers.append(urllib.request.ProxyHandler({"http": proxy, "https": proxy}))
    opener = urllib.request.build_opener(*handlers)
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (data-scrape; tangxiaoshi)"})
    with opener.open(req, timeout=timeout) as resp:
        return resp.read()


def _store(url: str, raw: bytes, use_cache: bool) -> str:
    text = raw.decode("utf-8", errors="replace")
    if use_cache:
        key = hashlib.sha1(url.encode()).hexdigest()
        cache_file = CACHE_DIR / f"{key}.html"
        cache_file.parent.mkdir(parents=True, exist_ok=True)
        cache_file.write_text(text, "utf-8")
    return text


def fetch(url: str, use_cache: bool = True, proxy_fallback: str | None = "http://127.0.0.1:7897") -> str:
    """Direct-first; if direct fails/times out, try the local proxy once per attempt."""
    key = hashlib.sha1(url.encode()).hexdigest()
    cache_file = CACHE_DIR / f"{key}.html"
    if use_cache and cache_file.exists():
        return cache_file.read_text("utf-8")
    forced = PROXY.get("url") if PROXY.get("on") else None
    last_err: Exception | None = None
    for attempt in range(4):
        try:
            return _store(url, _http_get(url, timeout=10), use_cache)
        except Exception as e:  # noqa: BLE001 - retry any network error
            last_err = e
            fb = forced or (proxy_fallback if attempt >= 1 else None)
            if fb:
                try:
                    return _store(url, _http_get(url, timeout=20, proxy=fb), use_cache)
                except Exception as e2:  # noqa: BLE001
                    last_err = e2
            time.sleep(1.5 * (attempt + 1))
    raise RuntimeError(f"fetch failed after retries: {url}: {last_err}")


def to_abs(href: str, base: str) -> str:
    """Resolve a relative href to an absolute URL, percent-encoding non-ASCII."""
    joined = urllib.parse.urljoin(base, href)
    parts = urllib.parse.urlsplit(joined)
    path = urllib.parse.quote(urllib.parse.unquote(parts.path), safe="/()~,;@=")
    return urllib.parse.urlunsplit((parts.scheme, parts.netloc, path, parts.query, ""))


# ---------------------------------------------------------------- crawl model

@dataclass
class Chapter:
    title: str
    url: str
    order: int
    poem_urls: list[str] = field(default_factory=list)


@dataclass
class Collection:
    title: str
    url: str
    id: str
    editor_lines: list[str] = field(default_factory=list)
    chapters: list[Chapter] = field(default_factory=list)
    loose_poem_urls: list[str] = field(default_factory=list)  # poems linked directly on the collection page


LIST_LINK_RE = re.compile(r"/www/list/[^?]*\.html$")
POEM_LINK_RE = re.compile(r"/www/poetrys/\d+\.html$")


def chapter_sort_key(chapters: list[Chapter]) -> list[Chapter]:
    """Sort 卷第一/卷第二… style chapters numerically; otherwise keep document order."""
    pat = re.compile(r"^(.*)第([零一二三四五六七八九十百千两]+)(.*)$")
    matches = [pat.match(c.title) for c in chapters]
    if all(matches) and len({(m.group(1), m.group(3)) for m in matches}) == 1:
        nums = [cn_num_to_int(m.group(2)) for m in matches]
        if all(n is not None for n in nums):
            return [c for _, c in sorted(zip(nums, chapters), key=lambda t: t[0])]
    return chapters


def parse_note_item(text: str) -> dict:
    """'[1] 「小山」 写女子的…' / '[1] 小山：写女子的…' -> structured; else raw."""
    m = re.match(r"^\[(\d+)\]\s*(.*)$", text)
    idx, rest = (m.group(1), m.group(2)) if m else (None, text)
    ref = None
    m2 = re.match(r"^「([^」]+)」\s*(.*)$", rest)
    if m2:
        ref, rest = m2.group(1), m2.group(2)
    else:
        m3 = re.match(r"^([^：:]{1,12})[：:](.*)$", rest)
        if m3 and len(m3.group(1)) <= 12:
            ref, rest = m3.group(1), m3.group(2)
    out: dict = {}
    if idx:
        out["index"] = int(idx)
    if ref:
        out["ref"] = ref
    out["text"] = rest.strip() if rest.strip() else text
    return out


# ---------------------------------------------------------------- body repair

def _t2s_factory():
    """Return a trad->simpl converter, or identity when opencc is unavailable."""
    try:
        import opencc
        cc = opencc.OpenCC("t2s")
        return lambda s: cc.convert(s or "")
    except Exception:  # noqa: BLE001 - optional dependency
        return lambda s: s or ""


def _norm_key(title: str, author: str, t2s) -> tuple[str, str]:
    a = t2s(author or "")
    for sep in ("（", "("):
        if sep in a:
            a = a.split(sep)[0].strip()
    return t2s(re.sub(r"\s+", "", title or "")), a


def _load_upstream_bodies(upstream_dir: Path) -> dict[tuple[str, str], tuple[str, list[str]]]:
    """Flatten chinese-poetry 蒙学 json files into {(t2s title, author): (src, paragraphs)}."""
    table: dict[tuple[str, str], tuple[str, list[str]]] = {}
    t2s = _t2s_factory()
    files = sorted((upstream_dir / "蒙学").glob("*.json")) if (upstream_dir / "蒙学").exists() else []
    for f in files:
        try:
            data = json.loads(f.read_text("utf-8"))
        except Exception as e:  # noqa: BLE001
            print(f"  upstream {f.name}: unreadable ({e})", file=sys.stderr)
            continue
        entries: list[tuple[str, str, list]] = []
        if isinstance(data, dict) and isinstance(data.get("content"), list):
            for group in data["content"]:
                for e in group.get("content", []):
                    entries.append((e.get("chapter", ""), e.get("author", ""), e.get("paragraphs") or []))
        elif isinstance(data, list):
            for e in data:
                entries.append((e.get("title", ""), e.get("author", ""), e.get("paragraphs") or []))
        for title, author, paras in entries:
            if paras and any(str(p).strip() for p in paras):
                table.setdefault(_norm_key(title, author, t2s),
                                 (f"chinese-poetry:蒙学/{f.name}", [str(p) for p in paras]))
    return table


def repair_empty_bodies(poems: dict[str, dict], collections: list[Collection],
                        collection_order: list[str], upstream_dir: Path | None) -> tuple[int, int]:
    """Fill empty bodies from same-title donors (site data holes in 千家诗/蒙学).

    Donor priority: same collection -> other collections (by index order) -> upstream repo.
    Adds `paragraphsSource` provenance on repaired poems. Returns (site, upstream) counts.
    """
    t2s = _t2s_factory()
    empties = [p for p in poems.values() if not p["paragraphs"]]
    if not empties:
        return 0, 0

    url_col: dict[str, str] = {}
    for col in collections:
        for ch in col.chapters:
            for u in ch.poem_urls:
                url_col[u] = col.id
        for u in col.loose_poem_urls:
            url_col[u] = col.id

    donors: dict[tuple[str, str], list[dict]] = {}
    for p in poems.values():
        if p["paragraphs"]:
            donors.setdefault(_norm_key(p["title"], p["author"], t2s), []).append(p)

    order_rank = {cid: i for i, cid in enumerate(collection_order)}

    def sort_key(d: dict) -> tuple[int, int]:
        donor_col = url_col.get(d["url"], "")
        same = 0 if donor_col == url_col.get(p_url) else 1
        return same, order_rank.get(donor_col, 99)

    upstream = _load_upstream_bodies(upstream_dir) if upstream_dir else {}
    fixed_site = fixed_up = 0
    for p in empties:
        p_url = p["url"]
        key = _norm_key(p["title"], p["author"], t2s)
        cands = sorted((d for d in donors.get(key, []) if d["id"] != p["id"]), key=sort_key)
        if cands:
            d = cands[0]
            p["paragraphs"] = d["paragraphs"]
            p["paragraphsSource"] = {"from": f"poetry-site:{url_col.get(d['url'], '?')}#{d['id']}",
                                     "title": d["title"]}
            fixed_site += 1
        elif key in upstream:
            src, paras = upstream[key]
            p["paragraphs"] = paras
            p["paragraphsSource"] = {"from": src, "title": p["title"]}
            fixed_up += 1
    return fixed_site, fixed_up



def crawl(out_dir: Path, workers: int, fresh: bool, upstream_dir: Path | None = None) -> None:
    use_cache = not fresh
    index_html = fetch(BASE, use_cache)
    doc = parse_page(index_html)

    # The index page has multiple .title divs; collect collection links instead of titles.
    seeds: list[tuple[str, str]] = []  # (abs url, title card text)
    seen: set[str] = set()
    for href in re.findall(r'href="(\./www/[^"]+\.html)"', index_html):
        url = to_abs(href, BASE)
        if url not in seen:
            seen.add(url)
            seeds.append((url, ""))

    print(f"index: found {len(seeds)} collections")

    collections: list[Collection] = []
    chapter_urls: dict[str, list[str]] = {}

    def load_collection(url: str, title_hint: str) -> Collection:
        html = fetch(url, use_cache)
        d = parse_page(html)
        title = d["title"] or title_hint or urllib.parse.unquote(url.rstrip("/").rsplit("/", 1)[-1])[:-5]
        col_id = COLLECTION_IDS.get(title) or "col-" + hashlib.md5(title.encode()).hexdigest()[:8]
        col = Collection(title=title, url=url, id=col_id)
        col.editor_lines = [ln for ln in d["meta_lines"] if ln != "主页"]
        for href in re.findall(r'href="((?:\.\./)+www/list/[^"]+\.html)"', html):
            chap_url = to_abs(href, url)
            chapter_urls.setdefault(url, []).append(chap_url)
        for href in re.findall(r'href="((?:\.\./)+www/poetrys/\d+\.html)"', html):
            col.loose_poem_urls.append(to_abs(href, url))
        return col

    # 1) collection pages (sequential: cheap, ~11 requests).
    #    The 关于 paragraph on the index links mirrored entries (www/唐诗三百首.html vs
    #    www/list/唐诗三百首.html) — dedupe by title, keeping the first (card) entry.
    for url, hint in seeds:
        col = load_collection(url, hint)
        if any(c.title == col.title for c in collections):
            print(f"  skip duplicate collection page for {col.title}: {url}")
            continue
        collections.append(col)
        print(f"  collection {col.title} ({col.id}): {len(chapter_urls.get(url, []))} chapters, "
              f"{len(col.loose_poem_urls)} direct poems")

    # 2) chapter pages per collection (sequential listing; body fetch parallel later)
    def fetch_chapter(u: str) -> tuple[str, str | None, str | None]:
        try:
            return u, fetch(u, use_cache), None
        except Exception as e:  # noqa: BLE001
            return u, None, str(e)

    for col in collections:
        urls = list(dict.fromkeys(chapter_urls.get(col.url, [])))  # dedupe, keep doc order
        with futures.ThreadPoolExecutor(max_workers=workers) as ex:
            pages = list(ex.map(fetch_chapter, urls))
        # second chance for transient failures (a missing chapter is a data hole -> fail loudly)
        fixed: list[tuple[str, str | None, str | None]] = []
        for u, html, err in pages:
            if html is None:
                print(f"  retrying chapter {u} ({err})", file=sys.stderr)
                try:
                    html = fetch(u, use_cache)
                except Exception as e:  # noqa: BLE001
                    raise SystemExit(f"chapter fetch failed: {u}: {e}")
            fixed.append((u, html, None))
        pages = fixed
        for order, (chap_url, html, _err) in enumerate(pages, 1):
            d = parse_page(html or "")
            ch = Chapter(title=d["title"] or urllib.parse.unquote(
                chap_url.rstrip("/").rsplit("/", 1)[-1])[:-5], url=chap_url, order=order)
            for href in re.findall(r'href="(\.\./\.\./www/poetrys/\d+\.html)"', html):
                ch.poem_urls.append(to_abs(href, chap_url))
            col.chapters.append(ch)
        col.chapters = chapter_sort_key(col.chapters)
        n = sum(len(c.poem_urls) for c in col.chapters) + len(col.loose_poem_urls)
        print(f"  {col.title}: {len(col.chapters)} chapters, {n} poem refs")

    # 3) poem pages — dedupe globally, fetch once, parse once
    poem_urls: set[str] = set()
    for col in collections:
        for ch in col.chapters:
            poem_urls.update(ch.poem_urls)
        poem_urls.update(col.loose_poem_urls)
    print(f"total unique poem pages: {len(poem_urls)}")

    poems: dict[str, dict] = {}
    failed: list[str] = []
    url_list = sorted(poem_urls)

    def fetch_poem(u: str) -> tuple[str, dict | None, str | None]:
        try:
            html = fetch(u, use_cache)
            return u, parse_page(html), None
        except Exception as e:  # noqa: BLE001
            return u, None, str(e)

    done = 0
    with futures.ThreadPoolExecutor(max_workers=workers) as ex:
        for u, d, err in ex.map(fetch_poem, url_list):
            done += 1
            if done % 100 == 0:
                print(f"  fetched {done}/{len(url_list)} poems")
            if err:
                failed.append(u)
                continue
            tags = []
            for line in d["meta_lines"]:
                if line and line not in tags:
                    tags.append(line)
            notes = []
            for sec in d["notes_sections"]:
                notes.append({
                    "kind": sec["kind"] or "注释",
                    "items": [parse_note_item(it) for it in sec["items"]],
                })
            poems[u] = {
                "id": u.rsplit("/", 1)[-1][:-5],
                "title": d["title"],
                "author": d["author"],
                "paragraphs": d["paragraphs"],
                "tags": tags,
                "notes": notes,
                "url": u,
            }
    if failed:
        print(f"WARNING: {len(failed)} poem pages failed to fetch", file=sys.stderr)

    # 3.5) repair empty bodies from same-title donors (site holes) + optional upstream repo
    fixed_site, fixed_up = repair_empty_bodies(
        poems, collections, [c.id for c in collections],
        upstream_dir if upstream_dir and upstream_dir.exists() else None)
    if fixed_site or fixed_up:
        print(f"repaired empty bodies: {fixed_site} from site donors, {fixed_up} from upstream")

    # 4) write output
    out_dir.mkdir(parents=True, exist_ok=True)
    index_out = {
        "source": BASE,
        "sourceName": "中文诗歌 (chinese-poetry web reader)",
        "scrapedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "collections": [],
    }
    for col in collections:
        col_poems: list[dict] = []

        def poem_ref(u: str) -> dict | None:
            return poems.get(u)

        chapters_out = []
        for ch in col.chapters:
            items = [p for p in (poem_ref(u) for u in ch.poem_urls) if p]
            chapters_out.append({
                "title": ch.title,
                "url": ch.url,
                "poemCount": len(items),
                "poems": items,
            })
        loose = [p for p in (poem_ref(u) for u in col.loose_poem_urls) if p]
        if loose:
            chapters_out.append({
                "title": col.title,
                "url": col.url,
                "poemCount": len(loose),
                "poems": loose,
            })
        count = sum(c["poemCount"] for c in chapters_out)
        ids = [p["poems"][i]["id"] for p in chapters_out for i in range(p["poemCount"])]
        dupes = len(ids) - len(set(ids))
        entry = {
            "id": col.id,
            "title": col.title,
            "url": col.url,
            "editor": col.editor_lines[0] if col.editor_lines else None,
            "chapterCount": len(chapters_out),
            "poemCount": count,
            "duplicatePoemRefs": dupes,
            "file": f"{col.id}.json",
        }
        index_out["collections"].append(entry)
        payload = {
            "collection": {k: v for k, v in entry.items() if k != "file"},
            "chapters": chapters_out,
        }
        (out_dir / f"{col.id}.json").write_text(
            json.dumps(payload, ensure_ascii=False, indent=2) + "\n", "utf-8")
        print(f"  wrote {col.id}.json: {count} poems, {len(chapters_out)} chapters"
              + (f", {dupes} duplicate refs" if dupes else ""))

    (out_dir / "index.json").write_text(
        json.dumps(index_out, ensure_ascii=False, indent=2) + "\n", "utf-8")

    total = sum(c["poemCount"] for c in index_out["collections"])
    print(f"\nDONE: {len(collections)} collections, {total} poem refs -> {out_dir}/index.json")
    if failed:
        print(f"failed urls ({len(failed)}):", file=sys.stderr)
        for u in failed:
            print(f"  {u}", file=sys.stderr)
        sys.exit(1)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--out", default="data/poetry-site", help="output directory")
    ap.add_argument("--workers", type=int, default=8, help="parallel fetch workers")
    ap.add_argument("--fresh", action="store_true", help="ignore /tmp cache and refetch")
    ap.add_argument("--proxy", default=None,
                    help="force all requests through this proxy, e.g. http://127.0.0.1:7897")
    ap.add_argument("--upstream", default="/tmp/chinese-poetry",
                    help="chinese-poetry clone used to backfill bodies the site lost (default /tmp/chinese-poetry)")
    args = ap.parse_args()
    if args.proxy:
        PROXY["url"], PROXY["on"] = args.proxy, True
    crawl(Path(args.out), args.workers, args.fresh, Path(args.upstream) if args.upstream else None)


if __name__ == "__main__":
    main()
