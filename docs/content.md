# 游戏内容怎么组织

内容唯一数据源是 `data/poetry-site/`（chinese-poetry 官方展示站的抓取集，原始约 11 文集 / 98 章节 / 2155 首）。编译过滤后，当前游戏题库为 11 文集 / 89 章 / 281 位作者 / 2147 张诗卡 / 10735 题。

不再依赖 `/tmp/chinese-poetry` 本地仓库。台词与问答生成规则见 [`content-rules.md`](content-rules.md)；生图规范见 [`art.md`](art.md)；总协作规范见根目录 [`AGENTS.md`](../AGENTS.md)。当前主线关卡规范见 [`adr/0018-level-based-expedition.md`](adr/0018-level-based-expedition.md) 与 [`adr/0020-level-difficulty-tiers.md`](adr/0020-level-difficulty-tiers.md)。

## 数据分层

```text
文集 collection    数据源 11 个；资料库中展示编译状态
  └── 章节 chapter   文集内的章；介绍/序章过滤不入库
        └── 作者 author   章内按作者聚合；首遇对白式引导语
              └── 诗卡 poem   问答单位：每诗 5 题、一张文集背景、一个学段难度（1–5）
```

朝代不再是导航层，只作诗库筛选维度与成就类别。诗卡 `difficulty` 是编译期推导的学段难度（小学·低/中/高、初中、高中），规则见 [`content-rules.md`](content-rules.md) 第四节（ADR-0020）。

## 玩法读取关系

| 入口 | 内容范围 | 规则 |
| --- | --- | --- |
| 墨潮远征（主线） | `/levels` 按学段分档从编译题池抽题 | 50 关平铺、每 10 关一个学段档；每关 10 题（一诗一题）+ 3 备用题；答对 6 题过关；星星与道具写 PlayerSave |
| 诗集资料库 | `/library` → 文集 → 章节 → 作者 → 诗卡 | 资料浏览；任意已编译诗卡可进入 5 题修页答题（机会灯笼、诗印），通关照常入档 |
| 诗库 | 已编译全部诗卡 | 三轴筛选；练习模式可先看答案，不写存档 |
| 无尽模式（原「墨潮试炼」） | 已编译全部题池 | 一题答错即止；记录最高连对和最高分 |

所有入口共用同一份 `bank.json`，运行时不出新题；关卡只按确定性算法抽题（`src/lib/game/levels.ts`）。

## 文件清单

| 路径 | 谁维护 | 做什么 |
| --- | --- | --- |
| `data/poetry-site/` | 抓取脚本 | 唯一原始数据源 |
| `scripts/content/catalog.py` | 人 | 已开放文集、作者引导语、成就命名、形象意象关键词 |
| `scripts/content/build-bank.py` | 人 | 编译题库：文集/章节/作者/诗卡/题目/学段难度/成就 |
| `scripts/content/validate_content.py` | 人 | 质检门：题目完整性、引导语规范、禁词、长度 |
| `scripts/content/export_story_docs.py` | 人 | 从 bank.json 生成 `docs/story/` 索引 |
| `src/lib/game/content/bank.json` | 脚本生成 | 运行时内容定义（题库池），禁止手改 |
| `src/lib/game/content/index.ts` | 人 | 运行时数据 API、及格线、机会数、成就进度 |
| `src/lib/game/content/meta.ts` | 人 | 背景、形象、立绘路径约定 |
| `src/lib/game/levels.ts` | 人 | 关卡出题算法、星级、道具规则（纯函数） |
| `src/components/game/level-quiz.tsx` | 人 | 关卡答题场 UI |
| `src/components/game/level-list.tsx` | 人 | 关卡列表 UI |
| `src/components/game/poem-quiz.tsx` | 人 | 诗卡答题（资料库/练习）、反馈和结算 |

历史说明：`validate_story.py` 和旧 `scripts/content/story/` 已删除；旧关卡/钥匙字段、`expedition.ts` 与 `tour-routes.tsx` 已随 ADR-0018 移除。

## 编译命令

```bash
python3 scripts/content/build-bank.py
python3 scripts/content/validate_content.py
python3 scripts/content/export_story_docs.py
```

不要手改 `bank.json` 或 `docs/story/INDEX.md`；改内容 = 改源数据/目录脚本，再编译和验证。

## 存档

永久成绩按用户 ID 存数据库。`PlayerSave` 字段为 `clearedPoems / achievements / endlessBestStreak / endlessBestScore / metAuthors / poemRecords / totalScore / levelStars / items`，读取统一经过 `normalizeSave`；数据库迁移为 `0001–0005`（`level_stars` 与 `items` 见 `0005_level_progress.sql`）。

关卡没有独立的「进行时」状态：题目由 userId 即时确定性生成，关卡星星与道具库存都落在 `PlayerSave`，刷新、换设备一致。

## 当前状态

- 11 个文集全部编译上线。
- 89 章 / 281 位作者 / 2147 张诗卡 / 10735 题。
- 成就 302 枚（作者 281 + 文集 11 + 朝代 10）。
- 主线 50 关已全部由算法铺满（每关 10 题，使用 650 个诗位）；学段分档 T1 232 / T2 72 / T3 471 / T4 727 / T5 645，仅 T2 由 T3 就近补足。
- 新增内容 = `catalog.py` 加条目 + 编译 + 必要素材生成。
