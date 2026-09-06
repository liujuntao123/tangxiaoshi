import { createFileRoute } from "@tanstack/react-router";
import { LibraryView } from "@/components/game/library-view";

export const Route = createFileRoute("/_app/library/")({
  component: LibraryRoute,
});

/**
 * /library = 诗集资料库（入口拆分 2026-09，ADR-0017）：
 * 文集 → 章节 → 作者 → 诗卡的浏览层级整体从 /tour 迁出，
 * /tour 从此只承载墨潮远征的墨路选择，两个入口互不纠缠。
 */
function LibraryRoute() {
  return <LibraryView />;
}
