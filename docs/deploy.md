# 部署指南

项目有两条部署路径：

| 路径 | 适用 | 入口 |
| --- | --- | --- |
| Docker Compose | 一台服务器/本机，一条命令起全栈（应用 + Postgres） | `docker compose up -d` |
| GitHub → GHCR 镜像 | push 到 GitHub 自动构建镜像，服务器拉镜像更新 | `.github/workflows/docker-image.yml` |

线上 Vercel 部署不受影响：`npm run build` 默认仍产出 Vercel 函数布局（`NITRO_PRESET` 未设置时）。Docker 构建通过 `NITRO_PRESET=node-server` 切换为独立 Node 服务。

## 一、Docker Compose 一键部署

需要 Docker 20+（带 compose v2）。首次：

```bash
cp .env.example .env        # 按需改端口、口令、域名
docker compose up -d        # 构建镜像 + 起 Postgres + 起应用 + 自动跑迁移
```

打开 `http://<主机>:8080`（端口由 `.env` 的 `APP_PORT` 决定）。

更新版本：

```bash
git pull
docker compose up -d --build
```

数据库数据放在 named volume `pgdata`（`docker volume ls` 可见），删容器不丢数据；彻底清空用 `docker compose down -v`。

### 起了什么

- `db`：postgres:17-alpine，健康检查通过后应用才启动（应用侧另有 10 次重试兜底）。
- `app`：应用容器。启动时检测到 `DATABASE_URL` 会先执行 `migrations/` 迁移（幂等，记录在 `_migrations` 表），再启动 Node 服务。

### 环境变量

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `DATABASE_URL` | 生产必填 | Postgres 连接串。compose 已自动拼好；不设置则用内嵌 PGLite（内存库，**容器重启数据清空**，只适合试用） |
| `BETTER_AUTH_SECRET` | 生产必填 | 会话签名密钥。不设置则每次重启后所有登录态失效。生成：`docker compose exec app node -e "console.log(require('crypto').randomBytes(32).toString('hex')}"` |
| `BETTER_AUTH_URL` | 挂域名时必填 | 对外完整地址（如 `https://tangxiaoshi.example.com`），影响 OAuth 回跳与 cookie |
| `BETTER_AUTH_TRUSTED_ORIGINS` | 挂域名时必填 | 信任来源，逗号分隔；不包含实际访问域名时登录/注册报 Invalid origin |
| `APP_PORT` | 否 | 宿主机端口，默认 8080 |
| `POSTGRES_PASSWORD` | 否 | compose 内 Postgres 口令，默认 `tangxiaoshi`（仅内网可达，公网部署请改） |

登录是构建期开关：镜像默认**开启**邮箱登录；要构建无登录版本用 `docker build --build-arg VITE_AUTH_ENABLED=false .`。

## 二、GitHub 提交 → 自动构建镜像（GHCR）

仓库带 `.github/workflows/docker-image.yml`：

- push 到 `main` → 构建并推送 `ghcr.io/liujuntao123/tangxiaoshi:{latest, main, sha-xxxxxxx}`
- push tag `v1.2.3` → 追加 `1.2.3` / `1.2` / `1` 标签
- Pull Request → 只构建验证，不推送
- 也可在 Actions 页手动触发（workflow_dispatch）

用的是内置 `GITHUB_TOKEN`，无需配置任何 secret。首次发布后镜像默认私有，公开拉取去 GitHub → Packages → 该包 → Package settings → Change visibility；私有镜像在目标机器上 `docker login ghcr.io`（用 PAT，权限 `read:packages`）即可拉取。

### 服务器上用 CI 镜像更新

`.env` 里设 `APP_IMAGE=ghcr.io/liujuntao123/tangxiaoshi:latest`，然后：

```bash
docker compose pull && docker compose up -d
```

## 三、不用 compose 的裸 docker run

```bash
docker build -t tangxiaoshi .
# 有 Postgres（推荐）：
docker run -d -p 8080:8080 \
  -e DATABASE_URL=postgres://user:pass@host:5432/db \
  -e BETTER_AUTH_SECRET=<64位随机串> \
  tangxiaoshi
# 试用（内存库，重启清空）：
docker run -d -p 8080:8080 tangxiaoshi
```

## 四、国内拉取慢怎么办

两个层面，按需用：

- **基础镜像**：构建时走镜像源 —— `docker build --build-arg NODE_IMAGE=docker.m.daocloud.io/library/node:22-alpine -t tangxiaoshi .`（实测 daocloud 明显快于 1ms.run）。
- **守护进程代理**：Docker Desktop → Settings → Resources → Proxies 填 `http://host.docker.internal:7897` 后重启 Docker，此后 `docker pull` 官方源也走代理。这是持久化环境改动，自行权衡。

compose 里的 `postgres:17-alpine` 同理，可以先 `docker pull docker.m.daocloud.io/library/postgres:17-alpine && docker tag docker.m.daocloud.io/library/postgres:17-alpine postgres:17-alpine`。

## 五、镜像里有什么（维护者视角）

多阶段构建（`Dockerfile`）：

1. `deps`：`npm ci` 全量依赖（lockfile 必须与 package.json 同步，`npm ci` 不同步会直接失败——改了依赖记得提交 lockfile）。
2. `build`：`NITRO_PRESET=node-server npm run build`，产物 `.output/`（自包含 Node 服务 + 静态资源），并把 PGLite 的 wasm 运行时复制进 `_libs/`（无数据库兜底需要）。
3. `runtime`：只带 `.output/`、迁移脚本（`scripts/migrate.mjs` + `migrations/`）和一个只装 `pg` 的小 node_modules（给迁移用）。入口 `docker/entrypoint.sh`：有 `DATABASE_URL` 先迁移（等库就绪、最多重试 10 次）再启动服务。

镜像约 420MB（含 PGLite wasm 约 17MB）。健康检查走 `/login`。
