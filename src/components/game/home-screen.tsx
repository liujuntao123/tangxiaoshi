import { Link } from "@tanstack/react-router";
import { chapterOfLevel, levelById } from "@/lib/game/content";
import { continueTarget, rescuedCount, totalStars } from "@/lib/game/progress";
import { useSave } from "@/lib/game/save-context";
import { PlaqueFace } from "./choice-slip";
import { Stage, StageHud } from "./stage";

const modes = [
  { to: "/story" as const, title: "历险", art: "/ui/icon-story.png" },
  { to: "/endless" as const, title: "无尽", art: "/sprites/fx/bolt.png" },
  { to: "/practice" as const, title: "练习", art: "/ui/icon-practice.png" },
  { to: "/achievements" as const, title: "成就", art: "/ui/icon-achieve.png" },
];

export function HomeScreen() {
  const { save } = useSave();
  const poets = rescuedCount(save);
  const stars = totalStars(save);
  const target = continueTarget(save);
  const targetLevel = target ? levelById(target.levelId) : null;
  const targetChapter = targetLevel ? chapterOfLevel(targetLevel) : null;

  return (
    <Stage bg="/art/scene-moon.jpg">
      <StageHud />
      <p className="title-art paper-glow absolute inset-x-0 top-[11%] z-10 text-center text-[2.1rem] text-paper">
        去救诗人
      </p>
      <p className="paper-glow absolute inset-x-0 top-[19%] z-10 text-center text-[11px] tracking-[0.22em] text-paper/80">
        {poets.have === 0 ? "从先秦一路走到宋" : `已救出 ${poets.have}/${poets.total} 位诗人`}
      </p>
      <div className="absolute inset-x-0 top-[24%] z-10 grid grid-cols-3 gap-1 px-6 text-center">
        <div>
          <p className="hud-title flex items-center justify-center gap-1 text-paper">
            <span
              aria-hidden
              className="grid h-4 w-4 place-items-center rounded-full border border-seal bg-seal font-display text-[9px] leading-none text-paper"
            >
              印
            </span>
            {stars}
          </p>
          <p className="paper-glow text-[11px] tracking-widest text-paper/70">已获诗印</p>
        </div>
        <div>
          <p className="hud-title text-paper">{save.totalScore}</p>
          <p className="paper-glow text-[11px] tracking-widest text-paper/70">主线总分</p>
        </div>
        <div>
          <p className="hud-title text-paper">{save.endlessBestStreak}</p>
          <p className="paper-glow text-[11px] tracking-widest text-paper/70">无尽最高连对</p>
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-[32%] z-10 flex justify-center">
        <div className="relative flex h-40 w-36 items-end justify-center">
          <span className="sprite-shadow" />
          <img
            src="/sprites/hero.png"
            alt="唐小诗"
            className="relative z-10 h-40 w-auto object-contain object-bottom drop-shadow-lg idle-bob"
          />
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-[17%] z-20 flex flex-col items-center gap-1 px-4">
        {target ? (
          <Link
            to="/play/$levelId"
            params={{ levelId: target.levelId }}
            className="tap"
            aria-label={target.replay ? "再战提分" : "继续历险"}
          >
            <PlaqueFace className="scale-110">{target.replay ? "再战提分" : "继续历险"}</PlaqueFace>
          </Link>
        ) : (
          <Link to="/story" className="tap" aria-label="去历险">
            <PlaqueFace className="scale-110">去历险</PlaqueFace>
          </Link>
        )}
        {targetLevel && targetChapter ? (
          <p className="paper-glow text-center text-[11px] tracking-widest text-paper/80">
            前往：{targetChapter.poetName} · {targetLevel.place}
          </p>
        ) : null}
      </div>
      <nav className="dock-fade absolute inset-x-0 bottom-0 z-20 grid grid-cols-4 px-2 pb-[max(1rem,env(safe-area-inset-bottom))] pt-14">
        {modes.map((mode) => (
          <Link
            key={mode.to}
            to={mode.to}
            className="tap flex flex-col items-center gap-1 py-2"
          >
            <img src={mode.art} alt="" className="h-10 w-10 object-contain drop-shadow-md" />
            <span className="hud-title text-paper">{mode.title}</span>
          </Link>
        ))}
      </nav>
    </Stage>
  );
}
