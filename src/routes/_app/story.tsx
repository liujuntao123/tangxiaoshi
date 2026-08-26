import { createFileRoute } from "@tanstack/react-router";
import { StoryMap } from "@/components/game/story-map";

export const Route = createFileRoute("/_app/story")({
  component: StoryMap,
});
