import { Link } from "@tanstack/react-router";
import { signOut } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { CHAPTERS } from "@/lib/game/content";
import { preloadImages } from "@/lib/game/preload";
import { rescuedCount } from "@/lib/game/progress";
import { useSave } from "@/lib/game/save-context";
import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from "react";

export function Stage({
  bg,
  shake,
  dim,
  children,
}: {
  bg: string;
  shake?: boolean;
  dim?: boolean;
  children: ReactNode;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    preloadImages([bg]);
    let live = true;
    const img = new Image();
    img.onload = () => {
      if (live) setReady(true);
    };
    img.src = bg;
    if (img.complete) setReady(true);
    else setReady(false);
    return () => {
      live = false;
    };
  }, [bg]);

  return (
    <div className="min-h-dvh bg-ink">
      <div
        className={`relative mx-auto h-dvh w-full max-w-[430px] overflow-hidden ${shake ? "stage-shake" : ""}`}
      >
        <img
          src={bg}
          alt=""
          decoding="async"
          onLoad={() => setReady(true)}
          className={`absolute inset-0 h-full w-full object-cover object-[center_48%] stage-photo ${ready ? "is-in" : ""}`}
        />
        <div
          className={`absolute inset-0 ${
            dim ? "bg-ink/35" : "bg-gradient-to-b from-ink/30 via-transparent to-ink/15"
          }`}
        />
        {children}
      </div>
    </div>
  );
}

export function BackButton({ to }: { to: string }) {
  return (
    <Link to={to} className="tap relative grid h-11 w-11 shrink-0 place-items-center" aria-label="返回">
      <img src="/ui/back-btn.png" alt="" className="h-10 w-10 object-contain drop-shadow-md" />
    </Link>
  );
}

export function ArtPanel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <img
        src="/ui/speech-panel.png"
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
      />
      <div className="relative z-10 px-[16%] pt-[20%] pb-[22%]">{children}</div>
    </div>
  );
}

export function JadeEnter({
  label,
  className = "",
  ...props
}: { label: string } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label={label}
      {...props}
      className={`tap mx-auto block disabled:opacity-50 ${className}`}
    >
      <img src="/ui/jade-btn.png" alt="" className="h-14 w-auto object-contain drop-shadow-md" />
    </button>
  );
}

export function PoetImg({ src, className = "" }: { src: string; className?: string }) {
  return (
    <img
      src={src}
      alt=""
      decoding="async"
      className={className}
      onError={(event) => {
        event.currentTarget.src = "/sprites/poets/default.png";
      }}
    />
  );
}

export function StageHud({ title, backTo }: { title?: string; backTo?: string }) {
  const { user, isPending } = useCurrentUserState();
  const { save } = useSave();
  const [signingOut, setSigningOut] = useState(false);
  const poets = rescuedCount(save);

  return (
    <header className="hud-fade absolute inset-x-0 top-0 z-20 flex items-center gap-3 px-3 pb-12 pt-[max(0.7rem,env(safe-area-inset-top))]">
      {backTo ? (
        <BackButton to={backTo} />
      ) : (
        <img src="/ui/lantern.png" alt="" className="h-10 w-7 shrink-0 object-contain drop-shadow" />
      )}
      <div className="min-w-0 flex-1">
        {title ? <p className="hud-title truncate text-paper">{title}</p> : null}
        <p className="mt-0.5 flex items-center gap-1 text-[11px] tracking-[0.18em] text-paper/85">
          <img src="/sprites/key.png" alt="" className="h-3.5 w-3.5 object-contain" />
          诗人 {poets.have}/{poets.total || CHAPTERS.length}
        </p>
      </div>
      {isPending ? (
        <div className="h-8 w-10" />
      ) : user ? (
        <button
          type="button"
          disabled={signingOut}
          onClick={() => {
            setSigningOut(true);
            void signOut("/login").catch(() => setSigningOut(false));
          }}
          className="tap shrink-0 text-[11px] tracking-[0.2em] text-paper/70"
        >
          {signingOut ? "…" : "退出"}
        </button>
      ) : null}
    </header>
  );
}
