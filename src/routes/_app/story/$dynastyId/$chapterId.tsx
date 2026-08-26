import { createFileRoute } from "@tanstack/react-router";
import { StoryMap } from "@/components/game/story-map";

export const Route = createFileRoute("/_app/story/$dynastyId/$chapterId")({
  component: ChapterMap,
});

function ChapterMap() {
  const { dynastyId, chapterId } = Route.useParams();
  return <StoryMap dynastyId={dynastyId} poetId={chapterId} />;
}
