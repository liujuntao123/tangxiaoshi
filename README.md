# 唐小诗环游记

给小学和初中生的古诗文环游。唐小诗翻开一部部诗文集，遇见写诗的人，答对他们出的诗题。
当前交付是竖屏网页版。

在线：[tangxiaoshi.aizhi.site](https://tangxiaoshi.aizhi.site)

## 怎么玩

邮箱注册后进入游戏。四种入口：

| 入口 | 规则 |
| --- | --- |
| 环游 | 文集 → 章节 → 作者 → 诗卡，全卡片式（无地图）。已开放文集任意诗卡随时可玩（全开放）；每张诗卡 5 题（3 整句补全 + 2 诗名），答对 60% 通过；唐小诗有「机会灯笼」（3 盏），作者只是出题人（单一立绘）。首次遇见作者会收到一段对白引导语。 |
| 无尽 | 已开放全部题池随机出题，一题答错本局结束，记最高连对和最高分。 |
| 练习 | 三轴联动筛选（文集-章节 × 作者 × 朝代），可先看正确答案再答，无灯笼、不计通关。 |
| 成就 | 三类全通制：作者（「遇见李煜·词中之帝」）、文集（「读罢南唐二主词·一江春愁」）、朝代（「走遍五代·五代词心」）。 |

主线现在开放 **南唐二主词** 试点：李璟篇 4 首 + 李煜篇 41 首 = 45 诗卡 225 题，成就 4 枚。
其余 10 个文集在环游/练习中锁定展示（「待开放」），逐集开放。

诗文来自 [chinese-poetry 官方展示站的数据集](data/poetry-site/README.md)（11 文集 / 2155 首），
是唯一内容源。

## 本地运行

需要 Node.js 22+。

```bash
npm install
npm run dev
```

浏览器打开 `http://localhost:8080`。本地用嵌入式 PGLite 存用户和进度；部署到带 `DATABASE_URL` 的环境时改用 Postgres。

常用命令：

```bash
npm run typecheck
npm run build
npm run test
```

## 部署

**Docker 一键部署**（自带 Postgres，数据落在 named volume，启动自动跑迁移）：

```bash
cp .env.example .env
docker compose up -d
```

**push 到 GitHub 自动构建镜像**：`.github/workflows/docker-image.yml` 会在 push `main` 时把镜像推到 `ghcr.io/liujuntao123/tangxiaoshi`（打 `latest` + 短 sha 标签，tag `v*` 出版本号标签），服务器上 `docker compose pull && docker compose up -d` 即可更新。

环境变量、自定义域名、GHCR 可见性、国内镜像加速等：[`docs/deploy.md`](docs/deploy.md)。Vercel 部署不受影响（`npm run build` 默认仍是 Vercel 布局，Docker 构建才切 `node-server`）。

## 技术

- Vite 8、TanStack Start、React 19、Tailwind CSS 4
- 路由：TanStack Router（`src/routes/`，环游层级 `/tour/$collectionId/$chapterId/$authorId`）
- 登录：Better Auth 邮箱密码（以后可换成微信；存档按用户 ID）
- 存档表：`player_saves` v2（通关诗卡、成就、无尽成绩、已遇作者）
- 画面：古风 Q 版绘本、拟物文集/朝代形象、每文集 5 张专属背景、轻边框纸面板（9-slice）

## 改内容

内容唯一源是 [`data/poetry-site/`](data/poetry-site/README.md)，手写内容（引导语、成就命名、形象意象）
在 [`scripts/content/catalog.py`](scripts/content/catalog.py)。改完编译：

```bash
python3 scripts/content/build-bank.py
python3 scripts/content/validate_content.py
python3 scripts/content/export_story_docs.py
```

怎么组织、文件清单：[`docs/content.md`](docs/content.md)。问答与台词规则：[`docs/content-rules.md`](docs/content-rules.md)。
生图工具链：[`docs/art.md`](docs/art.md)。内容总表：[`docs/story/INDEX.md`](docs/story/INDEX.md)。
**硬性规范：根目录 [`AGENTS.md`](AGENTS.md)**。

素材在 `public/`：

- `public/art/bg/` 全局背景 7 张 + `bg/collections/` 每文集 5 张专属背景
- `public/art/avatars/` 文集/朝代/章节形象（透明）
- `public/sprites/poets/` 作者立绘（透明）、`public/sprites/` 唐小诗三形态
- `public/ui/` 对话纸面板、木牍选项、玉佩按钮、灯笼等（轻边框，9-slice 拉伸）

生图用 gpt-image-2（两个 provider，非背景类全部透明背景），脚本：`scripts/art/run_all.py`
（幂等，`--force` 重生成）。

用词和产品边界见 [`CONTEXT.md`](CONTEXT.md)。设计取舍见 [`docs/adr/`](docs/adr/)。

## 自定义域名

线上域名是 `https://tangxiaoshi.aizhi.site`。Better Auth 的 `trustedOrigins` 必须包含这个源，否则登录/注册会报 Invalid origin。若再挂新域名，改 `src/lib/auth/server.ts` 里的 `APP_PUBLIC_ORIGINS`，或设置环境变量 `BETTER_AUTH_TRUSTED_ORIGINS`。
