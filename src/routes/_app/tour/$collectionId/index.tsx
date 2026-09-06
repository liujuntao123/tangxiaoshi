import { createFileRoute } from "@tanstack/react-router";
import { TourChapters } from "@/components/game/tour-chapters";

export const Route = createFileRoute("/_app/tour/$collectionId/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { collectionId } = Route.useParams();
  return <TourChapters collectionId={collectionId} />;
}
