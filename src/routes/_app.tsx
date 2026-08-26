import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { RequireAuth } from "@/components/game/require-auth";

export const Route = createFileRoute("/_app")({
  beforeLoad: ({ context }) => {
    const sessionUser = (context as { sessionUser?: { id: string } | null }).sessionUser;
    if (!sessionUser) {
      throw redirect({ to: "/login" });
    }
  },
  component: AppGate,
});

function AppGate() {
  return (
    <RequireAuth>
      <Outlet />
    </RequireAuth>
  );
}
