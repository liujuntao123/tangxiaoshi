#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""总驱动：背景/形象/作者立绘并发（4 路），主角三形态最后（edits 依赖 hero.png）。"""

import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.path.insert(0, Path(__file__).resolve().parent)
import avatars  # noqa: E402
import backgrounds  # noqa: E402
import lib  # noqa: E402
import poets  # noqa: E402

HERE = Path(__file__).resolve().parent


def main() -> None:
    force = "--force" in sys.argv
    everything = backgrounds.items() + avatars.items() + poets.items()
    print(f"== 并发生成 {len(everything)} 张 ==", flush=True)
    lib.run_items(everything, force=force, workers=4)
    print("== 主角三形态 ==", flush=True)
    subprocess.run([sys.executable, str(HERE / "heroes.py")] + (["--force"] if force else []), check=True)
    print("== 全部完成 ==", flush=True)


if __name__ == "__main__":
    main()
