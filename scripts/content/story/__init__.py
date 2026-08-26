"""Authored story for 唐小诗历险记.

Human-editable plot. `build-bank.py` compiles this with chinese-poetry
into `src/lib/game/content/{bank,story}.json`.

  world.py       worldview, dynasty intros, prologue
  canonical.py   public-domain kid poems missing from chinese-poetry
  chapters/      one file per poet chapter (see ORDER)
"""

from .canonical import CANONICAL
from .chapters import CHAPTERS, ORDER
from .helpers import N, O, T, chapter, lv
from .world import DYNASTIES, PROLOGUE, WORLD

__all__ = [
    "CANONICAL",
    "CHAPTERS",
    "DYNASTIES",
    "N",
    "O",
    "ORDER",
    "PROLOGUE",
    "T",
    "WORLD",
    "chapter",
    "lv",
]
