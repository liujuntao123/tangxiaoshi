import { createFileRoute } from "@tanstack/react-router";
import { PlayLevel } from "@/components/game/play-level";
import { LEVELS } from "@/lib/game/content";

export const Route = createFileRoute("/_app/play/$levelId")({
  component: LevelPage,
});

function LevelPage() {
  const { levelId } = Route.useParams();
  const exists = LEVELS.some((level) => level.id === levelId);
  if (!exists) {
    return (
      <div className="paper-bg grid min-h-dvh place-items-center text-ink">
        <p>没有这一关</p>
      </div>
    );
  }
  return <PlayLevel levelId={levelId} />;
}
