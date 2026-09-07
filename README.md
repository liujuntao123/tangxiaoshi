# 唐小诗环游记

给小学和初中生的古诗文闯关游戏。唐小诗是修页人，要在“墨潮”吞噬诗句之前，沿 50 个关卡修复失声的诗文。
当前交付是竖屏网页版。

在线：[tangxiaoshi.aizhi.site](https://tangxiaoshi.aizhi.site)

## 怎么玩

邮箱注册后进入游戏。首页唯一主目标是「继续闯关」；其他入口服务于资料浏览、练习和短时挑战。

| 入口 | 规则 |
| --- | --- |
| 墨潮远征（主线） | 首页「继续闯关」进入 `/levels` 关卡列表选关。共 50 关平铺、顺序解锁；每关 10 道题，答对 6 题过关。 |
| 星星与道具 | 过关拿星星：零答错三星、答错 ≤2 两星、其余一星。每拿到一颗新星奖励 1 个道具：去伪（隐两个错项）、补答（错题换新题）、双倍（下次答对翻倍）。道具是持久库存，答题时随时可用。 |
| 专属题序 | 每关题目由你的账号专属生成：同一关卡你的题目永远固定，不同玩家互不相同，无法互相透题；整个战役内题目零重复。 |
| 诗库 | 自由练习：按文集、章节、作者、朝代筛选诗卡，可先看答案，不写存档。 |
| 无尽模式 | 全部题池随机，一题答错本局结束，记录最高连对和最高分；开场/结算可打开排行榜，看连对/得分双榜前 20 名和自己的名次。 |
| 诗册 | 成就页：查看作者、文集、朝代全通成就，以及诗印、总分和无尽纪录。 |
| 诗集资料库 | `/library`：文集 → 章节 → 作者 → 诗卡的资料浏览与收集层级；诗卡可进入 5 题修页答题（机会灯笼制，通关评级诗印）。主线推进只认首页「继续闯关」，两个入口互不纠缠。 |

题库共 2147 首诗 / 10735 题（每诗 5 题：3 补全 + 2 诗名）。答题后必须点击「下一题 / 看结果」确认阅读反馈再继续；答错会展示完整诗句与出处。

诗文来自 [chinese-poetry 官方展示站的数据集](data/poetry-site/README.md)（原始源约 11 文集 / 2155 首），编译过滤后形成游戏题库，是唯一内容源。

## 状态与存档

- 永久成绩按用户 ID 存入 `player_saves`（`migrations/0001–0005`）：诗卡通关、诗印、最佳分、环游总分、成就、已遇作者、无尽模式纪录、关卡星星（`level_stars`）与道具库存（`items`）。
- 关卡进度与道具是账号级数据：换设备登录同一账号不丢。
- 关卡题目不存档：由 userId 即时确定性生成（FNV-1a 种子 → 全库诗洗牌切段），同一账号永远同一份题。
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
- 路由：TanStack Router；主线关卡 `/levels`、`/levels/$levelId`，资料库层级 `/library/$collectionId/$chapterId/$authorId`，诗卡答题 `/play/$poemId`，练习 `/practice/$poemId`
- 登录：Better Auth 邮箱密码；永久存档按用户 ID
- 关卡：`src/lib/game/levels.ts`（出题算法与道具规则，纯函数可直测）；绑定真实题库见 `progress.ts` 的 `levelPlanFor`
- 永久存档：`PlayerSave`、`migrations/0001–0005`；最新数据库字段为 `level_stars` 和 `items`
- 画面：古风 Q 版绘本、文集背景、作者立绘、轻边框纸面板（9-slice）

设计取舍见 [`docs/adr/`](docs/adr/)，当前主线决策见 [`docs/adr/0018-level-based-expedition.md`](docs/adr/0018-level-based-expedition.md)。所有后续变更必须同步文档并记录在 [`changelog.md`](changelog.md)。

## 部署

Docker 一键部署：

```bash
cp .env.example .env
docker compose up -d
```

部署和自定义域名说明见 [`docs/deploy.md`](docs/deploy.md)。线上域名是 `https://tangxiaoshi.aizhi.site`；Better Auth 的 `trustedOrigins` 必须包含这个源。
