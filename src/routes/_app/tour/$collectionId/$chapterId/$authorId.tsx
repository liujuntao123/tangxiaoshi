import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * 旧路径重定向（入口拆分 2026-09，ADR-0017）：
 * /tour/$collectionId/$chapterId/$authorId → /library 下的同名作者页。
 */
export const Route = createFileRoute("/_app/tour/$collectionId/$chapterId/$authorId")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/library/$collectionId/$chapterId/$authorId",
      params: {
        collectionId: params.collectionId,
        chapterId: params.chapterId,
        authorId: params.authorId,
      },
    });
  },
});
