import { Link } from "@tanstack/react-router";
import { preloadImages } from "@/lib/game/preload";
import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { SettingsButton } from "./settings-modal";

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
    <Link
      to={to}
      className="tap pointer-events-auto relative grid h-11 w-11 shrink-0 place-items-center"
      aria-label="返回"
    >
      <img src="/ui/back-btn.png" alt="" className="h-10 w-10 object-contain drop-shadow-md" />
    </Link>
  );
}

export function ArtPanel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`ui-speech ${className}`}>
      <div className="relative z-10 px-3 pt-4 pb-4">{children}</div>
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
      className={`tap relative mx-auto block disabled:grayscale ${className}`}
    >
      <img src="/ui/jade-btn.png" alt="" className="h-14 w-auto object-contain drop-shadow-md" />
      <span className="pointer-events-none absolute inset-0 grid place-items-center pb-0.5">
        <span className="paper-glow whitespace-nowrap pb-1 font-display text-xl leading-none text-paper">
          {label}
        </span>
      </span>
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
        // 素材未就位时隐藏而不是裂图（AGENTS.md：缺图显示占位底色）
        event.currentTarget.style.visibility = "hidden";
      }}
    />
  );
}

/** 极简顶栏：返回 + 标题 + 设置入口。退出登录收进设置弹窗。
 *  header 本体不拦截事件（pointer-events-none），只有按钮可点：
 *  头部有 pb-8 的透明区，会把下方列表/成就分类 tab 的首行盖住，吃掉点击。 */
export function StageHud({ title, backTo }: { title?: string; backTo?: string }) {
  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center gap-2 px-3 pb-8 pt-[max(0.6rem,env(safe-area-inset-top))]">
      {backTo ? (
        <BackButton to={backTo} />
      ) : (
        <img src="/ui/lantern.png" alt="" className="h-9 w-6 shrink-0 object-contain drop-shadow" />
      )}
      {title ? <p className="hud-title min-w-0 flex-1 truncate text-paper">{title}</p> : <span className="flex-1" />}
      <SettingsButton />
    </header>
  );
}
