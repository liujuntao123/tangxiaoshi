import { COLLECTIONS } from "@/lib/game/content";
import { GAME_BACKGROUNDS as BG } from "@/lib/game/content/meta";
import { preloadImages } from "@/lib/game/preload";
import { useEffect } from "react";
import { PanelCaption, Stage, StageHud } from "./stage";
import { CollectionGrid } from "./library-collections";

/**
 * 诗集资料库页（入口拆分 2026-09，ADR-0017）：
 * 底部导航「文集」的落地页。只负责浏览与收集（通关/诗印照常入档），
 * 不承载关卡进度；主线闯关走首页「继续闯关 → /levels」。
 */
export function LibraryView() {
  const playable = COLLECTIONS.filter((c) => c.playable);
  useEffect(() => {
    for (const c of playable) preloadImages(c.backgrounds);
  }, [playable]);

  return (
    <Stage bg={BG.levels}>
      <StageHud title="诗集资料库" backTo="/" />
      <div className="absolute inset-x-0 bottom-0 top-[max(4rem,calc(env(safe-area-inset-top)+3.6rem))] z-10 flex flex-col px-5 pb-[max(0.8rem,env(safe-area-inset-bottom))]">
        <PanelCaption className="mb-3">随手可玩，通关计入诗册</PanelCaption>
        <CollectionGrid />
      </div>
    </Stage>
  );
}
