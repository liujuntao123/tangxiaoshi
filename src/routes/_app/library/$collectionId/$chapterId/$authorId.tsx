import { createFileRoute } from "@tanstack/react-router";
import { findAuthor, findChapter, findCollection } from "@/lib/game/content";
import { MissingCard } from "@/components/game/missing-card";
import { TourAuthor } from "@/components/game/tour-author";

export const Route = createFileRoute("/_app/library/$collectionId/$chapterId/$authorId")({
  component: RouteComponent,
});

function RouteComponent() {
  const { collectionId, chapterId, authorId } = Route.useParams();
  const chapter = findChapter(chapterId);
  const author = findAuthor(authorId);
  if (
    !findCollection(collectionId) ||
    !chapter ||
    chapter.collectionId !== collectionId ||
    !author ||
    !chapter.authorIds.includes(authorId)
  ) {
    return <MissingCard title="作者未找到" hint="这一页不存在，或已随内容编排更新搬了家。" />;
  }
  return <TourAuthor collectionId={collectionId} chapterId={chapterId} authorId={authorId} />;
}
