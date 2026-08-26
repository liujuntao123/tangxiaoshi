import { createFileRoute } from "@tanstack/react-router";
import { PlayLevel } from "@/components/game/play-level";
import { LEGACY_LEVEL_IDS, LEVELS } from "@/lib/game/content";

export const Route = createFileRoute("/_app/play/$levelId")({
  component: LevelPage,
});

function LevelPage() {
  const { levelId } = Route.useParams();
  const mapped = LEGACY_LEVEL_IDS[levelId] ?? levelId;
  const exists = LEVELS.some((level) => level.id === mapped);
  if (!exists) {
    return (
      <div className="paper-bg grid min-h-dvh place-items-center text-ink">
        <p>没有这一关</p>
      </div>
    );
  }
  return <PlayLevel levelId={mapped} />;
}
