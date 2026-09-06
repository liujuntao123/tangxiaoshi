import { Link } from "@tanstack/react-router";
import { COLLECTIONS } from "@/lib/game/content";
import { preloadImages } from "@/lib/game/preload";
import { useEffect } from "react";
import { ArtSlot, PanelCaption } from "./stage";

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
    <div>
      <PanelCaption className="mb-3">选一部文集出发</PanelCaption>
      <div className="grid grid-cols-2 gap-4">
        {COLLECTIONS.map((c, i) => {
          {/* 使用 ui-panel-compact 轻面板外壳 + p-2.5 释放封面与标题宽度 */}
          const card = (
            <div
              className={`ui-panel-compact rise-in h-full p-2.5 text-center ${c.playable ? "" : "opacity-60 grayscale"}`}
              style={{ animationDelay: `${i * 45}ms` }}
            >
              <ArtSlot className="mx-auto h-24 w-24 rounded-full" imgClassName="h-20" src={c.art} />
              <p className="title-ink mt-1.5 text-base leading-tight">{c.title}</p>
              <p className="mt-1 inline-block rounded-full border border-ink/20 bg-ink/5 px-2 py-px text-[11px] text-ink-soft">
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
    </div>
  );
}
