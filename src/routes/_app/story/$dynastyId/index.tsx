import { createFileRoute } from "@tanstack/react-router";
import { ChapterList } from "@/components/game/chapter-list";

export const Route = createFileRoute("/_app/story/$dynastyId/")({
  component: DynastyChapters,
});

function DynastyChapters() {
  const { dynastyId } = Route.useParams();
  return <ChapterList dynastyId={dynastyId} />;
}
