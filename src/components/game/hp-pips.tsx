import { useEffect, useRef, useState } from "react";

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
  // 记录上一次生命值，用于比对点亮/熄灭动画
  const prevValueRef = useRef(value);
  // 记录当前处于动画中的灯笼索引与状态：'out'（熄灭中，延迟切灰图）| 'in'（重燃中）
  const [animMap, setAnimMap] = useState<Record<number, "out" | "in">>({});

  useEffect(() => {
    const prev = prevValueRef.current;
    if (prev === value) return;

    if (value < prev) {
      // 诗火熄灭：新熄灭的索引区间为 [value, prev - 1]
      // 依契约先播放 .lamp-out（约 500ms），期间保持点亮图与烟痕动效，动画结束后再切灰图
      const newExtinguished: Record<number, "out"> = {};
      for (let i = value; i < prev; i++) {
        newExtinguished[i] = "out";
      }
      setAnimMap((cur) => ({ ...cur, ...newExtinguished }));

      const timer = window.setTimeout(() => {
        setAnimMap((cur) => {
          const next = { ...cur };
          for (let i = value; i < prev; i++) {
            if (next[i] === "out") {
              delete next[i];
            }
          }
          return next;
        });
      }, 500);

      prevValueRef.current = value;
      return () => window.clearTimeout(timer);
    } else {
      // 诗火重燃/增加：新点亮的索引区间为 [prev, value - 1]
      // 依契约播放 .lamp-in 暖橘微光（约 350ms）
      const newRekindled: Record<number, "in"> = {};
      for (let i = prev; i < value; i++) {
        newRekindled[i] = "in";
      }
      setAnimMap((cur) => ({ ...cur, ...newRekindled }));

      const timer = window.setTimeout(() => {
        setAnimMap((cur) => {
          const next = { ...cur };
          for (let i = prev; i < value; i++) {
            if (next[i] === "in") {
              delete next[i];
            }
          }
          return next;
        });
      }, 350);

      prevValueRef.current = value;
      return () => window.clearTimeout(timer);
    }
  }, [value]);

  return (
    <div className="flex items-center gap-1.5">
      {label ? <span className="paper-glow text-xs text-paper/85">{label}</span> : null}
      <div className="flex gap-0.5" aria-label={`${label || ""}${value}格`}>
        {Array.from({ length: max }, (_, i) => {
          const anim = animMap[i];
          // 熄灭动效进行中（anim === 'out'）时保留亮图播放烟火消退；动效结束后再切为熄灭灰图
          const isLampOn = anim === "out" ? true : i < value;
          const animClass = anim === "out" ? "lamp-out" : anim === "in" ? "lamp-in" : "";

          return (
            <span
              key={i}
              className={`relative inline-flex h-5 w-5 items-center justify-center ${animClass}`}
            >
              <img
                src={isLampOn ? "/ui/hp-on.png" : "/ui/hp-off.png"}
                alt=""
                className={`h-5 w-5 object-contain ${isLampOn ? "" : "grayscale"}`}
              />
            </span>
          );
        })}
      </div>
    </div>
  );
}
