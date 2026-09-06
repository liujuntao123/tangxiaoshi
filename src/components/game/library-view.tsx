import { COLLECTIONS } from "@/lib/game/content";
import { GAME_BACKGROUNDS as BG } from "@/lib/game/content/meta";
import { preloadImages } from "@/lib/game/preload";
import { useEffect } from "react";
import { Stage, StageHud } from "./stage";
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
      <div className="absolute inset-x-0 bottom-0 top-[max(4rem,calc(env(safe-area-inset-top)+3.6rem))] z-10 overflow-y-auto px-5 pb-[max(1.6rem,env(safe-area-inset-bottom))]">
        {/* 长说明改为 scenery-plate 多行安全副文案，消解与下方行动胶囊的双层堆叠 */}
        <p className="scenery-plate paper-glow mx-auto mb-3 w-fit max-w-full px-3 py-1.5 text-center text-xs leading-relaxed text-paper/85">
          随手可玩，通关与诗印照常计入诗册；闯关请回首页点「继续闯关」
        </p>
        <CollectionGrid />
      </div>
    </Stage>
  );
}
