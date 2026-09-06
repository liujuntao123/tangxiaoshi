import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { poemById } from "@/lib/game/content";
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
  const poem = poemById(poemId);
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
