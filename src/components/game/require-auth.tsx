import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { SaveProvider } from "@/lib/game/save-context";
import type { ReactNode } from "react";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, isPending } = useCurrentUserState();

  if (isPending) {
    return (
      <div className="relative mx-auto grid min-h-dvh max-w-[430px] place-items-center overflow-hidden bg-ink">
        <img
          src="/art/bg/home.png"
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-[center_48%]"
        />
        <div className="relative z-10 px-6 text-center">
          <img src="/sprites/hero.png" alt="" className="mx-auto h-28 w-auto object-contain idle-bob" />
          <p className="title-art mt-3 text-3xl text-paper">唐小诗环游记</p>
          <p className="mt-2 text-xs tracking-widest text-paper/70">正在打开书卷</p>
        </div>
      </div>
    );
  }

  if (!user) return <RedirectToSignIn />;

  return <SaveProvider>{children}</SaveProvider>;
}
