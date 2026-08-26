import { useEffect, useState } from "react";

export function SpriteFrames({
  frames,
  fps = 6,
  playing = true,
  className,
  alt = "",
}: {
  frames: readonly string[];
  fps?: number;
  playing?: boolean;
  className?: string;
  alt?: string;
}) {
  const [index, setIndex] = useState(0);
  const count = frames.length;

  useEffect(() => {
    setIndex(0);
  }, [frames]);

  useEffect(() => {
    if (!playing || count <= 1 || fps <= 0) {
      if (!playing) setIndex(0);
      return;
    }
    const id = window.setInterval(() => {
      setIndex((n) => (n + 1) % count);
    }, 1000 / fps);
    return () => window.clearInterval(id);
  }, [playing, count, fps, frames]);

  const src = frames[Math.min(index, count - 1)] ?? frames[0];
  if (!src) return null;
  return <img src={src} alt={alt} draggable={false} className={className} />;
}
