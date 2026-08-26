export function HpPips({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      {label ? <span className="text-xs text-paper/80">{label}</span> : null}
      <div className="flex gap-0.5" aria-label={`${label || ""}${value}血`}>
        {[0, 1, 2].map((i) => (
          <img
            key={i}
            src={i < value ? "/ui/hp-on.png" : "/ui/hp-off.png"}
            alt=""
            className={`h-5 w-5 object-contain ${i < value ? "" : "opacity-50 grayscale"}`}
          />
        ))}
      </div>
    </div>
  );
}
