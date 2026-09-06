#!/bin/sh
# 唐小诗环游记容器入口：
#   1. 设置了 DATABASE_URL → 先跑数据库迁移（幂等；等待数据库就绪，最多重试 10 次）。
#   2. 启动 Nitro node-server（node .output/server/index.mjs）。
# 未设置 DATABASE_URL 时直接启动，走内嵌 PGLite（数据在内存里，容器重启即清空）。
set -e

if [ -n "${DATABASE_URL:-}" ]; then
  echo "[entrypoint] DATABASE_URL detected — applying migrations…"
  attempt=1
  until node scripts/migrate.mjs; do
    if [ "$attempt" -ge 10 ]; then
      echo "[entrypoint] migrations failed after $attempt attempts, giving up." >&2
      exit 1
    fi
    echo "[entrypoint] database not ready yet (attempt $attempt/10), retry in 3s…"
    attempt=$((attempt + 1))
    sleep 3
  done
else
  echo "[entrypoint] no DATABASE_URL — starting with embedded PGLite (data does NOT survive restarts)."
fi

exec node .output/server/index.mjs
