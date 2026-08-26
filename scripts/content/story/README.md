# 剧情源文件

正式版历险对白的人写稿。一章一个文件，方便索引、改某一诗人、以后加元清。

```
scripts/content/story/
  helpers.py              N / T / O / lv / chapter
  world.py                世界观、序章、朝代开场
  canonical.py            chinese-poetry 没有的蒙学名篇（咏鹅、七步诗、汉乐府…）
  chapters/               一章一个 py
    __init__.py           ORDER：朝代 × 诗人顺序
    xianqin_caishiguan.py
    hanwei_*.py
    tang_*.py
    song_*.py
```

编译：

```bash
python3 scripts/content/build-bank.py --src /tmp/chinese-poetry
python3 scripts/content/export_story_docs.py
python3 scripts/content/validate_story.py
```

给人看的索引在 `docs/story/`。设计说明：`docs/story/DESIGN.md`。

## 写对白

- 口语短句，不文言。唐小诗像小孩，不像导游。
- 每关 intro ≥4 句、outro ≥3 句。场景、怪、唐小诗反应都要贴这首诗。
- 禁止套话当主句：「人呢？」「先答题」「钥匙给你。下一站X」「小诗，别怕。把《X》念出来。」
- 怪有自己的脾气；诗人被救时说话要像那个人（李白爱月和酒，陶渊明想回家种地）。
- 地名直白：鹅池、禾田、豆箕灶。妖怪直白：白鹅精、禾苗精。Boss 固定叫大魔王，但每章理由不同。
- 钥匙可以出现，但要变成具体物件（鹅毛钥匙、豆荚钥匙），不要每关同一句。

## 加一章

1. 在 `chapters/` 新建 `{dynastyId}_{poetId}.py`，导出 `CHAPTER`。
2. 把模块名加进 `chapters/__init__.py` 的 `ORDER`。
3. 若诗不在 chinese-poetry，写入 `canonical.py` 或 `build-bank.py` 的 FAMOUS 针。
4. 补诗人立绘 `public/sprites/poets/{poetId}.png`。
5. 编译、校验、导出文档。
