import { Link } from "@tanstack/react-router";
import { authorsInChapter, chaptersIn, collectionById } from "@/lib/game/content";
import { GAME_BACKGROUNDS } from "@/lib/game/content/meta";
import { ArtPanel, Stage, StageHud } from "./stage";

/** 环游第二层：文集的章节页（通用章节形象按章序循环，ADR-0012）。 */
export function TourChapters({ collectionId }: { collectionId: string }) {
  const collection = collectionById(collectionId);
  const chapters = chaptersIn(collectionId);
  return (
    <Stage bg={GAME_BACKGROUNDS.tourChapters}>
      <StageHud title={collection.title} backTo="/tour" />
      <div className="absolute inset-x-0 bottom-0 top-[max(4rem,calc(env(safe-area-inset-top)+3.6rem))] z-10 overflow-y-auto px-4 pb-[max(1.2rem,env(safe-area-inset-bottom))]">
        <p className="mb-3 text-center text-xs tracking-[0.3em] text-paper/90">选一章开始</p>
        <div className="flex flex-col gap-3">
          {chapters.map((ch) => {
            const authors = authorsInChapter(ch.id);
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
                </ArtPanel>
              </Link>
            );
          })}
        </div>
      </div>
    </Stage>
  );
}
