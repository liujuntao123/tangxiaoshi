import { Link } from "@tanstack/react-router";
import { GAME_BACKGROUNDS } from "@/lib/game/content/meta";
import { ArtPanel, Stage, StageHud } from "./stage";
import { PlaqueFace } from "./choice-slip";

/**
 * 深链降级页：旧书签/旧 PWA 深链带着已下线的 id（如旧关卡 id）时，
 * 不进错误边界，改为温和告知并引导去文集资料库（ADR-0015 内容重编排的过渡页）。
 */
export function MissingCard({
  bg = GAME_BACKGROUNDS.tour,
  title = "诗境未找到",
  hint = "内容重新编排过了，这张旧卡片搬了家。去文集里挑一张吧。",
}: {
  bg?: string;
  title?: string;
  hint?: string;
}) {
  return (
    <Stage bg={bg}>
      <StageHud title="诗集资料库" backTo="/" />
      <div className="absolute inset-x-4 bottom-[max(1.5rem,env(safe-area-inset-bottom))] z-10">
        <ArtPanel className="text-center">
          <p className="title-ink text-2xl">{title}</p>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">{hint}</p>
          <div className="mt-4 flex justify-center gap-3">
            <Link to="/library" className="tap">
              <PlaqueFace>去文集</PlaqueFace>
            </Link>
            <Link to="/" className="tap">
              <PlaqueFace>回首页</PlaqueFace>
            </Link>
          </div>
        </ArtPanel>
      </div>
    </Stage>
  );
}
