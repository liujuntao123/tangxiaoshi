import { useNavigate } from "@tanstack/react-router";
import {
  LEVEL_COUNT,
  LEVEL_PASS,
  QUESTIONS_PER_LEVEL,
  isLevelUnlocked,
  levelProgress,
  levelStars,
} from "@/lib/game/levels";
import { useSave } from "@/lib/game/save-context";
import { sfxTap } from "@/lib/game/sfx";
import { GAME_BACKGROUNDS } from "@/lib/game/content/meta";
import { ArtPanel, PanelCaption, Stage, StageHud } from "./stage";

/**
 * 关卡列表（ADR-0018）：50 个平铺关卡，顺序解锁。
 * 每张卡只回答三件事：第几关、几颗星、能不能打。
 */
export function LevelList() {
  const navigate = useNavigate();
  const { save } = useSave();
  const progress = levelProgress(save);

  function enter(level: number) {
    if (!isLevelUnlocked(save, level)) return;
    sfxTap();
    void navigate({ to: "/levels/$levelId", params: { levelId: String(level) } });
  }

  return (
    <Stage bg={GAME_BACKGROUNDS.levels}>
      <StageHud title="关卡" backTo="/" />
      <div className="absolute inset-x-0 bottom-0 top-[max(4rem,calc(env(safe-area-inset-top)+3.6rem))] z-10 overflow-y-auto px-4 pb-[max(1.6rem,env(safe-area-inset-bottom))]">
        <div className="mb-3 flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-2">
            <span className="caption-pill">{`已通关 ${progress.cleared} / ${LEVEL_COUNT} 关`}</span>
            <span className="caption-pill">{`星星 ${progress.stars} / ${LEVEL_COUNT * 3}`}</span>
          </div>
          <span className="caption-pill text-[10.5px]">
            {`每关 ${QUESTIONS_PER_LEVEL} 道题 · 答对 ${LEVEL_PASS} 题过关 · 过关开下一关`}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: LEVEL_COUNT }, (_, i) => i + 1).map((level) => {
            const stars = levelStars(save, level);
            const unlocked = isLevelUnlocked(save, level);
            return (
              <button
                key={level}
                type="button"
                disabled={!unlocked}
                onClick={() => enter(level)}
                className={`tap block ${unlocked ? "" : "opacity-55 grayscale"}`}
                aria-label={
                  unlocked ? `进入第 ${level} 关` : `第 ${level} 关未解锁，先通过第 ${level - 1} 关`
                }
              >
                <ArtPanel className="rise-in px-1 pt-2.5 pb-2 text-center" style={{ animationDelay: `${(level % 9) * 40}ms` }}>
                  <p className="title-ink whitespace-nowrap text-[15px] leading-none">{`第 ${level} 关`}</p>
                  {stars > 0 ? (
                    <p className="mt-1.5 whitespace-nowrap text-[12px] leading-none tracking-[0.14em] text-seal" aria-label={`${stars} 星`}>
                      {"★".repeat(stars)}
                      <span className="text-ink/20">{"★".repeat(3 - stars)}</span>
                    </p>
                  ) : (
                    <p className="mt-1.5 text-[10.5px] leading-none text-ink/45">
                      {unlocked ? "可挑战" : "未解锁"}
                    </p>
                  )}
                </ArtPanel>
              </button>
            );
          })}
        </div>
        <PanelCaption className="mt-3">题目专为你出，重打还是这套题。</PanelCaption>
      </div>
    </Stage>
  );
}
