import { signOut } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { CHAPTERS } from "@/lib/game/content";
import { rescuedCount } from "@/lib/game/progress";
import { useSave } from "@/lib/game/save-context";
import { useState, type ReactNode } from "react";
import { BackButton } from "./stage";

export function GameFrame({
  title,
  backTo,
  children,
}: {
  title?: string;
  backTo?: string;
  children: ReactNode;
}) {
  const { user, isPending } = useCurrentUserState();
  const { save } = useSave();
  const [signingOut, setSigningOut] = useState(false);
  const poets = rescuedCount(save);

  return (
    <div className="paper-bg min-h-dvh text-ink">
      <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-4 pb-8 pt-[max(1rem,env(safe-area-inset-top))]">
        <header className="mb-4 flex items-center gap-3">
          {backTo ? (
            <BackButton to={backTo} />
          ) : (
            <img src="/sprites/hero-bust.png" alt="" className="h-11 w-11 object-contain" />
          )}
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg leading-tight tracking-tight text-ink">
              {title ?? "唐小诗历险记"}
            </p>
            <p className="flex items-center gap-1 text-xs text-ink-soft">
              <img src="/sprites/key.png" alt="" className="h-3.5 w-3.5 object-contain" />
              诗人 {poets.have}/{poets.total || CHAPTERS.length}
            </p>
          </div>
          {isPending ? (
            <div className="h-11 w-16 animate-pulse rounded-md bg-paper-deep" />
          ) : user ? (
            <button
              type="button"
              disabled={signingOut}
              onClick={() => {
                setSigningOut(true);
                void signOut("/login").catch(() => setSigningOut(false));
              }}
              className="h-11 rounded-md border border-border/80 bg-paper/50 px-3 text-xs text-ink-soft backdrop-blur-sm"
            >
              {signingOut ? "退出中" : "退出"}
            </button>
          ) : null}
        </header>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
