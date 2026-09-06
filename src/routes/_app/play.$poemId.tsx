import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { findPoem } from "@/lib/game/content";
import { GAME_BACKGROUNDS } from "@/lib/game/content/meta";
import { MissingCard } from "@/components/game/missing-card";
import { PoemQuiz, type QuizMode } from "@/components/game/poem-quiz";

export const Route = createFileRoute("/_app/play/$poemId")({
  validateSearch: (search: Record<string, unknown>): { from?: string } => ({
    from: typeof search.from === "string" ? search.from : undefined,
  }),
  component: PlayPoemRoute,
});

function PlayPoemRoute() {
  const { poemId } = Route.useParams();
  const { from } = Route.useSearch();
  const navigate = useNavigate();
  // 旧书签/旧 PWA 深链可能带着已下线的 id（如旧关卡 xianqin-caishiguan-1）：
  // 温和降级，不进错误边界。
  const poem = findPoem(poemId);
  if (!poem) {
    return (
      <MissingCard
        bg={GAME_BACKGROUNDS.home}
        title="诗卡未找到"
        hint="这张诗卡不存在，或已随内容编排更新搬了家。去环游里挑一张吧。"
      />
    );
  }
  const practice = from === "practice";
  const mode: QuizMode = practice ? "practice" : "tour";
  const backTo = practice
    ? "/practice"
    : `/tour/${poem.collectionId}/${poem.collectionId}-c${poem.chapterIndex}/${poem.authorId}`;
  return (
    <PoemQuiz
      poem={poem}
      mode={mode}
      backTo={backTo}
      onExit={() => {
        if (practice) void navigate({ to: "/practice" });
        else
          void navigate({
            to: "/tour/$collectionId/$chapterId/$authorId",
            params: {
              collectionId: poem.collectionId,
              chapterId: `${poem.collectionId}-c${poem.chapterIndex}`,
              authorId: poem.authorId,
            },
          });
      }}
    />
  );
}
