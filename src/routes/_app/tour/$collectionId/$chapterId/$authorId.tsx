import { createFileRoute } from "@tanstack/react-router";
import { TourAuthor } from "@/components/game/tour-author";

export const Route = createFileRoute("/_app/tour/$collectionId/$chapterId/$authorId")({
  component: RouteComponent,
});

function RouteComponent() {
  const { collectionId, chapterId, authorId } = Route.useParams();
  return <TourAuthor collectionId={collectionId} chapterId={chapterId} authorId={authorId} />;
}
