import { createFileRoute } from "@tanstack/react-router";
import { findChapter, findCollection } from "@/lib/game/content";
import { MissingCard } from "@/components/game/missing-card";
import { LibraryAuthors } from "@/components/game/library-authors";

export const Route = createFileRoute("/_app/library/$collectionId/$chapterId/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { collectionId, chapterId } = Route.useParams();
  const chapter = findChapter(chapterId);
  if (!findCollection(collectionId) || !chapter || chapter.collectionId !== collectionId) {
    return <MissingCard title="章节未找到" hint="这一章不存在，或已随内容编排更新搬了家。" />;
  }
  return <LibraryAuthors collectionId={collectionId} chapterId={chapterId} />;
}
