# 游戏内容怎么组织

内容唯一数据源是 `data/poetry-site/`（chinese-poetry 官方展示站的抓取集，原始约 11 文集 / 98 章节 / 2155 首）。编译过滤后，当前游戏题库为 11 文集 / 89 章 / 281 位作者 / 2147 张诗卡 / 10735 题。

不再依赖 `/tmp/chinese-poetry` 本地仓库。台词与问答生成规则见 [`content-rules.md`](content-rules.md)；生图规范见 [`art.md`](art.md)；总协作规范见根目录 [`AGENTS.md`](../AGENTS.md)。当前主线远征规范见 [`adr/0016-ink-tide-expedition.md`](adr/0016-ink-tide-expedition.md)。

## 数据分层

```text
文集 collection    数据源 11 个；资料库中展示编译状态
  └── 章节 chapter   文集内的章；介绍/序章过滤不入库
        └── 作者 author   章内按作者聚合；首遇对白式引导语
              └── 诗卡 poem   问答单位：每诗 5 题、一张文集背景
```

朝代不再是导航层，只作诗库筛选维度与成就类别。

## 玩法读取关系

| 入口 | 内容范围 | 规则 |
| --- | --- | --- |
| 墨潮远征 | `/tour` 从全部编译诗卡生成三条墨路候选 | 三节点；诗火 1–4；路线和修页奖励改变当前远征；永久诗卡成绩仍写 PlayerSave |
| 诗集资料库 | `/library` → 文集 → 章节 → 作者 → 诗卡 | 资料浏览；任意已编译诗卡可直接进入答题，通关照常入档 |
| 诗库 | 已编译全部诗卡 | 三轴筛选；练习模式可先看答案，不计主线通关 |
| 墨潮试炼 | 已编译全部题池 | 一题答错即止；记录最高连对和最高分 |

## 文件清单

| 路径 | 谁维护 | 做什么 |
| --- | --- | --- |
| `data/poetry-site/` | 抓取脚本 | 唯一原始数据源 |
| `scripts/content/catalog.py` | 人 | 已开放文集、作者引导语、成就命名、形象意象关键词 |
| `scripts/content/build-bank.py` | 人 | 编译题库：文集/章节/作者/诗卡/题目/成就 |
| `scripts/content/validate_content.py` | 人 | 质检门：题目完整性、引导语规范、禁词、长度 |
| `scripts/content/export_story_docs.py` | 人 | 从 bank.json 生成 `docs/story/` 索引 |
| `src/lib/game/content/bank.json` | 脚本生成 | 运行时内容定义，禁止手改 |
| `src/lib/game/content/index.ts` | 人 | 运行时数据 API、及格线、机会数、成就进度 |
| `src/lib/game/content/meta.ts` | 人 | 背景、形象、立绘路径约定 |
| `src/lib/game/expedition.ts` | 人 | 远征状态、路线池、诗火、奖励、结局、localStorage |
| `src/components/game/tour-routes.tsx` | 人 | 三条墨路候选 UI |
| `src/components/game/poem-quiz.tsx` | 人 | 诗卡答题、诗签、远征反馈和结算 |

历史说明：`validate_story.py` 和旧 `scripts/content/story/` 已删除；旧关卡/钥匙字段也不再是当前内容契约。

## 编译命令

```bash
python3 scripts/content/build-bank.py
python3 scripts/content/validate_content.py
python3 scripts/content/export_story_docs.py
```

不要手改 `bank.json` 或 `docs/story/INDEX.md`；改内容 = 改源数据/目录脚本，再编译和验证。

## 存档

永久成绩按用户 ID 存数据库。`PlayerSave` 字段为 `clearedPoems / achievements / endlessBestStreak / endlessBestScore / metAuthors / poemRecords / totalScore`，读取统一经过 `normalizeSave`；数据库迁移为 `0001–0004`。

远征进行时状态不是数据库字段，而是浏览器 `localStorage` 的 `tangxiaoshi.expedition.v1`。它只保证刷新恢复，不保证跨设备、跨浏览器或账号隔离。续灯、磨墨、听句只影响当前远征；远征完成的诗卡表现会进入既有诗卡最佳分与总分。

## 当前状态

- 11 个文集全部编译上线。
- 89 章 / 281 位作者 / 2147 张诗卡 / 10735 题。
- 成就 302 枚（作者 281 + 文集 11 + 朝代 10）。
- 新增内容 = `catalog.py` 加条目 + 编译 + 必要素材生成。
