export function HpPips({
  value,
  label,
  max = 3,
}: {
  value: number;
  label: string;
  /** 灯笼总数（机会数随关卡题数与及格线浮动，不再固定 3 血）。 */
  max?: number;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {label ? <span className="text-xs text-paper/80">{label}</span> : null}
      <div className="flex gap-0.5" aria-label={`${label || ""}${value}格`}>
        {Array.from({ length: max }, (_, i) => (
          <img
            key={i}
            src={i < value ? "/ui/hp-on.png" : "/ui/hp-off.png"}
            alt=""
            className={`h-5 w-5 object-contain ${i < value ? "" : "grayscale"}`}
          />
        ))}
      </div>
    </div>
  );
}
