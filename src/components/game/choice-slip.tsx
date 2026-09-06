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
          <img src="/ui/check-on.png" alt="" className="pop-in h-7 w-7 drop-shadow-md" />
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
  return (
    <button type="button" disabled={disabled} onClick={onClick} className={`tap block w-full ${className}`}>
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
  onClick,
}: {
  text: string;
  state?: SlipState;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <WoodSlip state={state} size="choice" disabled={disabled} onClick={onClick} className="my-0">
      <span className="w-full text-center text-[12.5px] leading-snug text-ink">{text}</span>
    </WoodSlip>
  );
}

export function PlaqueFace({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={`relative inline-flex min-h-[3.5rem] min-w-[7.2rem] items-center justify-center ${className}`}>
      <img src="/ui/plaque.png" alt="" className="absolute inset-0 h-full w-full object-cover object-[center_42%]" />
      <span className="relative z-10 title-ink px-7 pt-1.5 pb-2.5 text-lg leading-none">{children}</span>
    </span>
  );
}

export function PlaqueButton({
  children,
  className = "",
  ...props
}: { children: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  // 未激活（disabled）统一置灰：牌匾连字一起变灰，与列表/箭头的处理一致。
  return (
    <button type="button" {...props} className={`tap disabled:grayscale ${className}`}>
      <PlaqueFace>{children}</PlaqueFace>
    </button>
  );
}
