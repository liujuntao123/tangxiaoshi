import { Link } from "@tanstack/react-router";
import { preloadImages } from "@/lib/game/preload";
import { useEffect, useState, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from "react";
import { SettingsButton } from "./settings-modal";

export function Stage({
  bg,
  dim,
  children,
}: {
  bg: string;
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
      <div className="relative mx-auto h-dvh w-full max-w-[430px] overflow-hidden">
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

export function ArtPanel({
  children,
  className = "",
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  // className 落在内容层而不是 border-image 外壳上：调用方写的 flex/text-center
  // 描述的是「卡片内容怎么排」，此前落在外壳上会导致 flex 失效、内容竖排
  // （头像下面才是一行字，右侧整片留白）。style 同样给内容层（入场错峰延迟等）。
  return (
    <div className="ui-speech">
      <div className={`relative z-10 px-4 pt-4 pb-4 ${className}`} style={style}>
        {children}
      </div>
    </div>
  );
}

/** 场景上的分节说明：深墨胶囊，浅色背景上依然可读（替代裸 text-paper）。 */
export function PanelCaption({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <p className={`flex justify-center ${className}`}>
      <span className="caption-pill">{children}</span>
    </p>
  );
}

/** 右端「可进入」的呼吸箭头：列表行的游戏化 CTA 语言。 */
export function RowChevron() {
  return (
    <span
      aria-hidden
      className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-ink/20 bg-ink/5 font-display text-base leading-none text-ink-soft"
    >
      ›
    </span>
  );
}

/** 圆形玉环头像：立绘顶部裁切（露出脸），小图不再发飘。 */
export function PortraitMedal({ src, size = 64 }: { src: string; size?: number }) {
  return (
    <span className="medal" style={{ width: size, height: size }}>
      <PoetImg src={src} className="h-full w-full object-cover object-top" />
    </span>
  );
}

/** 图槽：给透明小图（书签/文集形象/成就图）一个承托底，压住卡片空白。 */
export function ArtSlot({
  src,
  className = "",
  imgClassName = "",
}: {
  src: string;
  className?: string;
  imgClassName?: string;
}) {
  return (
    <span className={`art-slot ${className}`}>
      <img
        src={src}
        alt=""
        onError={(e) => {
          e.currentTarget.style.visibility = "hidden";
        }}
        className={`max-h-full max-w-full object-contain ${imgClassName}`}
      />
    </span>
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
        /* 审查 P1-03：移除无交互的悬挂孤立小灯笼，保留占位以对齐右侧设置入口 */
        <span className="h-11 w-11 shrink-0" aria-hidden />
      )}
      {title ? <p className="hud-title min-w-0 flex-1 truncate text-paper">{title}</p> : <span className="flex-1" />}
      <SettingsButton />
    </header>
  );
}
