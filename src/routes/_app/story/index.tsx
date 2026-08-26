import { createFileRoute } from "@tanstack/react-router";
import { DynastyHub } from "@/components/game/dynasty-hub";

export const Route = createFileRoute("/_app/story/")({
  component: DynastyHub,
});
