import type { ButtonHTMLAttributes, ReactNode } from "react";

type SlipState = "idle" | "on" | "miss";
type SlipSize = "row" | "choice";

const SRC: Record<SlipState, string> = {
  idle: "/ui/choice-slip.png",
  on: "/ui/choice-on.png",
  miss: "/ui/choice-miss.png",
};

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
  // row：列表两行；choice：答题选项尽量矮，避免挡住场上角色
  const tall = size === "row" ? "min-h-[7.2rem]" : "min-h-[3.85rem]";
  const pad = size === "row" ? "px-[15%] pt-[12%] pb-[18%]" : "px-[14%] pt-[10%] pb-[14%]";
  return (
    <span className={`relative block overflow-hidden ${tall} ${glow} ${className}`}>
      <img
        src={SRC[state]}
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-[center_42%]"
      />
      <span className={`relative z-10 flex ${tall} w-full items-center justify-between gap-2 ${pad}`}>
        {children}
      </span>
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
  return (
    <button type="button" {...props} className={`tap ${className}`}>
      <PlaqueFace>{children}</PlaqueFace>
    </button>
  );
}
