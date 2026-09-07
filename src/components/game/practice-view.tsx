import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  COLLECTIONS,
  DYNASTIES,
  PLAYABLE_COLLECTIONS,
  POEMS,
  authorOptions,
  chaptersIn,
} from "@/lib/game/content";
import { GAME_BACKGROUNDS } from "@/lib/game/content/meta";
import { sfxTap } from "@/lib/game/sfx";
import { PagedList } from "./paged-list";
import { ArtPanel, PanelCaption, Stage, StageHud } from "./stage";

/**
 * 练习：三轴联动筛选（文集-章节级联 × 作者多选 × 朝代多选），条件取交集（ADR-0011）。
 * 选中诗卡 → 同款 5 题 + 先看答案，无灯笼、不计通关。
 */
export function PracticeView() {
  const navigate = useNavigate();
  const [collectionId, setCollectionId] = useState<string>("");
  const [chapterId, setChapterId] = useState<string>("");
  const [authorIds, setAuthorIds] = useState<string[]>([]);
  const [dynastyIds, setDynastyIds] = useState<string[]>([]);

  const chapters = useMemo(
    () => (collectionId ? chaptersIn(collectionId) : []),
    [collectionId],
  );
  const authors = useMemo(() => authorOptions(), []);
  const compiledDynasties = useMemo(
    () => DYNASTIES.filter((d) => POEMS.some((p) => p.dynastyId === d.id)),
    [],
  );

  const filtered = useMemo(
    () =>
      POEMS.filter((p) => {
        if (collectionId && p.collectionId !== collectionId) return false;
        if (chapterId) {
          const parts = chapterId.match(/-c(\d+)$/);
          if (!parts || Number(parts[1]) !== p.chapterIndex) return false;
        }
        if (authorIds.length > 0 && !authorIds.includes(p.authorId)) return false;
        if (dynastyIds.length > 0 && !dynastyIds.includes(p.dynastyId)) return false;
        return true;
      }),
    [collectionId, chapterId, authorIds, dynastyIds],
  );

  function toggle(list: string[], id: string, set: (next: string[]) => void) {
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  }

  // 筛选 chips 生在纸面板上：未选中态升级对比度（bg-ink/5 border-ink/15 text-ink），
  // 选中态实心松绿 + 米白字；whitespace-nowrap 与 shrink-0 支撑单行滑动条。
  const chip = (on: boolean) =>
    `tap shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-xs tracking-wider ${
      on
        ? "border-pine bg-pine text-paper shadow-sm"
        : "border-ink/15 bg-ink/5 text-ink"
    }`;

  return (
    <Stage bg={GAME_BACKGROUNDS.practice}>
      <StageHud title="诗库" backTo="/" />
      <div className="absolute inset-x-0 bottom-0 top-[max(4rem,calc(env(safe-area-inset-top)+3.6rem))] z-10 overflow-y-auto px-5 pb-[max(1.6rem,env(safe-area-inset-bottom))]">
        {/* 内边距微降至 p-3，三轴横向滑动条收拢首屏高度，保证露出诗卡网格 */}
        <ArtPanel className="!p-3">
          <div className="space-y-2">
            {/* 维度 1：文集 */}
            <div className="flex items-center gap-2">
              <span className="w-8 shrink-0 font-display text-xs tracking-widest text-ink-soft">文集</span>
              <div className="flex flex-1 items-center gap-1.5 overflow-x-auto py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_right,black_90%,transparent)]">
                <button
                  type="button"
                  className={chip(!collectionId)}
                  onClick={() => {
                    sfxTap();
                    setCollectionId("");
                    setChapterId("");
                  }}
                >
                  全部
                </button>
                {PLAYABLE_COLLECTIONS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={chip(collectionId === c.id)}
                    onClick={() => {
                      sfxTap();
                      setCollectionId(c.id);
                      setChapterId("");
                    }}
                  >
                    {c.title}
                  </button>
                ))}
              </div>
            </div>

            {/* 章节行：仅在选了具体文集后出现 */}
            {chapters.length > 0 ? (
              <div className="flex items-center gap-2">
                <span className="w-8 shrink-0 font-display text-xs tracking-widest text-ink-soft">章节</span>
                <div className="flex flex-1 items-center gap-1.5 overflow-x-auto py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_right,black_90%,transparent)]">
                  <button
                    type="button"
                    className={chip(!chapterId)}
                    onClick={() => {
                      sfxTap();
                      setChapterId("");
                    }}
                  >
                    整部文集
                  </button>
                  {chapters.map((ch) => (
                    <button
                      key={ch.id}
                      type="button"
                      className={chip(chapterId === ch.id)}
                      onClick={() => {
                        sfxTap();
                        setChapterId(ch.id);
                      }}
                    >
                      {`第${ch.index}章 ${ch.title}`}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {/* 维度 2：作者 */}
            <div className="flex items-center gap-2">
              <span className="w-8 shrink-0 font-display text-xs tracking-widest text-ink-soft">作者</span>
              <div className="flex flex-1 items-center gap-1.5 overflow-x-auto py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_right,black_90%,transparent)]">
                <button
                  type="button"
                  className={chip(authorIds.length === 0)}
                  onClick={() => {
                    sfxTap();
                    setAuthorIds([]);
                  }}
                >
                  全部
                </button>
                {authors.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    className={chip(authorIds.includes(a.id))}
                    onClick={() => {
                      sfxTap();
                      toggle(authorIds, a.id, setAuthorIds);
                    }}
                  >
                    {a.name}
                  </button>
                ))}
              </div>
            </div>

            {/* 维度 3：朝代 */}
            <div className="flex items-center gap-2">
              <span className="w-8 shrink-0 font-display text-xs tracking-widest text-ink-soft">朝代</span>
              <div className="flex flex-1 items-center gap-1.5 overflow-x-auto py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_right,black_90%,transparent)]">
                <button
                  type="button"
                  className={chip(dynastyIds.length === 0)}
                  onClick={() => {
                    sfxTap();
                    setDynastyIds([]);
                  }}
                >
                  全部
                </button>
                {compiledDynasties.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    className={chip(dynastyIds.includes(d.id))}
                    onClick={() => {
                      sfxTap();
                      toggle(dynastyIds, d.id, setDynastyIds);
                    }}
                  >
                    {d.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </ArtPanel>

        <PanelCaption className="mb-2 mt-3">
          {`${filtered.length} 首诗 · 点开答题，可先看答案`}
        </PanelCaption>
        <PagedList pageSize={9} count={filtered.length}>
          {(from, to) => (
            <div className="grid grid-cols-3 gap-2">
              {filtered.slice(from, to).map((poem) => {
                const col = COLLECTIONS.find((c) => c.id === poem.collectionId);
                return (
                  <button
                    key={poem.id}
                    type="button"
                    className="tap tap-deep relative aspect-[3/4] overflow-hidden rounded-md border border-paper/40 bg-ink/40 text-left transition hover:brightness-105"
                    onClick={() => navigate({ to: "/practice/$poemId", params: { poemId: poem.id } })}
                  >
                    <img
                      src={poem.background}
                      alt=""
                      onError={(e) => {
                        e.currentTarget.style.visibility = "hidden";
                      }}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-ink/25 via-transparent to-ink/80" />
                    <p className="absolute inset-x-1 bottom-1 line-clamp-2 text-[11px] leading-tight text-paper [text-shadow:0_1px_3px_rgb(28_23_18/90%)]">
                      {poem.title}
                    </p>
                    <p className="absolute left-1 top-1 rounded bg-ink/45 px-1 py-px text-[9px] tracking-wider text-paper/90">
                      {col?.title}
                    </p>
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
