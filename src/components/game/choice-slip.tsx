import type { ReactNode } from "react";

type SlipState = "idle" | "on" | "miss";

const SRC: Record<SlipState, string> = {
  idle: "/ui/choice-slip.png",
  on: "/ui/choice-on.png",
  miss: "/ui/choice-miss.png",
};

export function SlipShell({
  children,
  state = "idle",
  className = "",
}: {
  children: ReactNode;
  state?: SlipState;
  className?: string;
}) {
  const glow = state === "on" ? "picked" : state === "miss" ? "picked-miss" : "";
  return (
    <span className={`relative block min-h-[5.75rem] overflow-hidden ${glow} ${className}`}>
      <img src={SRC[state]} alt="" className="absolute inset-0 h-full w-full object-cover object-center" />
      <span className="relative z-10 flex min-h-[5.75rem] w-full items-center justify-between gap-2 px-11 py-3.5">
        {children}
      </span>
    </span>
  );
}

export function WoodSlip({
  children,
  state = "idle",
  disabled,
  onClick,
  className = "",
}: {
  children: ReactNode;
  state?: SlipState;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} className={`tap block w-full ${className}`}>
      <SlipShell state={state}>{children}</SlipShell>
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
    <WoodSlip state={state} disabled={disabled} onClick={onClick} className="my-0.5">
      <span className="w-full px-1 text-center text-[13px] leading-snug text-ink">{text}</span>
    </WoodSlip>
  );
}
