import { Link } from "@tanstack/react-router";
import { COLLECTIONS } from "@/lib/game/content";
import { GAME_BACKGROUNDS as BG } from "@/lib/game/content/meta";
import { preloadImages } from "@/lib/game/preload";
import { useEffect, useState } from "react";
import { ArtPanel, Stage, StageHud } from "./stage";

/**
 * 环游第一层：文集列表（卡片式，ADR-0011）。
 * 未编译文集锁定展示（置灰 +「待开放」）；每文集 5 张专属背景滚动预载。
 */
export function TourCollections() {
  const [bgReady, setBgReady] = useState(false);
  const bg = BG.tour;
  useEffect(() => {
    preloadImages([bg]);
    const img = new Image();
    img.onload = () => setBgReady(true);
    img.src = bg;
    if (img.complete) setBgReady(true);
  }, [bg]);

  const playable = COLLECTIONS.filter((c) => c.playable);
  useEffect(() => {
    for (const c of playable) preloadImages(c.backgrounds);
  }, [playable]);

  return (
    <Stage bg={bg}>
      <StageHud title="环游" backTo="/" />
      <div
        className={`absolute inset-x-0 bottom-0 top-[max(4rem,calc(env(safe-area-inset-top)+3.6rem))] z-10 overflow-y-auto px-4 pb-[max(1.2rem,env(safe-area-inset-bottom))] ${
          bgReady ? "" : "opacity-0"
        }`}
      >
        <p className="mb-3 text-center text-xs tracking-[0.3em] text-paper/90">选一部文集出发</p>
        <div className="grid grid-cols-2 gap-3">
          {COLLECTIONS.map((c) => {
            const card = (
              <ArtPanel className={`h-full text-center ${c.playable ? "" : "opacity-60 grayscale"}`}>
                <img
                  src={c.art}
                  alt=""
                  onError={(e) => {
                    e.currentTarget.style.visibility = "hidden";
                  }}
                  className="mx-auto h-20 w-auto object-contain"
                />
                <p className="title-ink mt-1 text-base leading-tight">{c.title}</p>
                <p className="mt-1 px-2 text-[11px] text-ink-soft">
                  {c.playable ? `${c.poemCount} 首 · ${c.chapterIds.length} 章` : "待开放"}
                </p>
              </ArtPanel>
            );
            return c.playable ? (
              <Link
                key={c.id}
                to="/tour/$collectionId"
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
    </Stage>
  );
}
