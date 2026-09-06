import { Link } from "@tanstack/react-router";
import { authorsInChapter, chaptersIn, collectionById, poemsInChapter } from "@/lib/game/content";
import { GAME_BACKGROUNDS } from "@/lib/game/content/meta";
import { useSave } from "@/lib/game/save-context";
import { ArtPanel, Stage, StageHud } from "./stage";

/** 环游第二层：文集的章节页（通用章节形象按章序循环，ADR-0012）。
 *  章节诗印取自各诗卡历史最佳（玩法重做口径，ADR-0015）。 */
export function TourChapters({ collectionId }: { collectionId: string }) {
  const collection = collectionById(collectionId);
  const chapters = chaptersIn(collectionId);
  const { save } = useSave();
  return (
    <Stage bg={GAME_BACKGROUNDS.tourChapters}>
      <StageHud title={collection.title} backTo="/tour" />
      <div className="absolute inset-x-0 bottom-0 top-[max(4rem,calc(env(safe-area-inset-top)+3.6rem))] z-10 overflow-y-auto px-4 pb-[max(1.2rem,env(safe-area-inset-bottom))]">
        <p className="mb-3 text-center text-xs tracking-[0.3em] text-paper/90">选一章开始</p>
        <div className="flex flex-col gap-3">
          {chapters.map((ch) => {
            const authors = authorsInChapter(ch.id);
            const poems = poemsInChapter(ch.id);
            const stars = poems.reduce(
              (sum, poem) => sum + (save.poemRecords[poem.id]?.bestStars ?? 0),
              0,
            );
            const starMax = poems.length * 3;
            return (
              <Link
                key={ch.id}
                to="/tour/$collectionId/$chapterId"
                params={{ collectionId, chapterId: ch.id }}
                className="tap block"
              >
                <ArtPanel className="flex items-center gap-3 text-left">
                  <img
                    src={ch.art}
                    alt=""
                    onError={(e) => {
                      e.currentTarget.style.visibility = "hidden";
                    }}
                    className="h-16 w-12 shrink-0 object-contain"
                  />
                  <div className="min-w-0 flex-1 px-1">
                    <p className="title-ink text-lg leading-tight">{`第${ch.index}章 ${ch.title}`}</p>
                    <p className="mt-1 text-xs text-ink-soft">
                      {`${authors.map((a) => a.name).join("、")} · ${ch.poemCount} 首`}
                    </p>
                  </div>
                  <span className="shrink-0 pr-1 text-right text-[11px] tracking-widest text-ink-soft">
                    <span className="flex items-center justify-end gap-1">
                      <span
                        aria-hidden
                        className="grid h-3.5 w-3.5 place-items-center rounded-full border border-seal bg-seal font-display text-[8px] leading-none text-paper"
                      >
                        印
                      </span>
                      <span className={stars > 0 ? "text-seal" : ""}>{`${stars}/${starMax}`}</span>
                    </span>
                  </span>
                </ArtPanel>
              </Link>
            );
          })}
        </div>
      </div>
    </Stage>
  );
}
