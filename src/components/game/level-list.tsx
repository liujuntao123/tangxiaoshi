import { useNavigate } from "@tanstack/react-router";
import { LEVEL_COUNT, isLevelUnlocked, levelProgress, levelStars } from "@/lib/game/levels";
import { useSave } from "@/lib/game/save-context";
import { sfxTap } from "@/lib/game/sfx";
import { GAME_BACKGROUNDS } from "@/lib/game/content/meta";
import { PagedList } from "./paged-list";
import { ArtPanel, Stage, StageHud } from "./stage";

/** 关卡卡上的星星：金色星标，未得的星压灰。 */
function StarRow({ stars }: { stars: number }) {
  return (
    <span className="flex justify-center gap-0.5" aria-label={`${stars} 星`}>
      {[1, 2, 3].map((n) => (
        <img
          key={n}
          src="/ui/icon-star.png"
          alt=""
          className={`h-4 w-4 object-contain ${n <= stars ? "" : "opacity-25 grayscale"}`}
        />
      ))}
    </span>
  );
}

/**
 * 关卡列表（ADR-0018）：50 关平铺、顺序解锁，左右按钮分页。
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
      <div className="absolute inset-x-0 bottom-0 top-[max(4rem,calc(env(safe-area-inset-top)+3.6rem))] z-10 flex flex-col px-4 pb-[max(0.8rem,env(safe-area-inset-bottom))]">
        {/* 顶部只留数据：进度与星星；规则说明交给关卡开场面板，不在这里堆文案 */}
        <div className="mb-2 flex justify-center gap-2">
          <span className="caption-pill">{`已通关 ${progress.cleared} / ${LEVEL_COUNT} 关`}</span>
          <span className="caption-pill flex items-center gap-1">
            <img src="/ui/icon-star.png" alt="" className="h-3.5 w-3.5 object-contain" />
            {`${progress.stars} / ${LEVEL_COUNT * 3}`}
          </span>
        </div>
        <PagedList pageSize={9} count={LEVEL_COUNT} className="min-h-0 flex-1">
          {(from, to) => (
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: to - from }, (_, i) => from + i + 1).map((level) => {
                const stars = levelStars(save, level);
                const unlocked = isLevelUnlocked(save, level);
                const isNext = level === progress.cleared + 1;
                return (
                  <button
                    key={level}
                    type="button"
                    disabled={!unlocked}
                    onClick={() => enter(level)}
                    className={`tap block ${unlocked ? "" : "opacity-85"}`}
                    aria-label={
                      unlocked ? `进入第 ${level} 关` : `第 ${level} 关未解锁，先通过第 ${level - 1} 关`
                    }
                  >
                    <ArtPanel
                      className={`rise-in px-1 pt-2 pb-1.5 text-center ${unlocked ? "" : "saturate-[0.35]"}`}
                      style={{ animationDelay: `${(level - from - 1) * 35}ms` }}
                    >
                      <p
                        className={`title-ink whitespace-nowrap text-[15px] leading-none ${
                          unlocked ? "" : "text-ink/55"
                        }`}
                      >
                        {`第 ${level} 关`}
                      </p>
                      {unlocked ? (
                        <>
                          {/* 星级槽：亮星=已得，空心暗星=可冲，未打也有「期待感」 */}
                          <span className="mt-1 block">
                            <StarRow stars={stars} />
                          </span>
                          <p className="mt-0.5 flex h-3.5 items-center justify-center gap-1 whitespace-nowrap text-[9.5px] leading-none text-seal">
                            {isNext ? (
                              <>
                                <span className="inline-block h-1.5 w-1.5 rounded-full bg-seal" />
                                可挑战
                              </>
                            ) : (
                              "可挑战"
                            )}
                          </p>
                        </>
                      ) : (
                        <>
                          {/* 与星槽同高的锁印位 + 状态行：网格里行高对齐不跳动 */}
                          <span className="mt-1 flex h-4 items-center justify-center opacity-45">
                            <img
                              src="/ui/lock.png"
                              alt=""
                              className="h-4 w-4 object-contain"
                              onError={(e) => {
                                e.currentTarget.style.visibility = "hidden";
                              }}
                            />
                          </span>
                          <p className="mt-0.5 flex h-3.5 items-center justify-center whitespace-nowrap text-[9.5px] leading-none text-ink/45">
                            未解锁
                          </p>
                        </>
                      )}
                    </ArtPanel>
                  </button>
                );
              })}
            </div>
          )}
        </PagedList>
      </div>
    </Stage>
  );
}
