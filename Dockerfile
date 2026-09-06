# syntax 参考：未使用 frontend 1.x 专属特性，不需要 `# syntax=docker/dockerfile:1`。
#
# 唐小诗环游记 — Docker 一键部署镜像。
#
# 多阶段构建：
#   deps    — 按 package-lock.json 安装全部依赖
#   build   — `npm run build`（NITRO_PRESET=node-server，产物为独立 Node 服务）
#   runtime — 只带 .output 产物 + 迁移脚本，自包含、体积小
#
# 本地构建并运行：
#   docker build -t tangxiaoshi .
#   docker run -p 8080:8080 tangxiaoshi            # 无数据库（内嵌 PGLite，重启即清空）
#   docker run -p 8080:8080 -e DATABASE_URL=postgres://… tangxiaoshi
#
# 推荐 `docker compose up -d`（自带 Postgres，数据落在 named volume），见 docker-compose.yml。
#
# 基础镜像可覆盖（如走内网镜像源）：--build-arg NODE_IMAGE=<registry>/node:22-alpine
ARG NODE_IMAGE=node:22-alpine

# ---------- deps ----------
FROM ${NODE_IMAGE} AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# ---------- build ----------
FROM ${NODE_IMAGE} AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# node-server preset：产物为 `node .output/server/index.mjs` 可直接启动的独立服务，
# 而不是默认（未设置该变量时）的 Vercel 函数布局。
ENV NITRO_PRESET=node-server
# 构建期可传入的开关（默认：开启登录）。置 false 可构建出无登录的版本。
ARG VITE_AUTH_ENABLED=
ENV VITE_AUTH_ENABLED=$VITE_AUTH_ENABLED
RUN npm run build
# PGLite 的 Postgres 运行时（wasm/data）不会被内联进产物；
# 无 DATABASE_URL 的兜底路径需要它们与 `_libs` 里的打包文件同目录。
RUN cp node_modules/@electric-sql/pglite/dist/pglite.data \
       node_modules/@electric-sql/pglite/dist/pglite.wasm \
       node_modules/@electric-sql/pglite/dist/initdb.wasm \
       .output/server/_libs/

# ---------- runtime ----------
FROM ${NODE_IMAGE} AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=8080 \
    HOST=0.0.0.0
# 服务端产物（自包含，无 node_modules）。
COPY --from=build /app/.output ./.output
# 迁移：启动时若设置 DATABASE_URL，先执行 scripts/migrate.mjs（幂等、可重试）。
COPY --from=build /app/docker/entrypoint.sh /app/docker/entrypoint.sh
COPY --from=build /app/docker/pg.package.json /app/package.json
COPY --from=build /app/scripts/migrate.mjs /app/scripts/migration-plan.mjs /app/scripts/
COPY --from=build /app/migrations /app/migrations
RUN npm install --omit=dev --no-audit --no-fund \
 && chmod +x /app/docker/entrypoint.sh
EXPOSE 8080
ENTRYPOINT ["/app/docker/entrypoint.sh"]
