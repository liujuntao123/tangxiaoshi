import { createFileRoute } from "@tanstack/react-router";
import { AchievementsView } from "@/components/game/achievements-view";

export const Route = createFileRoute("/_app/achievements")({
  component: AchievementsView,
});
