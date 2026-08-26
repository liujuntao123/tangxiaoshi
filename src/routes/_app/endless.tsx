import { createFileRoute } from "@tanstack/react-router";
import { EndlessView } from "@/components/game/endless-view";

export const Route = createFileRoute("/_app/endless")({
  component: EndlessView,
});
