import { Link } from "@tanstack/react-router";
import { authorsInChapter, chaptersIn, collectionById, poemsInChapter } from "@/lib/game/content";
import { GAME_BACKGROUNDS } from "@/lib/game/content/meta";
import { useSave } from "@/lib/game/save-context";
import { ArtPanel, ArtSlot, PanelCaption, RowChevron, Stage, StageHud } from "./stage";

/** 资料库第二层：文集的章节页（通用章节形象按章序循环，ADR-0012）。
 *  章节诗印取自各诗卡历史最佳（玩法重做口径，ADR-0015）。
 *  行卡 = 图槽书签 + 章名 + 作者名录 + 诗印进度条，压住卡片空白。 */
export function TourChapters({ collectionId }: { collectionId: string }) {
  const collection = collectionById(collectionId);
  const chapters = chaptersIn(collectionId);
  const { save } = useSave();
  return (
    <Stage bg={GAME_BACKGROUNDS.tourChapters}>
      <StageHud title={collection.title} backTo="/library" />
      <div className="absolute inset-x-0 bottom-0 top-[max(4rem,calc(env(safe-area-inset-top)+3.6rem))] z-10 overflow-y-auto px-5 pb-[max(1.6rem,env(safe-area-inset-bottom))]">
        <PanelCaption className="mb-3">选一章开始</PanelCaption>
        <div className="flex flex-col gap-3">
          {chapters.map((ch, i) => {
            const authors = authorsInChapter(ch.id);
            const poems = poemsInChapter(ch.id);
            const stars = poems.reduce(
              (sum, poem) => sum + (save.poemRecords[poem.id]?.bestStars ?? 0),
              0,
            );
            const starMax = poems.length * 3;
            const pct = starMax > 0 ? Math.round((stars / starMax) * 100) : 0;
            return (
              <Link
                key={ch.id}
                to="/library/$collectionId/$chapterId"
                params={{ collectionId, chapterId: ch.id }}
                className="tap block"
              >
                <ArtPanel
                  className="rise-in flex items-center gap-3 text-left"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <ArtSlot className="h-16 w-12" imgClassName="h-14" src={ch.art} />
                  <div className="min-w-0 flex-1">
                    <p className="title-ink truncate text-lg leading-tight">{`第${ch.index}章 ${ch.title}`}</p>
                    <p className="mt-0.5 truncate text-xs text-ink-soft">
                      {`${authors.map((a) => a.name).join("、")} · ${ch.poemCount} 首`}
                    </p>
                    <p className="mt-1.5 flex items-center gap-2">
                      <span className="meter w-full max-w-28">
                        <i className="meter-fill block" style={{ width: `${pct}%` }} />
                      </span>
                      <span
                        className={`flex shrink-0 items-center gap-1 text-[11px] tabular-nums ${
                          stars > 0 ? "text-seal" : "text-ink-soft"
                        }`}
                      >
                        <span
                          aria-hidden
                          className={`grid h-3.5 w-3.5 place-items-center rounded-full border font-display text-[8px] leading-none ${
                            stars > 0 ? "border-seal bg-seal text-paper" : "border-ink/30 bg-ink/10 text-ink-soft"
                          }`}
                        >
                          印
                        </span>
                        {`${stars}/${starMax}`}
                      </span>
                    </p>
                  </div>
                  <RowChevron />
                </ArtPanel>
              </Link>
            );
          })}
        </div>
      </div>
    </Stage>
  );
}
