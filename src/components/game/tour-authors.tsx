import { Link } from "@tanstack/react-router";
import { authorsInChapter, chapterById, collectionById, poemsByAuthor } from "@/lib/game/content";
import { GAME_BACKGROUNDS } from "@/lib/game/content/meta";
import { useSave } from "@/lib/game/save-context";
import { ArtPanel, PoetImg, Stage, StageHud } from "./stage";

/** 环游第三层：章节内的作者列表（首遇引导语在作者页，ADR-0011）。 */
export function TourAuthors({ collectionId, chapterId }: { collectionId: string; chapterId: string }) {
  const { save } = useSave();
  const collection = collectionById(collectionId);
  const chapter = chapterById(chapterId);
  const authors = authorsInChapter(chapterId);
  return (
    <Stage bg={GAME_BACKGROUNDS.tourAuthor}>
      <StageHud title={`第${chapter.index}章 ${chapter.title}`} backTo={`/tour/${collectionId}`} />
      <div className="absolute inset-x-0 bottom-0 top-[max(4rem,calc(env(safe-area-inset-top)+3.6rem))] z-10 overflow-y-auto px-4 pb-[max(1.2rem,env(safe-area-inset-bottom))]">
        <p className="mb-3 text-center text-xs tracking-[0.3em] text-paper/90">{`《${collection.title}》的作者`}</p>
        <div className="flex flex-col gap-3">
          {authors.map((a) => {
            const cleared = poemsByAuthor(a.id).filter((p) => save.clearedPoems.includes(p.id)).length;
            return (
              <Link
                key={a.id}
                to="/tour/$collectionId/$chapterId/$authorId"
                params={{ collectionId, chapterId, authorId: a.id }}
                className="tap block"
              >
                <ArtPanel className="flex items-center gap-3 text-left">
                  <PoetImg src={a.portrait} className="h-20 w-auto shrink-0 object-contain object-bottom" />
                  <div className="min-w-0 flex-1 px-1">
                    <p className="title-ink text-lg leading-tight">{a.name}</p>
                    <p className="mt-1 text-xs text-ink-soft">{`${a.poemCount} 首 · 已通关 ${cleared} 首`}</p>
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
