import { createFileRoute } from "@tanstack/react-router";
import { TourAuthors } from "@/components/game/tour-authors";

export const Route = createFileRoute("/_app/tour/$collectionId/$chapterId/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { collectionId, chapterId } = Route.useParams();
  return <TourAuthors collectionId={collectionId} chapterId={chapterId} />;
}
