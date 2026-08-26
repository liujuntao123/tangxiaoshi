# 唐小诗历险记

给小学和初中生的古诗文历险。外在是打怪过关，内在是四选一诗题。当前交付是竖屏网页版。

在线：[tangxiaoshi.aizhi.site](https://tangxiaoshi.aizhi.site)

## 怎么玩

邮箱注册后进入游戏。四种入口：

| 入口 | 规则 |
| --- | --- |
| 历险 | 李白章地图过关。关前关后有对白，战斗是答题：选对妖怪掉血，选错自己掉血，各 3 血。失败可立刻重试本关。 |
| 练习 | 可看全部诗文，可先看正确答案再答，不扣血，没有白话解析。 |
| 无尽 | 只抽已解锁诗文，一题答错本局结束，记最高连对和最高分。 |
| 成就 | 诗人卡「李白回来了」，以及「滴水不漏」「十连击」。 |

李白章 6 关：月亮村、瀑布关、桃花潭、黄鹤楼、白帝城、魔王殿。前五关各得一把钥匙，集齐五把进魔王殿救出李白。

诗题只有四种：下一句、诗名、诗人、诗在写什么。

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
```

## 技术

- Vite 8、TanStack Start、React 19、Tailwind CSS 4
- 路由：TanStack Router（`src/routes/`）
- 登录：Better Auth 邮箱密码（以后可换成微信；存档按用户 ID）
- 存档表：`player_saves`（关卡、钥匙、成就、无尽成绩）
- 画面：古风绘本立绘 / 场景 / 卷轴对话框 / 木牍选项，不是写意水墨，也不是网页卡片风

## 改内容

诗文、关卡、对白、成就都写在 [`src/lib/game/content.ts`](src/lib/game/content.ts)，随版本发布。没有后台，也不在运行时改关卡。

素材在 `public/`：

- `public/art/` 场景和地图
- `public/sprites/` 角色待机、出招、受伤贴图
- `public/ui/` 对话框、选项条、玉佩按钮、血量等

用词和产品边界见 [`CONTEXT.md`](CONTEXT.md)。设计取舍见 [`docs/adr/`](docs/adr/)。

## 自定义域名

线上域名是 `https://tangxiaoshi.aizhi.site`。Better Auth 的 `trustedOrigins` 必须包含这个源，否则登录/注册会报 Invalid origin。若再挂新域名，改 `src/lib/auth/server.ts` 里的 `APP_PUBLIC_ORIGINS`，或设置环境变量 `BETTER_AUTH_TRUSTED_ORIGINS`。
