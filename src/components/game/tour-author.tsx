import { useNavigate } from "@tanstack/react-router";
import { authorById, collectionById, poemsByAuthor } from "@/lib/game/content";
import { GAME_BACKGROUNDS } from "@/lib/game/content/meta";
import { markAuthorMet } from "@/lib/game/progress";
import { useSave } from "@/lib/game/save-context";
import { sfxTap } from "@/lib/game/sfx";
import type { DialogueLine } from "@/lib/game/types";
import { useEffect, useState } from "react";
import { PagedList } from "./paged-list";
import { ArtPanel, PoetImg, Stage, StageHud } from "./stage";
import { SpeechBox } from "./speech-box";

/**
 * 环游最深层：作者页。
 * 首次进入 → 对白框引导语（每作者仅一次，存档 metAuthors）；之后直接是诗卡列表。
 * 全开放：任意诗卡随时可玩（ADR-0011）。
 */
export function TourAuthor({
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

  const backTo = `/tour/${collectionId}/${chapterId}`;

  return (
    <Stage bg={GAME_BACKGROUNDS.tourAuthor}>
      <StageHud title={author.name} backTo={backTo} />

      <div className="absolute inset-x-0 top-[max(4rem,calc(env(safe-area-inset-top)+3.6rem))] z-10 px-4">
        <div className="flex items-end justify-center gap-2">
          <PoetImg
            src={author.portrait}
            className="h-28 w-auto object-contain object-bottom drop-shadow-lg"
          />
        </div>
        <p className="title-art paper-glow mt-1 text-center text-xl text-paper">{author.name}</p>
        <p className="paper-glow mt-0.5 text-center text-[11px] tracking-[0.25em] text-paper/90">
          {`《${collection.title}》 · ${poems.length} 首`}
        </p>
      </div>

      <div className="absolute inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] top-[max(11.5rem,calc(env(safe-area-inset-top)+11rem))] z-10">
        <PagedList pageSize={9} count={poems.length} className="h-full">
          {(from, to) => (
            <div className="grid grid-cols-3 gap-2">
              {poems.slice(from, to).map((poem) => {
                const cleared = save.clearedPoems.includes(poem.id);
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
                    <div className="absolute inset-0 bg-gradient-to-b from-ink/10 via-transparent to-ink/60" />
                    {cleared ? (
                      <img
                        src="/ui/check-on.png"
                        alt="已通关"
                        className="absolute right-1 top-1 h-5 w-5 object-contain drop-shadow"
                      />
                    ) : null}
                    <p className="absolute inset-x-1 bottom-1 line-clamp-2 text-[11px] leading-tight text-paper drop-shadow">
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
