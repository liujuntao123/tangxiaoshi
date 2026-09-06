# 唐小诗历险记 自托管镜像：宿主机构建好的 nitro node 产物直接打包（见 ../build-image.sh）。
# 产物自包含（PGLite 的 FS 资产已补进 _libs），无需 node_modules。
FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
COPY .output ./.output
ENV HOST=127.0.0.1 \
    PORT=8090 \
    NITRO_HOST=127.0.0.1 \
    NITRO_PORT=8090
CMD ["node", ".output/server/index.mjs"]
