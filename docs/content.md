# 游戏内容怎么组织

内容唯一数据源是 `data/poetry-site/`（chinese-poetry 官方展示站的抓取集，11 文集 / 98 章节 / 2155 首）。
不再依赖 `/tmp/chinese-poetry` 本地仓库，`canonical.py` 蒙学补篇已删除（ADR-0011）。

台词与问答的生成规则见 [`content-rules.md`](content-rules.md)；生图规范见 [`art.md`](art.md)；
总规范见根目录 [`AGENTS.md`](../AGENTS.md)。

## 数据分层

```
文集 collection    数据源 11 个；未编译的文集在环游/练习里锁定展示（「待开放」）
  └── 章节 chapter   文集内的章（如「南唐二主词李璟篇」）；介绍/序章过滤不入库
        └── 作者 author   章内按作者聚合；首遇对白式引导语
              └── 诗卡 poem   问答单位：每诗 5 题、一张文集背景；环游全开放
```

朝代不再是导航层，只作练习筛选维度与成就类别（ADR-0011/0013）。

## 三种玩法（ADR-0004 仍有效：共用一份诗文，差别只在规则）

| 玩法 | 诗文范围 | 规则 |
| --- | --- | --- |
| 环游 | 已编译文集全部诗卡 | 全开放无门控；首遇作者出引导语；60% 及格 + 机会灯笼 |
| 无尽 | 已编译全部诗文题池随机 | 一题答错即止；记最高连对与最高分 |
| 练习 | 已编译全部诗文 | 三轴联动筛选（文集-章节 × 作者 × 朝代）；同款 5 题 + 「先看答案」，无灯笼无通关记录 |

## 文件清单

| 路径 | 谁维护 | 做什么 |
| --- | --- | --- |
| `data/poetry-site/` | 抓取脚本 | 唯一原始数据源（见其 README） |
| `scripts/content/catalog.py` | 人 | 已开放文集清单、作者引导语、成就命名、形象意象关键词 |
| `scripts/content/build-bank.py` | 人 | 编译器：poetry-site + catalog → bank.json（含 5 题/诗、背景轮换、成就定义） |
| `scripts/content/validate_content.py` | 人 | 质检门：题目完整性、引导语规范、禁词、长度 |
| `scripts/content/export_story_docs.py` | 人 | 从 bank.json 生成 `docs/story/` 索引 |
| `src/lib/game/content/bank.json` | 脚本生成 | 文集/章节/作者/诗卡/朝代/成就定义 |
| `src/lib/game/content/index.ts` | 人 | 运行时数据 API（含及格线/机会数/成就进度） |
| `src/lib/game/content/meta.ts` | 人 | 素材路径约定（背景/形象/立绘） |

改名说明：`validate_story.py` → `validate_content.py`；`story.json` 取消（并入 bank.json）；旧
`scripts/content/story/` 目录（world/canonical/chapters）已删除。

## 编译命令

```bash
python3 scripts/content/build-bank.py            # data/poetry-site → src/lib/game/content/bank.json
python3 scripts/content/validate_content.py      # 质检门
python3 scripts/content/export_story_docs.py     # 重建 docs/story/
```

不要手改 `bank.json`（紧急热修除外）；改内容 = 改 catalog.py 或编译器，再编译。

## 存档

按用户 ID 存数据库（ADR-0009 仍有效）。v2 字段：`clearedPoems / achievements / endlessBestStreak /
endlessBestScore / metAuthors`。层级重构时旧进度全部重置、无尽最高分保留（`migrations/0003_save_v2.sql`）。

## 当前状态

- **南唐二主词试点已编译**：李璟篇 4 首 + 李煜篇 41 首 = 45 诗卡 225 题；成就 4 枚（李璟/李煜/南唐二主词/五代）。
- 其余 10 个文集：锁定展示，待逐集开放（开放一集 = catalog 加条目 + 编译 + 素材生成）。
