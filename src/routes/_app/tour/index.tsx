import { createFileRoute } from "@tanstack/react-router";
import { TourCollections } from "@/components/game/tour-collections";

export const Route = createFileRoute("/_app/tour/")({
  component: TourCollections,
});
