import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * 旧路径重定向（入口拆分 2026-09，ADR-0017）：
 * 文集层级已整体迁到 /library，/tour 只保留墨潮远征。
 * 旧书签/旧 PWA 深链 /tour/$collectionId → /library/$collectionId。
 */
export const Route = createFileRoute("/_app/tour/$collectionId/")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/library/$collectionId", params: { collectionId: params.collectionId } });
  },
});
