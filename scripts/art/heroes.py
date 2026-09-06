#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""主角唐小诗三形态。

阶梯（docs/art.md）：hero.png 用 generations；欢呼/沮丧优先 edits + 默认图参考（保脸）；
edits 两家 provider 均不可用时，降级为本地 PIL 派生（形象 100% 一致，姿态表现靠 mood 动画补）。
"""

import sys
from pathlib import Path

sys.path.insert(0, Path(__file__).resolve().parent)
import lib  # noqa: E402
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "content"))
import catalog  # noqa: E402

from PIL import Image, ImageDraw  # noqa: E402

SIZE = "1024x1024"
HERO = lib.ROOT / "public/sprites/hero.png"
HAPPY = lib.ROOT / "public/sprites/hero-happy.png"
SAD = lib.ROOT / "public/sprites/hero-sad.png"


def derive_happy(src: Image.Image) -> Image.Image:
    """欢呼：轻微后仰 + 头顶星光（动效由 mood-happy 上跳补足）。"""
    im = src.rotate(-5, resample=Image.BICUBIC, expand=False)
    im = Image.alpha_composite(im, star_layer(im.size))
    return im


def derive_sad(src: Image.Image) -> Image.Image:
    """沮丧：轻微前倾 + 降低饱和 + 侧边汗滴。"""
    im = src.rotate(4, resample=Image.BICUBIC, expand=False)
    gray = im.convert("L").point(lambda v: int(v * 0.5 + 128 * 0.5))
    alpha = im.getchannel("A")
    im = Image.merge("RGBA", (gray, gray, gray, alpha))
    im = Image.alpha_composite(im, sweat_layer(im.size))
    return im


def star_layer(size: tuple[int, int]) -> Image.Image:
    layer = Image.new("RGBA", size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    w, h = size
    for cx, cy, r in ((0.28, 0.16, 0.045), (0.72, 0.2, 0.032), (0.5, 0.08, 0.026)):
        x, y, rr = int(w * cx), int(h * cy), int(w * r)
        d.regular_polygon((x, y, rr), n_sides=4, rotation=20, fill=(255, 236, 160, 235))
    return layer


def sweat_layer(size: tuple[int, int]) -> Image.Image:
    layer = Image.new("RGBA", size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    w, h = size
    x, y, r = int(w * 0.72), int(h * 0.17), int(w * 0.03)
    d.ellipse((x - r, y - r, x + r, y + int(r * 1.5)), fill=(126, 196, 207, 235))
    d.polygon([(x, y - int(r * 1.9)), (x - r, y - r * 0.2), (x + r, y - r * 0.2)], fill=(126, 196, 207, 235))
    return layer


def main() -> None:
    force = "--force" in sys.argv
    hero_cfg = catalog.ART["hero"]
    if force or not lib.valid(HERO, SIZE, True):
        print("① 生成 hero.png（默认）", flush=True)
        data = lib.generations(
            f"{hero_cfg['base']}，{hero_cfg['default']}。{lib.STYLE}。全身立绘，纯透明背景。{lib.NO_TEXT}。",
            SIZE,
            True,
        )
        lib.finish(HERO, data, SIZE, True)
        print("  ✔ hero.png", flush=True)
    else:
        print("  跳过 hero.png（已存在）", flush=True)

    src = Image.open(HERO).convert("RGBA")
    derived: dict[Path, Image.Image] = {HAPPY: derive_happy(src), SAD: derive_sad(src)}
    for path, pose in ((HAPPY, "happy"), (SAD, "sad")):
        if not force and lib.valid(path, SIZE, True):
            print(f"  跳过 {path.name}（已存在）", flush=True)
            continue
        data = None
        try:
            print(f"② edits 生成 {path.name}（参考 hero.png）", flush=True)
            data = lib.edits(
                f"保持画面中的角色长相、服装、画风完全不变，只改变姿势与表情：{hero_cfg['base']}，{hero_cfg[pose]}。纯透明背景。{lib.NO_TEXT}。",
                HERO,
                SIZE,
            )
        except Exception as e:  # noqa: BLE001
            print(f"  edits 不可用（{type(e).__name__}），降级 PIL 派生：{path.name}", flush=True)
        if data is not None:
            lib.finish(path, data, SIZE, True)
        else:
            derived[path].save(path)
        print(f"  ✔ {path.name} {path.stat().st_size // 1024}KB", flush=True)


if __name__ == "__main__":
    main()
