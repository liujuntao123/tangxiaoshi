import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { levelPlanFor } from "@/lib/game/progress";
import { LEVEL_COUNT } from "@/lib/game/levels";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { MissingCard } from "@/components/game/missing-card";
import { LevelQuiz } from "@/components/game/level-quiz";

export const Route = createFileRoute("/_app/levels/$levelId")({
  component: LevelRoute,
});

/**
 * 单关答题场：题目由玩家专属计划生成（ADR-0018）。
 * 「下一关」在结算后原地换关，避免多一层跳转。
 */
function LevelRoute() {
  const { levelId } = Route.useParams();
  const navigate = useNavigate();
  const user = useCurrentUser();
  const level = Number(levelId);

  if (!Number.isInteger(level) || level < 1 || level > LEVEL_COUNT) {
    return (
      <MissingCard
        bg="/art/bg/home.png"
        title="关卡不存在"
        hint="这一关不在远征计划里，回关卡列表挑一关吧。"
      />
    );
  }

  const userId = user?.id ?? "dev-user";
  const plan = levelPlanFor(userId, level);

  return (
    <LevelQuiz
      key={level}
      level={level}
      plan={plan}
      onExit={() => void navigate({ to: "/levels" })}
      onNextLevel={() => void navigate({ to: "/levels/$levelId", params: { levelId: String(level + 1) } })}
    />
  );
}
