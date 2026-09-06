import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { findPoem } from "@/lib/game/content";
import { GAME_BACKGROUNDS } from "@/lib/game/content/meta";
import { MissingCard } from "@/components/game/missing-card";
import { PoemQuiz } from "@/components/game/poem-quiz";

export const Route = createFileRoute("/_app/practice/$poemId")({
  component: PracticePoemRoute,
});

/** 单诗练习：从诗库进入，可先看答案，不写存档、不计主线。 */
function PracticePoemRoute() {
  const { poemId } = Route.useParams();
  const navigate = useNavigate();

  const poem = findPoem(poemId);
  if (!poem) {
    return (
      <MissingCard
        bg={GAME_BACKGROUNDS.practice}
        title="诗卡未找到"
        hint="这张诗卡不存在，或已随内容编排更新搬了家。去诗库里挑一张吧。"
      />
    );
  }

  return (
    <PoemQuiz
      poem={poem}
      mode="practice"
      backTo="/practice"
      onExit={() => void navigate({ to: "/practice" })}
    />
  );
}
