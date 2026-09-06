# 唐小诗环游记

给小学和初中生的古诗文短局冒险游戏。唐小诗是修页人，要在“墨潮”吞噬诗句之前，沿墨路修复三页失声诗文。
当前交付是竖屏网页版。

在线：[tangxiaoshi.aizhi.site](https://tangxiaoshi.aizhi.site)

## 怎么玩

邮箱注册后进入游戏。首页唯一主目标是“墨潮远征”；其他入口服务于资料浏览、练习和短时挑战。

| 入口 | 规则 |
| --- | --- |
| 墨潮远征 | 首页远征台 → `/tour` 三条墨路 → 真实诗卡答题。一次远征最多 3 个节点；管理 1–4 盏诗火，完成节点后选择修页奖励，并根据累计表现得到“诗声复明 / 带伤归卷 / 墨潮未退”反馈。 |
| 青灯小径 | 稳健路线：优先提供未通关诗卡，节点成功后额外回复 1 盏诗火。 |
| 风雨险滩 | 高收益路线：优先提供已通关诗卡，每题答对额外获得 50 分。 |
| 无名残卷 | 全题库路线：候选诗卡随机，节点完成后可从续灯、磨墨、听句三种修页奖励中三选一。 |
| 诗库 | 原练习模式：按文集、章节、作者、朝代筛选诗卡，可先看答案，不扣诗火、不计主线通关。 |
| 墨潮试炼 | 原无尽模式：全部题池随机，一题答错本局结束，记录最高连对和最高分。 |
| 诗册 | 原成就页：查看作者、文集、朝代全通成就，以及诗印、总分和无尽纪录。 |
| 诗集资料库 | `/library`：保留文集 → 章节 → 作者 → 诗卡的资料浏览与收集层级；主线推进只认首页「继续远征 → /tour」，两个入口互不纠缠（ADR-0017）。 |

每张诗卡仍有 5 题（3 补全 + 2 诗名）。普通诗卡答对 60% 通过；答题前可选明心、护卷、回响之一，答题后必须点击“收句”阅读反馈再继续。通关按表现记录 1–3 枚诗印，可重战提分。

11 个文集全部上线：89 章 / 281 位作者 / 2147 张诗卡 / 10735 题。

诗文来自 [chinese-poetry 官方展示站的数据集](data/poetry-site/README.md)（原始源约 11 文集 / 2155 首），编译过滤后形成游戏题库，是唯一内容源。

## 状态与存档

- 永久成绩按用户 ID 存入 `player_saves`：诗卡通关、诗印、最佳分、环游总分、成就、已遇作者、墨潮试炼纪录。
- 当前远征过程存储在浏览器 `localStorage`：`tangxiaoshi.expedition.v1`。刷新页面可恢复，但不跨设备、不跨浏览器，也不按账号隔离；它不是云存档。
- 远征过程中获得的诗卡成绩和总分仍会写入 `PlayerSave`。
- 存档契约和文档同步规则见根目录 [`AGENTS.md`](AGENTS.md)。

## 本地运行

需要 Node.js 22+。

```bash
npm install
npm run dev
```

浏览器打开 `http://localhost:8080`。本地用嵌入式 PGLite 存用户和永久进度；部署到带 `DATABASE_URL` 的环境时改用 Postgres。

常用命令：

```bash
npm run typecheck
npm run lint
npm run build
npm run test
```

## 内容与素材

内容唯一源是 [`data/poetry-site/`](data/poetry-site/README.md)，手写内容（引导语、成就命名、形象意象）在 [`scripts/content/catalog.py`](scripts/content/catalog.py)。改完编译：

```bash
python3 scripts/content/build-bank.py
python3 scripts/content/validate_content.py
python3 scripts/content/export_story_docs.py
```

内容组织与文件清单：[`docs/content.md`](docs/content.md)。问答与台词规则：[`docs/content-rules.md`](docs/content-rules.md)。生图工具链：[`docs/art.md`](docs/art.md)。内容总表：[`docs/story/INDEX.md`](docs/story/INDEX.md)。

素材在 `public/`：

- `public/art/bg/` 全局背景与各文集专属背景
- `public/art/avatars/` 文集、朝代、章节形象
- `public/sprites/poets/` 作者立绘、`public/sprites/` 唐小诗三形态
- `public/ui/` 对话纸面板、木牍选项、玉佩按钮、灯笼等

## 技术

- Vite 8、TanStack Start、React 19、Tailwind CSS 4
- 路由：TanStack Router；主线 `/tour`，资料库层级 `/tour/$collectionId/$chapterId/$authorId`，答题 `/play/$poemId`
- 登录：Better Auth 邮箱密码；永久存档按用户 ID
- 远征：`src/lib/game/expedition.ts`，当前单局状态使用 `localStorage`
- 永久存档：`PlayerSave`、`migrations/0001–0004`；最新数据库字段为 `poem_records` 和 `total_score`
- 画面：古风 Q 版绘本、文集背景、作者立绘、轻边框纸面板（9-slice）

设计取舍见 [`docs/adr/`](docs/adr/)，当前远征决策见 [`docs/adr/0016-ink-tide-expedition.md`](docs/adr/0016-ink-tide-expedition.md)。所有后续变更必须同步文档并记录在 [`changelog.md`](changelog.md)。

## 部署

Docker 一键部署：

```bash
cp .env.example .env
docker compose up -d
```

部署和自定义域名说明见 [`docs/deploy.md`](docs/deploy.md)。线上域名是 `https://tangxiaoshi.aizhi.site`；Better Auth 的 `trustedOrigins` 必须包含这个源。
