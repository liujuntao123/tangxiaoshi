import { Link } from "@tanstack/react-router";
import { authorById, collectionById, poemById } from "@/lib/game/content";
import { GAME_BACKGROUNDS } from "@/lib/game/content/meta";
import { clearedCount, continueTarget, totalStars } from "@/lib/game/progress";
import { useSave } from "@/lib/game/save-context";
import { PlaqueFace } from "./choice-slip";
import { Stage, StageHud } from "./stage";

const modes = [
  { to: "/tour" as const, title: "环游", art: "/ui/icon-story.png" },
  { to: "/endless" as const, title: "无尽", art: "/ui/icon-endless.png" },
  { to: "/practice" as const, title: "练习", art: "/ui/icon-practice.png" },
  { to: "/achievements" as const, title: "成就", art: "/ui/icon-achieve.png" },
];

/** 首页：上游「环游记」门面 + 玩法重做的主目标按钮与真实统计（ADR-0015）。 */
export function HomeScreen() {
  const { save } = useSave();
  const progress = clearedCount(save);
  const stars = totalStars(save);
  const target = continueTarget(save);
  const targetPoem = target ? poemById(target.poemId) : null;
  const targetCollection = targetPoem ? collectionById(targetPoem.collectionId) : null;
  const targetAuthorName = targetPoem ? authorById(targetPoem.authorId).name : "";

  return (
    <Stage bg={GAME_BACKGROUNDS.home}>
      <StageHud />
      <p className="title-art paper-glow absolute inset-x-0 top-[10%] z-10 text-center text-[2.3rem] text-paper">
        唐小诗环游记
      </p>
      <p className="paper-glow absolute inset-x-0 top-[18%] z-10 text-center text-xs tracking-[0.22em] text-paper/95">
        {`已通关 ${progress.have} / ${progress.total} 首诗`}
      </p>
      <div className="absolute inset-x-0 top-[22%] z-10 grid grid-cols-3 gap-1 px-6 text-center">
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
          <p className="paper-glow text-[11px] tracking-widest text-paper/70">环游总分</p>
        </div>
        <div>
          <p className="hud-title text-paper">{save.endlessBestStreak}</p>
          <p className="paper-glow text-[11px] tracking-widest text-paper/70">无尽最高连对</p>
        </div>
      </div>
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
      <div className="absolute inset-x-0 bottom-[15%] z-20 flex flex-col items-center gap-1 px-4">
        {targetPoem && targetCollection ? (
          <Link
            to="/play/$poemId"
            params={{ poemId: targetPoem.id }}
            className="tap"
            aria-label={target?.replay ? "再战提分" : "继续环游"}
          >
            <PlaqueFace className="scale-110">{target?.replay ? "再战提分" : "继续环游"}</PlaqueFace>
          </Link>
        ) : (
          <Link to="/tour" className="tap" aria-label="去环游">
            <PlaqueFace className="scale-110">去环游</PlaqueFace>
          </Link>
        )}
        {targetPoem && targetCollection ? (
          <p className="paper-glow text-center text-[11px] tracking-widest text-paper/80">
            {`前往：《${targetCollection.title}》· ${targetAuthorName}《${targetPoem.title}》`}
          </p>
        ) : null}
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
