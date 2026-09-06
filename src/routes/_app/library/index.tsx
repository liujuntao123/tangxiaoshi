import { createFileRoute } from "@tanstack/react-router";
import { LibraryView } from "@/components/game/library-view";

export const Route = createFileRoute("/_app/library/")({
  component: LibraryRoute,
});

/**
 * /library = 诗集资料库（入口拆分 2026-09，ADR-0017）：
 * 文集 → 章节 → 作者 → 诗卡的浏览层级（ADR-0017 迁出主线）。
 * 主线闯关走 /levels，这里只做内容检索与收集。
 */
function LibraryRoute() {
  return <LibraryView />;
}
