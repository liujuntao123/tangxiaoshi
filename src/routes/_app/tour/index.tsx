import { createFileRoute } from "@tanstack/react-router";
import { TourRoutes } from "@/components/game/tour-routes";

export const Route = createFileRoute("/_app/tour/")({
  component: TourIndex,
});

/**
 * /tour 只承载墨潮远征的墨路选择（入口拆分 2026-09，ADR-0017）。
 * 诗集资料库已迁往独立的 /library，底部导航「文集」直达，
 * 两条入口从此互不纠缠：主线推进只认 /tour，浏览收集只认 /library。
 */
function TourIndex() {
  return <TourRoutes />;
}
