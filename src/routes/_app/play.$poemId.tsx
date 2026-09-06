import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { findPoem } from "@/lib/game/content";
import { GAME_BACKGROUNDS } from "@/lib/game/content/meta";
import { MissingCard } from "@/components/game/missing-card";
import { PoemQuiz } from "@/components/game/poem-quiz";

export const Route = createFileRoute("/_app/play/$poemId")({
  component: PlayPoemRoute,
});

/**
 * 诗卡修页：从诗集资料库进入的单诗 5 题问答。
 * 通关写存档（诗印/最佳分/总分/成就），是诗册收集的达成途径；
 * 主线闯关在 /levels（ADR-0018）。
 */
function PlayPoemRoute() {
  const { poemId } = Route.useParams();
  const navigate = useNavigate();

  // 旧书签/旧 PWA 深链可能带着已下线的 id：温和降级，不进错误边界。
  const poem = findPoem(poemId);
  if (!poem) {
    return (
      <MissingCard
        bg={GAME_BACKGROUNDS.home}
        title="诗卡未找到"
        hint="这张诗卡不存在，或已随内容编排更新搬了家。去文集里挑一张吧。"
      />
    );
  }

  const backTo = `/library/${poem.collectionId}/${poem.collectionId}-c${poem.chapterIndex}/${poem.authorId}`;
  return (
    <PoemQuiz
      poem={poem}
      mode="poem"
      backTo={backTo}
      onExit={() => {
        void navigate({ to: "/library/$collectionId/$chapterId/$authorId", params: {
          collectionId: poem.collectionId,
          chapterId: `${poem.collectionId}-c${poem.chapterIndex}`,
          authorId: poem.authorId,
        } });
      }}
    />
  );
}
