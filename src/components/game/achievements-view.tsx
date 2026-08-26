import { ACHIEVEMENTS } from "@/lib/game/content";
import { useSave } from "@/lib/game/save-context";
import { Stage, StageHud } from "./stage";

export function AchievementsView() {
  const { save } = useSave();
  const poet = ACHIEVEMENTS[0];
  const others = ACHIEVEMENTS.slice(1);
  const poetOwned = poet ? save.achievements.includes(poet.id) : false;

  return (
    <Stage bg="/art/scene-palace.jpg" dim>
      <StageHud title="成就" backTo="/" />
      {poet ? (
        <div className="absolute inset-x-0 bottom-[30%] z-10 flex flex-col items-center px-6">
          <div className="relative flex h-48 w-36 items-end justify-center">
            <span className="sprite-shadow" />
            <img
              src={poet.art}
              alt=""
              className={`relative z-10 h-48 w-auto object-contain object-bottom drop-shadow-lg ${
                poetOwned ? "" : "grayscale opacity-70"
              }`}
            />
          </div>
          <p className="paper-glow mt-2 text-[11px] tracking-[0.35em] text-paper/80">
            {poetOwned ? "诗人卡 · 已获得" : "诗人卡 · 未获得"}
          </p>
          <p className="title-art paper-glow text-3xl text-paper">{poet.title}</p>
          <p className="paper-glow mt-1 text-xs text-paper/75">{poet.hint}</p>
        </div>
      ) : null}

      <div className="dock-fade absolute inset-x-0 bottom-0 z-10 grid grid-cols-2 gap-y-3 px-4 pb-[max(1.2rem,env(safe-area-inset-bottom))] pt-12">
        {others.map((item) => {
          const owned = save.achievements.includes(item.id);
          return (
            <div key={item.id} className={`text-center ${owned ? "" : "opacity-55"}`}>
              <img
                src={item.art}
                alt=""
                className={`mx-auto h-11 w-11 object-contain drop-shadow ${owned ? "" : "grayscale"}`}
              />
              <p className="hud-title mt-1 text-paper">{item.title}</p>
              <p className="paper-glow text-[11px] text-paper/70">{item.hint}</p>
            </div>
          );
        })}
      </div>
    </Stage>
  );
}
