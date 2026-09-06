import { createFileRoute } from "@tanstack/react-router";
import { LevelList } from "@/components/game/level-list";

export const Route = createFileRoute("/_app/levels/")({
  component: LevelsIndex,
});

/** 关卡列表：墨潮远征的主线入口，50 关平铺、顺序解锁（ADR-0018）。 */
function LevelsIndex() {
  return <LevelList />;
}
