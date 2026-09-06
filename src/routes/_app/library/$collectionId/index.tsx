import { createFileRoute } from "@tanstack/react-router";
import { findCollection } from "@/lib/game/content";
import { MissingCard } from "@/components/game/missing-card";
import { LibraryChapters } from "@/components/game/library-chapters";

export const Route = createFileRoute("/_app/library/$collectionId/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { collectionId } = Route.useParams();
  if (!findCollection(collectionId)) {
    return <MissingCard title="文集未找到" hint="这部文集不存在，或已随内容编排更新搬了家。" />;
  }
  return <LibraryChapters collectionId={collectionId} />;
}
