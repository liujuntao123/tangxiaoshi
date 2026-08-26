# 游戏内容怎么组织

正式版内容从 [chinese-poetry](https://github.com/chinese-poetry/chinese-poetry) 编出来，剧情手写在 `scripts/content/story/chapters/`，一章一个文件。chinese-poetry 没有的蒙学名篇（咏鹅、七步诗、汉乐府、陶渊明）写在 `canonical.py`。

## 数据分层

```
朝代 dynasty     先秦 / 汉魏 / 唐 / 宋     以后可加元、清
  └── 诗人章 chapter   一章救一位诗人         以后可加「边塞合章」等
        └── 关卡 level 一关一首诗 + 一只怪 + 独有对白
```

三种玩法仍共用一份诗文（见 ADR-0004）：

| 玩法 | 读哪些诗 |
| --- | --- |
| 历险 | `story.json` 里编好的关卡 |
| 练习 | `bank.json` 全部 |
| 无尽 | 历险已通关解锁的诗 |

## 文件清单

给人看的索引：[`docs/story/INDEX.md`](story/INDEX.md)。设计：[`docs/story/DESIGN.md`](story/DESIGN.md)。世界观：[`docs/story/world.md`](story/world.md)。每一章对白：`docs/story/chapters/*.md`。

| 路径 | 谁维护 | 做什么 |
| --- | --- | --- |
| `scripts/content/story/world.py` | 人 | 世界观、朝代开场、序章 |
| `scripts/content/story/canonical.py` | 人 | 蒙学缺篇公版原文 |
| `scripts/content/story/chapters/` | 人 | 一章一个 py，见 `ORDER` |
| `scripts/content/build-bank.py` | 人 | 从 chinese-poetry 选题、出题、把对白编进关卡 |
| `scripts/content/export_story_docs.py` | 人 | 从 JSON 写出 `docs/story/` 索引 |
| `scripts/content/validate_story.py` | 人 | 对白长度、套话、题目门槛 |
| `src/lib/game/content/bank.json` | 脚本生成 | 诗文 + 四选一 |
| `src/lib/game/content/story.json` | 脚本生成 | 朝代、诗人章、关卡、对白 |
| `src/lib/game/content/meta.ts` | 人 | 妖怪、场景、诗人立绘路径 |
| `src/lib/game/content/index.ts` | 人 | 给游戏读的接口 |

改剧情或加诗人：在 `chapters/` 加文件，把名字写入 `ORDER`，有 chinese-poetry 的机器上跑：

```bash
python3 scripts/content/build-bank.py --src /tmp/chinese-poetry
python3 scripts/content/export_story_docs.py
python3 scripts/content/validate_story.py
```

不要直接改两份 JSON，除非是紧急热修。

## 选题

练习库优先用蒙学里小学生真正读过的，再用名篇原句从全唐诗/全宋诗补齐：

- `蒙学/tangshisanbaishou.json` 唐诗三百首
- `蒙学/qianjiashi.json` 千家诗
- `诗经/shijing.json` 国风短章
- `曹操诗集/caocao.json` 名篇
- `宋词/ci.song.*.json` 少量名篇
- 名篇原句从全唐诗/全宋诗按第一句对齐
- `canonical.py`：咏鹅、悯农、七步诗、汉乐府、陶渊明、小儿垂钓等仓库没有的蒙学课文

不把五万首全唐诗塞进游戏。全量库留给以后做「诗海」类玩法。

## 关卡 id

`{dynastyId}-{poetId}-{n}`，Boss 为 `{dynastyId}-{poetId}-boss`。  
诗文 id：`{poetId}-{titleSlug}`。  
成就：`poet-{poetId}`、`dynasty-{dynastyId}`。

旧存档 `lv1`…`lv6` / `poet-libai` 在读档时迁到李白章。

章带 `era`、`tags`，诗带 `dynastyId`、`form`、`source`、`theme`。以后按诗体、主题、朝代做新玩法，只读这些字段。

## 主线顺序

先秦采诗官 → 汉魏乐府、曹操、曹植、陶渊明 → 唐从咏鹅、悯农走到李商隐 → 宋从苏轼走到文天祥。唐朝先开人人会背的那些，不从李白一章当整个游戏。
