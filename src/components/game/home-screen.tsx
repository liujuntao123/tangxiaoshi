import { Link } from "@tanstack/react-router";
import { GAME_BACKGROUNDS } from "@/lib/game/content/meta";
import { clearedCount } from "@/lib/game/progress";
import { useSave } from "@/lib/game/save-context";
import { Stage, StageHud } from "./stage";

const modes = [
  { to: "/tour" as const, title: "环游", art: "/ui/icon-story.png" },
  { to: "/endless" as const, title: "无尽", art: "/ui/icon-endless.png" },
  { to: "/practice" as const, title: "练习", art: "/ui/icon-practice.png" },
  { to: "/achievements" as const, title: "成就", art: "/ui/icon-achieve.png" },
];

export function HomeScreen() {
  const { save } = useSave();
  const progress = clearedCount(save);
  return (
    <Stage bg={GAME_BACKGROUNDS.home}>
      <StageHud />
      <p className="title-art paper-glow absolute inset-x-0 top-[16%] z-10 text-center text-[2.3rem] text-paper">
        唐小诗环游记
      </p>
      <p className="paper-glow absolute inset-x-0 top-[25%] z-10 text-center text-xs tracking-[0.22em] text-paper/95">
        {`已通关 ${progress.have} / ${progress.total} 首诗`}
      </p>
      <div className="absolute inset-x-0 bottom-[22%] z-10 flex justify-center">
        <div className="relative flex h-44 w-36 items-end justify-center">
          <span className="sprite-shadow" />
          <img
            src="/sprites/hero.png"
            alt="唐小诗"
            onError={(e) => {
              e.currentTarget.style.visibility = "hidden";
            }}
            className="relative z-10 h-44 w-auto object-contain object-bottom drop-shadow-lg idle-bob"
          />
        </div>
      </div>
      <nav className="dock-fade absolute inset-x-0 bottom-0 z-20 grid grid-cols-4 px-2 pb-[max(1rem,env(safe-area-inset-bottom))] pt-14">
        {modes.map((mode) => (
          <Link key={mode.to} to={mode.to} className="tap flex flex-col items-center gap-1 py-2">
            <img src={mode.art} alt="" className="h-10 w-10 object-contain drop-shadow-md" />
            <span className="hud-title text-paper">{mode.title}</span>
          </Link>
        ))}
      </nav>
    </Stage>
  );
}
