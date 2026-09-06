import type { ButtonHTMLAttributes, ReactNode } from "react";

type SlipState = "idle" | "on" | "miss";
type SlipSize = "row" | "choice";

export function SlipShell({
  children,
  state = "idle",
  size = "row",
  className = "",
}: {
  children: ReactNode;
  state?: SlipState;
  size?: SlipSize;
  className?: string;
}) {
  const glow = state === "on" ? "picked" : state === "miss" ? "picked-miss" : "";
  // row：列表行（一屏 5 行不溢出）；choice：答题选项尽量矮，避免挡住场上角色
  const tall = size === "row" ? "min-h-[3.75rem]" : "min-h-[3.1rem]";
  // 答对不换底图（旧 choice-on.png 不透明，会糊成一条深色背景），
  // 保持原木牍，在右端盖一枚玉印对勾；答错仍用原石色木牍。
  const stateClass = state === "miss" ? "ui-slip-miss" : "";
  return (
    <span className={`ui-slip relative block ${stateClass} ${tall} ${glow} ${className}`}>
      <span
        className={`relative z-10 flex ${tall} w-full items-center justify-center gap-2 ${
          size === "row" ? "px-10 py-2.5" : "px-4 py-1"
        }`}
      >
        {children}
      </span>
      {state === "on" ? (
        <span className="pointer-events-none absolute inset-y-0 right-11 z-20 flex items-center">
          {/* 玉印对勾落章：升级为 stamp-in 顿章反馈 */}
          <img src="/ui/check-on.png" alt="" className="stamp-in h-7 w-7 drop-shadow-md" />
        </span>
      ) : null}
    </span>
  );
}

export function WoodSlip({
  children,
  state = "idle",
  size = "row",
  disabled,
  onClick,
  className = "",
}: {
  children: ReactNode;
  state?: SlipState;
  size?: SlipSize;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  // 木简按压采用 tap-deep 重按动效，营造木质古简的下沉厚重手感
  return (
    <button type="button" disabled={disabled} onClick={onClick} className={`tap-deep block w-full ${className}`}>
      <SlipShell state={state} size={size}>
        {children}
      </SlipShell>
    </button>
  );
}

export function ChoiceSlip({
  text,
  state = "idle",
  disabled,
  mark,
  onClick,
}: {
  text: string;
  state?: SlipState;
  disabled?: boolean;
  /** 选项序号印（甲乙丙丁）：小朱砂印，加强「作答」的仪式感。 */
  mark?: string;
  onClick?: () => void;
}) {
  return (
    <WoodSlip state={state} size="choice" disabled={disabled} onClick={onClick} className="my-0">
      <span className="flex w-full items-center justify-center gap-2 text-center">
        {mark ? (
          <span
            aria-hidden
            className="grid h-4.5 w-4.5 shrink-0 place-items-center rounded-[4px] border border-seal/60 font-display text-[10px] leading-none text-seal/85"
          >
            {mark}
          </span>
        ) : null}
        <span className="text-[12.5px] leading-snug text-ink">{text}</span>
      </span>
    </WoodSlip>
  );
}

export function PlaqueFace({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={`relative inline-flex min-h-[3.5rem] min-w-[7.2rem] items-center justify-center ${className}`}>
      <img src="/ui/plaque.png" alt="" className="absolute inset-0 h-full w-full object-cover object-[center_42%]" />
      {/* 暖白字 + 墨影：深松绿匾面上的高对比主按钮字（走查：墨字压墨匾发闷） */}
      <span className="relative z-10 px-7 pt-1.5 pb-2.5 font-display text-lg leading-none tracking-[0.08em] text-[#f8f0dc] [text-shadow:0_1px_1px_rgb(28_23_18/55%),0_2px_6px_rgb(28_23_18/35%)]">
        {children}
      </span>
    </span>
  );
}

export function PlaqueButton({
  children,
  className = "",
  ...props
}: { children: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  // 未激活（disabled）统一置灰：牌匾连字一起变灰、降不透明度与饱和度，
  // 与列表/箭头的处理一致。
  return (
    <button
      type="button"
      {...props}
      className={`tap disabled:grayscale disabled:opacity-50 disabled:saturate-50 ${className}`}
    >
      <PlaqueFace>{children}</PlaqueFace>
    </button>
  );
}
