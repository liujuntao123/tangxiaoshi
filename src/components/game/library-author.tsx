import { useNavigate } from "@tanstack/react-router";
import { authorById, collectionById, poemsByAuthor } from "@/lib/game/content";
import { GAME_BACKGROUNDS } from "@/lib/game/content/meta";
import { markAuthorMet } from "@/lib/game/progress";
import { useSave } from "@/lib/game/save-context";
import { sfxTap } from "@/lib/game/sfx";
import type { DialogueLine } from "@/lib/game/types";
import { useEffect, useState } from "react";
import { PagedList } from "./paged-list";
import { PoetImg, Stage, StageHud } from "./stage";
import { SpeechBox } from "./speech-box";

/**
 * 环游最深层：作者页。
 * 首次进入 → 对白框引导语（每作者仅一次，存档 metAuthors）；之后直接是诗卡列表。
 * 全开放：任意诗卡随时可玩（ADR-0011）。
 */
export function LibraryAuthor({
  collectionId,
  chapterId,
  authorId,
}: {
  collectionId: string;
  chapterId: string;
  authorId: string;
}) {
  const navigate = useNavigate();
  const { save, loading, patchSave } = useSave();
  const author = authorById(authorId);
  const collection = collectionById(collectionId);
  const poems = poemsByAuthor(authorId);
  const [lineIndex, setLineIndex] = useState(0);
  const [guideOpen, setGuideOpen] = useState(false);
  const [checked, setChecked] = useState(false);

  // 首遇检测：等存档加载完再判断，避免未加载时空档误判/闪出
  useEffect(() => {
    if (loading || checked) return;
    setChecked(true);
    setGuideOpen(!save.metAuthors.includes(authorId));
  }, [loading, save, checked, authorId]);

  async function closeGuide() {
    const last = lineIndex >= author.guide.length - 1;
    if (!last) {
      sfxTap();
      setLineIndex((n) => n + 1);
      return;
    }
    sfxTap();
    setGuideOpen(false);
    await patchSave((current) => markAuthorMet(current, authorId));
  }

  const backTo = `/library/${collectionId}/${chapterId}`;

  return (
    <Stage bg={GAME_BACKGROUNDS.tourAuthor}>
      <StageHud title={author.name} backTo={backTo} />

      <div className="absolute inset-x-0 top-[max(4rem,calc(env(safe-area-inset-top)+3.6rem))] z-10 px-4">
        <div className="flex items-end justify-center gap-2">
          <PoetImg
            src={author.portrait}
            className="h-24 w-auto object-contain object-bottom drop-shadow-lg"
          />
        </div>
        <p className="title-art paper-glow mt-1 text-center text-xl text-paper">{author.name}</p>
        <p className="flex justify-center">
          <span className="caption-pill mt-1">{`《${collection.title}》 · ${poems.length} 首`}</span>
        </p>
      </div>

      <div className="absolute inset-x-5 bottom-[max(1.5rem,env(safe-area-inset-bottom))] top-[max(14rem,calc(env(safe-area-inset-top)+13.6rem))] z-10">
        <PagedList pageSize={9} count={poems.length} className="h-full">
          {(from, to) => (
            <div className="grid grid-cols-3 gap-2">
              {poems.slice(from, to).map((poem) => {
                const cleared = save.clearedPoems.includes(poem.id);
                const stars = save.poemRecords[poem.id]?.bestStars ?? 0;
                return (
                  <button
                    key={poem.id}
                    type="button"
                    className="tap relative aspect-[3/4] overflow-hidden rounded-md border border-paper/40 bg-ink/40 text-left"
                    onClick={() => navigate({ to: "/play/$poemId", params: { poemId: poem.id } })}
                  >
                    <img
                      src={poem.background}
                      alt=""
                      onError={(e) => {
                        e.currentTarget.style.visibility = "hidden";
                      }}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-ink/15 via-transparent to-ink/70" />
                    {cleared ? (
                      <img
                        src="/ui/check-on.png"
                        alt="已通关"
                        className="absolute right-1 top-1 h-5 w-5 object-contain drop-shadow"
                      />
                    ) : null}
                    {/* 诗印 0-3（历史最佳，玩法重做口径 ADR-0015）；空印加深墨底保证可见 */}
                    <span className="absolute left-1 top-1 flex gap-0.5" aria-label={`诗印 ${stars}/3`}>
                      {[1, 2, 3].map((n) => (
                        <span
                          key={n}
                          aria-hidden
                          className={`grid h-3 w-3 place-items-center rounded-full border font-display text-[6px] leading-none ${
                            n <= stars
                              ? "border-seal bg-seal text-paper shadow-sm"
                              : "border-paper/30 bg-ink/45 text-paper/50"
                          }`}
                        >
                          印
                        </span>
                      ))}
                    </span>
                    <p className="absolute inset-x-1 bottom-1 line-clamp-2 text-[11px] leading-tight text-paper [text-shadow:0_1px_3px_rgb(28_23_18/90%)]">
                      {poem.title}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </PagedList>
      </div>

      {guideOpen && author.guide[lineIndex] ? (
        <div className="absolute inset-0 z-30 flex items-end bg-ink/45">
          <SpeechBox
            art={author.portrait}
            line={author.guide[lineIndex] as DialogueLine}
            hint={lineIndex >= author.guide.length - 1 ? "开始答题" : "点击继续"}
            onNext={() => void closeGuide()}
          />
        </div>
      ) : null}
    </Stage>
  );
}
