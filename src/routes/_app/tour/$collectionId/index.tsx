import { createFileRoute } from "@tanstack/react-router";
import { findCollection } from "@/lib/game/content";
import { MissingCard } from "@/components/game/missing-card";
import { TourChapters } from "@/components/game/tour-chapters";

export const Route = createFileRoute("/_app/tour/$collectionId/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { collectionId } = Route.useParams();
  if (!findCollection(collectionId)) {
    return <MissingCard title="文集未找到" hint="这部文集不存在，或已随内容编排更新搬了家。" />;
  }
  return <TourChapters collectionId={collectionId} />;
}
