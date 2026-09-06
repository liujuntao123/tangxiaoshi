import { createFileRoute, Outlet } from "@tanstack/react-router";

/**
 * 环游第三层布局：/tour/$collectionId/$chapterId 下挂作者页(index)与诗卡页($authorId)。
 * 布局只渲染 Outlet，作者列表在 index.tsx，否则作者卡点击无反应（BUG 修复）。
 */
export const Route = createFileRoute("/_app/tour/$collectionId/$chapterId")({
  component: RouteComponent,
});

function RouteComponent() {
  return <Outlet />;
}
