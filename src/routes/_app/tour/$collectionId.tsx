import { createFileRoute, Outlet } from "@tanstack/react-router";

/**
 * 环游第二层布局：/tour/$collectionId 下挂章节页(index)与作者页($chapterId)。
 * 布局只渲染 Outlet，章节列表在 index.tsx，否则点章节卡时子路由命中但画面不变（BUG 修复）。
 */
export const Route = createFileRoute("/_app/tour/$collectionId")({
  component: RouteComponent,
});

function RouteComponent() {
  return <Outlet />;
}
