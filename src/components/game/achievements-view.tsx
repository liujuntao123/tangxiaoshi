import { ACHIEVEMENTS } from "@/lib/game/content";
import { useSave } from "@/lib/game/save-context";
import { PoetImg, Stage, StageHud } from "./stage";

export function AchievementsView() {
  const { save } = useSave();
  const poets = ACHIEVEMENTS.filter((item) => item.kind === "poet");
  const rest = ACHIEVEMENTS.filter((item) => item.kind !== "poet");
  const featured = poets.find((item) => save.achievements.includes(item.id)) ?? poets[0];

  return (
    <Stage bg="/art/scene-palace.jpg" dim>
      <StageHud title="成就" backTo="/" />
      {featured ? (
        <div className="absolute inset-x-0 top-[16%] z-10 flex flex-col items-center px-6">
          <div className="relative flex h-36 w-28 items-end justify-center">
            <span className="sprite-shadow" />
            <PoetImg
              src={featured.art}
              className={`relative z-10 h-36 w-auto object-contain object-bottom drop-shadow-lg ${
                save.achievements.includes(featured.id) ? "" : "grayscale opacity-70"
              }`}
            />
          </div>
          <p className="paper-glow mt-1 text-[11px] tracking-[0.35em] text-paper/80">
            {save.achievements.includes(featured.id) ? "诗人卡 · 已获得" : "诗人卡 · 未获得"}
          </p>
          <p className="title-art paper-glow text-2xl text-paper">{featured.title}</p>
        </div>
      ) : null}

      <div className="dock-fade absolute inset-x-0 bottom-0 top-[48%] z-10 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-6">
        <div className="grid grid-cols-3 gap-y-4">
          {poets.map((item) => {
            const owned = save.achievements.includes(item.id);
            return (
              <div key={item.id} className={`text-center ${owned ? "" : "opacity-50"}`}>
                <PoetImg
                  src={item.art}
                  className={`mx-auto h-10 w-10 object-contain ${owned ? "" : "grayscale"}`}
                />
                <p className="mt-1 truncate px-1 text-[13px] tracking-wide text-paper">{item.title.replace("回来了", "")}</p>
              </div>
            );
          })}
        </div>
        <div className="mt-6 grid grid-cols-2 gap-y-3">
          {rest.map((item) => {
            const owned = save.achievements.includes(item.id);
            return (
              <div key={item.id} className={`text-center ${owned ? "" : "opacity-55"}`}>
                <p className="hud-title text-paper">{item.title}</p>
                <p className="paper-glow text-[11px] text-paper/70">{item.hint}</p>
              </div>
            );
          })}
        </div>
      </div>
    </Stage>
  );
}
