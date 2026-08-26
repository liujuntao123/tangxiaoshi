type SlipState = "idle" | "on" | "miss";

const SRC: Record<SlipState, string> = {
  idle: "/ui/choice-slip.png",
  on: "/ui/choice-on.png",
  miss: "/ui/choice-miss.png",
};

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
  const inner = (
    <>
      <img src={SRC[state]} alt="" className="absolute inset-0 h-full w-full object-fill" />
      <span className="relative z-10 px-8 text-center text-[13px] leading-snug text-ink">{text}</span>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className="relative flex h-14 w-full items-center justify-center"
      >
        {inner}
      </button>
    );
  }

  return <div className="relative flex h-14 w-full items-center justify-center">{inner}</div>;
}
