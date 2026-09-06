import { Link } from "@tanstack/react-router";
import { authorsInChapter, chapterById, collectionById, poemsByAuthor } from "@/lib/game/content";
import { GAME_BACKGROUNDS } from "@/lib/game/content/meta";
import { useSave } from "@/lib/game/save-context";
import { ArtPanel, PanelCaption, PortraitMedal, RowChevron, Stage, StageHud } from "./stage";

/** 资料库第三层：章节内的作者列表（首遇引导语在作者页，ADR-0011）。
 *  行卡 = 玉环头像 + 名号 + 通关进度条 + 进入箭头，压住右侧留白。 */
export function TourAuthors({ collectionId, chapterId }: { collectionId: string; chapterId: string }) {
  const { save } = useSave();
  const collection = collectionById(collectionId);
  const chapter = chapterById(chapterId);
  const authors = authorsInChapter(chapterId);
  return (
    <Stage bg={GAME_BACKGROUNDS.tourAuthor}>
      <StageHud title={`第${chapter.index}章 ${chapter.title}`} backTo={`/library/${collectionId}`} />
      <div className="absolute inset-x-0 bottom-0 top-[max(4rem,calc(env(safe-area-inset-top)+3.6rem))] z-10 overflow-y-auto px-5 pb-[max(1.6rem,env(safe-area-inset-bottom))]">
        <PanelCaption className="mb-3">{`《${collection.title}》的作者`}</PanelCaption>
        <div className="flex flex-col gap-3">
          {authors.map((a, i) => {
            const poems = poemsByAuthor(a.id);
            const cleared = poems.filter((p) => save.clearedPoems.includes(p.id)).length;
            const pct = poems.length > 0 ? Math.round((cleared / poems.length) * 100) : 0;
            return (
              <Link
                key={a.id}
                to="/library/$collectionId/$chapterId/$authorId"
                params={{ collectionId, chapterId, authorId: a.id }}
                className="tap block"
              >
                <ArtPanel
                  className="rise-in flex items-center gap-3 text-left"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <PortraitMedal src={a.portrait} size={64} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-baseline gap-2">
                      <span className="title-ink text-lg leading-tight">{a.name}</span>
                      <span className="shrink-0 rounded border border-ink/25 bg-ink/5 px-1.5 py-px text-[10px] tracking-widest text-ink-soft">
                        {`${poems.length} 首`}
                      </span>
                    </p>
                    <p className="mt-1.5 flex items-center gap-2">
                      <span className="meter w-full max-w-28">
                        <i className="meter-fill meter-fill-pine block" style={{ width: `${pct}%` }} />
                      </span>
                      <span className="shrink-0 text-[11px] tabular-nums text-ink-soft">
                        {cleared > 0 ? `已通关 ${cleared}/${poems.length}` : "待启程"}
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
