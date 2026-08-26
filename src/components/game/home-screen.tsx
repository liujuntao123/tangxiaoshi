import { Link } from "@tanstack/react-router";
import { Stage, StageHud } from "./stage";

const modes = [
  { to: "/story" as const, title: "历险", art: "/ui/icon-story.png" },
  { to: "/endless" as const, title: "无尽", art: "/sprites/fx/bolt.png" },
  { to: "/practice" as const, title: "练习", art: "/ui/icon-practice.png" },
  { to: "/achievements" as const, title: "成就", art: "/ui/icon-achieve.png" },
];

export function HomeScreen() {
  return (
    <Stage bg="/art/scene-moon.jpg">
      <StageHud />
      <p className="title-art paper-glow absolute inset-x-0 top-[15%] z-10 text-center text-[2.1rem] text-paper">
        去救李白
      </p>
      <div className="absolute inset-x-0 bottom-[18%] z-10 flex justify-center">
        <div className="relative flex h-44 w-36 items-end justify-center">
          <span className="sprite-shadow" />
          <img
            src="/sprites/hero.png"
            alt="唐小诗"
            className="relative z-10 h-44 w-auto object-contain object-bottom drop-shadow-lg idle-bob"
          />
        </div>
      </div>
      <nav className="dock-fade absolute inset-x-0 bottom-0 z-20 grid grid-cols-4 px-2 pb-[max(1rem,env(safe-area-inset-bottom))] pt-14">
        {modes.map((mode) => (
          <Link
            key={mode.to}
            to={mode.to}
            className="flex flex-col items-center gap-1 py-2 transition-transform duration-150 active:scale-95"
          >
            <img src={mode.art} alt="" className="h-10 w-10 object-contain drop-shadow-md" />
            <span className="hud-title text-paper">{mode.title}</span>
          </Link>
        ))}
      </nav>
    </Stage>
  );
}
