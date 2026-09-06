#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""生图共享库（唯一权威规格：docs/art.md）。"""

from __future__ import annotations

import base64
import io
import os
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import requests
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
MODEL = "gpt-image-2"
PROVIDERS = [
    ("https://qkmss.com", "sk-0WzkItJkVxATv4QiWCvy8rNaZssTXNbh79FWC2uRIgLlPDl2"),
    ("http://38.76.215.125:13001", "sk-5LrPxbz-SJT5PtLFfWg164_2FLrGBdbA"),
    ("https://img.hezubus.cc", "sk-ni28HxjqgMJOa5MFbUapf1UIoZPoX7IHEsIAHpEMpkOMHPt2"),
]
STYLE = "古风儿童绘本插画，Q版可爱，圆脸大眼，线条干净简洁，青绿色与米白色为主的淡雅配色，柔和上色，画面干净"
# 背景专用风格：不带任何人物偏置词（Q版/圆脸大眼会诱导模型画人）
BG_STYLE = "古风儿童绘本场景插画，纯风景空镜，线条干净简洁，青绿色与米白色为主的淡雅配色，柔和上色，画面干净"
NO_TEXT = "画面中不出现任何文字、字母、水印、印章文字"
NO_PERSON = "空无一人的场景：画面中只有建筑、花木、山水、器物等景物，绝对不出现任何人物、卡通角色、人物剪影、人脸"
GEN_TIMEOUT = 300
EDIT_TIMEOUT = 120
# 成功生成的 url 落盘 manifest：下载失败/丢失后可人工补下载，不再重扣生成费
URL_MANIFEST = ROOT / ".tmp-catalog" / "gen_urls.log"

# 运行期 provider 健康/节流状态（进程内）：
# - 额度耗尽（403 insufficient_user_quota）→ 本进程内拉黑
# - 429 → 指数退避重试
# - 每次请求前按 provider 强制最小间隔，避免突发限流
_dead: set[int] = set()
_last_start: dict[int, float] = {}
_MIN_INTERVAL = {0: 0.0, 1: 8.0, 2: 4.0}


def _wait_slot(idx: int) -> None:
    interval = _MIN_INTERVAL.get(idx, 0.0)
    while True:
        now = time.monotonic()
        ready = _last_start.get(idx, 0.0) + interval
        if now >= ready:
            _last_start[idx] = now
            return
        time.sleep(min(ready - now, 1.0))


def bg_prompt(scene: str) -> str:
    return f"{scene}。{BG_STYLE}。竖版构图，下三分之一留空。{NO_PERSON}。{NO_TEXT}。"


def avatar_prompt(motif: str) -> str:
    return f"单个{motif}居中。{STYLE}。纯透明背景，四周留白。{NO_TEXT}。"


def _download(item: dict, attempts: int = 4) -> bytes:
    """成品图下载与生成分离：hezubus 的代理下载偶尔极慢，独立重试不重扣生成。
    直连失败后自动切本地代理 7897（仅运行时环境变量，不落任何配置）。"""
    last: Exception | None = None
    for i in range(attempts):
        try:
            if item.get("b64_json"):
                return base64.b64decode(item["b64_json"])
            if item.get("url"):
                proxies = {"http": "http://127.0.0.1:7897", "https": "http://127.0.0.1:7897"} if i >= 2 else None
                return requests.get(item["url"], timeout=300, proxies=proxies).content
            raise RuntimeError("response has no image")
        except Exception as e:  # noqa: BLE001
            last = e
            print(f"    [dl] #{i + 1}: {type(e).__name__}: {str(e)[:100]}", flush=True)
            time.sleep(5)
    raise last  # type: ignore[misc]


def generations(prompt: str, size: str, transparent: bool, attempts: int = 8) -> bytes:
    """跳过已拉黑的 provider，其余轮换；429 指数退避；额度耗尽即拉黑。"""
    last: Exception | None = None
    only = os.environ.get("ART_ONLY")  # 调试/分流：只允许指定下标的 provider
    for i in range(attempts):
        alive = [p for p in (0, 1, 2) if p not in _dead and (only is None or str(p) == only)]
        if not alive:
            raise RuntimeError(f"generations failed: 全部 provider 不可用（last={last}）")
        p = alive[i % len(alive)]
        base, key = PROVIDERS[p]
        try:
            _wait_slot(p)
            payload: dict = {"model": MODEL, "prompt": prompt, "size": size, "n": 1, "output_format": "png"}
            if transparent:
                payload["background"] = "transparent"
            r = requests.post(
                f"{base}/v1/images/generations",
                json=payload,
                headers={"Authorization": f"Bearer {key}"},
                timeout=GEN_TIMEOUT,
            )
            if r.status_code == 403 and "insufficient_user_quota" in r.text:
                _dead.add(p)
                print(f"    [gen] provider{p} 额度耗尽，拉黑", flush=True)
                continue
            if r.status_code == 429:
                wait = min(10 * (i + 1), 60)
                print(f"    [gen] provider{p} 429，退避 {wait}s", flush=True)
                time.sleep(wait)
                continue
            r.raise_for_status()
            data0 = r.json()["data"][0]
            if data0.get("url"):
                URL_MANIFEST.parent.mkdir(parents=True, exist_ok=True)
                with open(URL_MANIFEST, "a", encoding="utf-8") as mf:
                    mf.write(f"{int(time.time())}\t{data0['url']}\n")
            return _download(data0)
        except Exception as e:  # noqa: BLE001
            last = e
            print(f"    [gen] provider{p} #{i + 1}: {type(e).__name__}: {str(e)[:120]}", flush=True)
            time.sleep(2)
    raise RuntimeError(f"generations failed: {last}")


def edits(prompt: str, ref_path: Path, size: str, attempts: int = 6) -> bytes:
    """参考图变体：仅备用 provider 支持 edits；120s 快速重试，不拉长超时。"""
    ref = Path(ref_path).read_bytes()
    base, key = PROVIDERS[1]
    last: Exception | None = None
    for i in range(attempts):
        try:
            r = requests.post(
                f"{base}/v1/images/edits",
                files={"image": ("ref.png", ref, "image/png")},
                data={"prompt": prompt, "model": MODEL, "size": size, "n": "1"},
                headers={"Authorization": f"Bearer {key}"},
                timeout=EDIT_TIMEOUT,
            )
            r.raise_for_status()
            data0 = r.json()["data"][0]
            if data0.get("url"):
                URL_MANIFEST.parent.mkdir(parents=True, exist_ok=True)
                with open(URL_MANIFEST, "a", encoding="utf-8") as mf:
                    mf.write(f"{int(time.time())}\t{data0['url']}\n")
            return _download(data0)
        except Exception as e:  # noqa: BLE001
            last = e
            print(f"    [edit] #{i + 1}: {type(e).__name__}: {e}", flush=True)
            time.sleep(2)
    raise RuntimeError(f"edits failed: {last}")


def finish(path: Path, data: bytes, size: str, transparent: bool) -> Path:
    """落盘 + 尺寸归一 + alpha 语义校验。"""
    path.parent.mkdir(parents=True, exist_ok=True)
    im = Image.open(io.BytesIO(data)).convert("RGBA")
    want = tuple(int(x) for x in size.split("x"))
    if im.size != want:
        im = im.resize(want, Image.LANCZOS)
    if not transparent:
        im = Image.alpha_composite(Image.new("RGBA", im.size, (255, 255, 255, 255)), im).convert("RGB")
    im.save(path)
    check = Image.open(path)
    if transparent:
        lo, _ = check.getchannel("A").getextrema()
        if lo > 250:
            raise RuntimeError(f"{path.name}: 应为透明底但未检出透明像素")
    return path


def valid(path: Path, size: str, transparent: bool) -> bool:
    if not path.exists():
        return False
    try:
        im = Image.open(path)
        want = tuple(int(x) for x in size.split("x"))
        if im.size != want:
            return False
        if transparent:
            if im.mode != "RGBA":
                return False
            lo, _ = im.getchannel("A").getextrema()
            if lo > 250:
                return False
        return path.stat().st_size > 10_000
    except Exception:  # noqa: BLE001
        return False


def run_items(items: list[dict], force: bool = False, only: str | None = None, workers: int = 4) -> None:
    """items: [{name, prompt, size, transparent, path}]，幂等并发执行。"""
    todo = [it for it in items if (only is None or it["name"] == only)]
    skipped = 0
    results: list[tuple[str, str]] = []

    def one(it: dict) -> tuple[str, str]:
        path = Path(it["path"])
        if not force and valid(path, it["size"], it["transparent"]):
            return it["name"], "skip(已存在)"
        data = generations(it["prompt"], it["size"], it["transparent"])
        finish(path, data, it["size"], it["transparent"])
        return it["name"], f"ok {path.stat().st_size // 1024}KB"

    runnable = [it for it in todo if not (not force and valid(Path(it["path"]), it["size"], it["transparent"]))]
    skipped = len(todo) - len(runnable)
    if skipped:
        print(f"  跳过 {skipped} 张（已存在且校验通过）", flush=True)
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {pool.submit(one, it): it["name"] for it in runnable}
        for fut in as_completed(futures):
            name = futures[fut]
            try:
                _, msg = fut.result()
                print(f"  ✔ {name}: {msg}", flush=True)
                results.append((name, msg))
            except Exception as e:  # noqa: BLE001
                print(f"  ✘ {name}: {e}", flush=True)
                results.append((name, f"FAIL {e}"))
    bad = [r for r in results if r[1].startswith("FAIL")]
    print(f"== {len(results)} 处理 / {len(bad)} 失败 ==", flush=True)
    if bad:
        raise SystemExit(1)
