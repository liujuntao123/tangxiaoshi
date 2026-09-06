#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""UI 素材第二批（2026-09 精致化轮，public/ui/）：标题横匾、铜锁、空白印框、花枝角饰。

与 ui.py 同族（docs/art.md 规范：透明底、画面无文字），但横匾需要「按内容裁剪」的
后处理——上游可能忽略 size 参数返回方图，所以横匾先按 alpha 包围盒裁出横带再落盘：

    python3 scripts/art/ui2.py              # 未通过校验的才生成
    python3 scripts/art/ui2.py --force      # 强制重生成
    python3 scripts/art/ui2.py --only title-banner
"""

import io
import sys
from pathlib import Path

sys.path.insert(0, Path(__file__).resolve().parent)
import lib  # noqa: E402
from PIL import Image  # noqa: E402


def crop_alpha_band(data: bytes, target_w: int, band_ratio: float = 0.62) -> bytes:
    """按 alpha 包围盒裁掉透明边，再取内容最密的水平带，缩放到 target_w 宽。"""
    im = Image.open(io.BytesIO(data)).convert("RGBA")
    bbox = im.getchannel("A").point(lambda a: 255 if a > 16 else 0).getbbox()
    if bbox:
        im = im.crop(bbox)
    w, h = im.size
    if h > w * 0.72:
        # 生成物偏方：取 alpha 密度最高的水平带（横匾画在画面中部时有效）
        alpha = im.getchannel("A")
        band_h = max(1, int(h * band_ratio))
        best_top, best_sum = 0, -1
        step = max(1, h // 64)
        for top in range(0, h - band_h + 1, step):
            total = sum(alpha.crop((0, top, w, top + band_h)).getdata())
            if total > best_sum:
                best_sum, best_top = total, top
        im = im.crop((0, best_top, w, best_top + band_h))
    out_w = target_w
    out_h = max(1, round(im.size[1] * out_w / im.size[0]))
    im = im.resize((out_w, out_h), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, format="PNG")
    return buf.getvalue()


ITEMS = [
    {
        "name": "title-banner",
        "prompt": (
            "一块扁长的古风牌匾横匾，米白色宣纸匾面，左右两端各一个深青绿色卷轴轴头，"
            "匾面四周一圈纤细金线描边，匾面中央大面积留白干净无装饰，横长构图。"
            f"{lib.STYLE}。纯透明背景，画面中不出现任何文字、字母、水印。"
        ),
        "transparent": True,
        "path": lib.ROOT / "public/ui/title-banner.png",
        "post": ("banner", 1536),
        "check_size": None,  # 后处理尺寸不固定，跳过 lib 的精确尺寸校验
    },
    {
        "name": "lock",
        "prompt": (
            "一把古风黄铜小锁，蝙蝠锁孔，锁身青绿色与金色相间，圆润可爱，正面视角。"
            f"{lib.STYLE}。纯透明背景，四周留白。{lib.NO_TEXT}。"
        ),
        "transparent": True,
        "size": "1024x1024",
        "path": lib.ROOT / "public/ui/lock.png",
    },
    {
        "name": "seal-blank",
        "prompt": (
            "一枚空白的朱砂红方形印章印框，双线边框，圆角，印面内部完全留白干净，"
            "微微倾斜 3 度，印泥质感。"
            f"{lib.STYLE}。纯透明背景，画面中不出现任何文字、字母、水印、印章文字。"
        ),
        "transparent": True,
        "size": "1024x1024",
        "path": lib.ROOT / "public/ui/seal-blank.png",
    },
    {
        "name": "branch-plum",
        "prompt": (
            "一根从画面左上角斜垂下来的梅花枝，粉色花朵稀疏雅致，缀两三片嫩叶，"
            "枝条纤细干净。"
            f"{lib.STYLE}。纯透明背景，四周留白。{lib.NO_TEXT}。"
        ),
        "transparent": True,
        "size": "1024x1024",
        "path": lib.ROOT / "public/ui/branch-plum.png",
    },
    {
        "name": "page-prev",
        "prompt": (
            "一枚古风圆形翻页按钮，青绿色玉圆盘，外圈金色回纹细描边，"
            "盘面中央一枚米白色粗壮V形箭头指向左侧，箭头干净醒目。"
            f"{lib.STYLE}。纯透明背景，四周留白，正面视角，避免塑料质感高光。{lib.NO_TEXT}。"
        ),
        "transparent": True,
        "size": "1024x1024",
        "path": lib.ROOT / "public/ui/page-prev.png",
    },
    {
        "name": "page-next",
        "prompt": (
            "一枚古风圆形翻页按钮，青绿色玉圆盘，外圈金色回纹细描边，"
            "盘面中央一枚米白色粗壮V形箭头指向右侧，箭头干净醒目。"
            f"{lib.STYLE}。纯透明背景，四周留白，正面视角，避免塑料质感高光。{lib.NO_TEXT}。"
        ),
        "transparent": True,
        "size": "1024x1024",
        "path": lib.ROOT / "public/ui/page-next.png",
    },
]


def local_valid(item: dict) -> bool:
    path = Path(item["path"])
    if not path.exists() or path.stat().st_size < 10_000:
        return False
    try:
        im = Image.open(path)
        # compress.py 会把 PNG 量化成 P 模式（带 transparency），同样视为有效透明素材
        if im.mode != "RGBA" and "transparency" not in im.info:
            return False
        lo, _ = im.convert("RGBA").getchannel("A").getextrema()
        return lo <= 250
    except Exception:  # noqa: BLE001
        return False


if __name__ == "__main__":
    only = next((a.split("=")[1] for a in sys.argv if a.startswith("--only=")), None)
    force = "--force" in sys.argv
    failed = False
    for item in ITEMS:
        if only and item["name"] != only:
            continue
        path = Path(item["path"])
        if not force and local_valid(item):
            print(f"  跳过 {item['name']}（已存在且校验通过）", flush=True)
            continue
        try:
            data = lib.generations(item["prompt"], item.get("size", "1024x1024"), item["transparent"])
            if item.get("post"):
                kind, arg = item["post"]
                if kind == "banner":
                    # 横匾不走 lib.finish（它会硬性缩放回 size）：裁带后直接落盘
                    im = Image.open(io.BytesIO(crop_alpha_band(data, int(arg))))
                    path.parent.mkdir(parents=True, exist_ok=True)
                    im.save(path)
                    lo, _ = im.getchannel("A").getextrema()
                    if lo > 250:
                        raise RuntimeError(f"{path.name}: 应为透明底但未检出透明像素")
                    print(f"  ✔ {item['name']}: {im.size} {path.stat().st_size // 1024}KB", flush=True)
                    continue
            lib.finish(path, data, item.get("size", "1024x1024"), item["transparent"])
            im = Image.open(path)
            print(f"  ✔ {item['name']}: {im.size} {path.stat().st_size // 1024}KB", flush=True)
        except Exception as e:  # noqa: BLE001
            print(f"  ✘ {item['name']}: {e}", flush=True)
            failed = True
    raise SystemExit(1 if failed else 0)
