import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * 旧路径重定向（入口拆分 2026-09，ADR-0017）：
 * /tour/$collectionId/$chapterId → /library/$collectionId/$chapterId。
 */
export const Route = createFileRoute("/_app/tour/$collectionId/$chapterId/")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/library/$collectionId/$chapterId",
      params: { collectionId: params.collectionId, chapterId: params.chapterId },
    });
  },
});
