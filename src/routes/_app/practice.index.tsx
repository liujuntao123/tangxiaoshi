import { createFileRoute } from "@tanstack/react-router";
import { PracticeView } from "@/components/game/practice-view";

export const Route = createFileRoute("/_app/practice/")({
  component: PracticeView,
});
