#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""UI 组件素材（public/ui/）：统一手绘儿童绘本风，与 check-on / plaque / btn-settings 同族。

与 docs/art.md 生图规范一致：非背景类要素透明背景、画面无文字（按钮文字由前端 HTML 叠字，
保证清晰可换文案）；生成后跑 trim.py + compress.py 后处理：

    python3 scripts/art/ui.py              # 未通过校验的才生成
    python3 scripts/art/ui.py --force      # 强制重生成
    python3 scripts/art/ui.py --only jade-btn
"""

import sys
from pathlib import Path

sys.path.insert(0, Path(__file__).resolve().parent)
import lib  # noqa: E402

SIZE = "1024x1024"

ITEMS = [
    {
        "name": "jade-btn",
        "prompt": (
            f"一枚古风玉佩按钮，圆形青玉璧，外圈金色云纹描边，璧面淡淡祥云暗纹集中在边缘，"
            f"中央留白洁净（供叠字）。{lib.STYLE}。纯透明背景，四周留白，正面视角，"
            f"避免塑料质感高光。{lib.NO_TEXT}。"
        ),
        "size": SIZE,
        "transparent": True,
        "path": lib.ROOT / "public/ui/jade-btn.png",
    },
    {
        "name": "back-btn",
        "prompt": (
            f"一个古风圆形返回按钮图标，青玉圆盘，外圈金色描边，盘面中央一枚奶油白色圆头"
            f"箭头指向左侧，箭头粗壮醒目。{lib.STYLE}。纯透明背景，四周留白，正面视角，"
            f"避免塑料质感高光。{lib.NO_TEXT}。"
        ),
        "size": SIZE,
        "transparent": True,
        "path": lib.ROOT / "public/ui/back-btn.png",
    },
]


if __name__ == "__main__":
    only = next((a.split("=")[1] for a in sys.argv if a.startswith("--only=")), None)
    lib.run_items(ITEMS, force="--force" in sys.argv, only=only)
