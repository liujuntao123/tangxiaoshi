#!/usr/bin/env bash
# 唐小诗历险记 Docker 镜像构建（宿主机构建 → 打包镜像）。
#
# 为什么不在容器里构建：本机 Docker bridge 网络容器出站 TCP 全部超时（npm ci 会挂死），
# 因此 npm 构建一律在宿主机完成，镜像只负责运行（机房间距约定，见 AGENTS.md）。
#
# 用法：bash deploy/build-image.sh
set -euo pipefail
cd "$(dirname "$0")/.."

echo "[1/3] 构建 nitro node-server 预设产物…"
NITRO_PRESET=node-server npm run build

echo "[2/3] 补齐 nitro 未追踪的 PGLite FS 资产…"
# vite 的 pgliteRuntimeCopyPlugin 已把 pglite.data / pglite.wasm / initdb.wasm
# 拷进 .output/server/_libs；这里再兜底补一次（幂等，防插件路径变化）。
pglite_dist="node_modules/@electric-sql/pglite/dist"
cp "$pglite_dist/pglite.data" .output/server/_libs/
for wasm in "$pglite_dist"/*.wasm; do
  [ -e "$wasm" ] && cp "$wasm" .output/server/_libs/
done
ls -la .output/server/_libs/ | grep -E "wasm|pglite\.data" || true

echo "[3/3] 组装镜像上下文并 docker build…"
rm -rf deploy/image/.output
cp -r .output deploy/image/.output
docker build -t tangxiaoshi-game:latest deploy/image

echo "完成：tangxiaoshi-game:latest（docker compose -f deploy/docker-compose.yml up -d 启动）"
