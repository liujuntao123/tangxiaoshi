import { Link } from "@tanstack/react-router";
import { COLLECTIONS } from "@/lib/game/content";
import { preloadImages } from "@/lib/game/preload";
import { useEffect } from "react";
import { PagedList } from "./paged-list";
import { ArtSlot } from "./stage";

/**
 * 诗集资料库网格（原「环游」文集列表，ADR-0011）。
 * 未编译文集锁定展示（置灰 +「待开放」）；每文集 5 张专属背景滚动预载。
 * 诗集资料库的文集网格（ADR-0017 起由 /library 挂载，与主线关卡分家）。
 */
export function CollectionGrid() {
  const playable = COLLECTIONS.filter((c) => c.playable);
  useEffect(() => {
    for (const c of playable) preloadImages(c.backgrounds);
  }, [playable]);

  return (
    <PagedList pageSize={6} count={COLLECTIONS.length}>
      {(from, to) => (
        <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
          {COLLECTIONS.slice(from, to).map((c, i) => {
          {/* 使用 ui-panel-compact 轻面板外壳 + p-2 释放封面与标题宽度；
              卡面收紧保证 3 行卡 + 分页控件一屏放下（与关卡列表同款预算） */}
          const card = (
            <div
              className={`ui-panel-compact rise-in h-full p-2 text-center ${c.playable ? "" : "opacity-60 grayscale"}`}
              style={{ animationDelay: `${i * 45}ms` }}
            >
              <ArtSlot className="mx-auto h-20 w-20 rounded-full" imgClassName="h-16" src={c.art} />
              <p className="title-ink mt-1 text-[15px] leading-tight">{c.title}</p>
              <p className="mt-1 inline-block rounded-full border border-ink/20 bg-ink/5 px-2 py-px text-[10.5px] text-ink-soft">
                {c.playable ? `${c.poemCount} 首 · ${c.chapterIds.length} 章` : "待开放"}
              </p>
            </div>
          );
          return c.playable ? (
            <Link
              key={c.id}
              to="/library/$collectionId"
              params={{ collectionId: c.id }}
              className="tap block"
            >
              {card}
            </Link>
          ) : (
            <div key={c.id} className="cursor-not-allowed">
              {card}
            </div>
          );
          })}
        </div>
      )}
    </PagedList>
  );
}
