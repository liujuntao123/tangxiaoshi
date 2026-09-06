import { Link } from "@tanstack/react-router";
import { findPoem } from "@/lib/game/content";
import { GAME_BACKGROUNDS } from "@/lib/game/content/meta";
import { PATH_DEFS, RELIC_DEFS, endingTitle, nodeQuality, useExpedition } from "@/lib/game/expedition";
import { clearedCount, totalStars } from "@/lib/game/progress";
import { useSave } from "@/lib/game/save-context";
import { PlaqueFace } from "./choice-slip";
import { Stage, StageHud } from "./stage";

/**
 * 首页 = 墨潮远征台（P0 深重构 §5.1）：
 * 唯一主线按钮「继续远征 / 去择墨路 / 再启远征 / 点亮第一盏诗火」，
 * 三节点旅程条 + 诗火/诗印/分数；底部次级导航（文集/诗库/墨潮试炼/诗册）。
 * 入口拆分（ADR-0017）：文集指向独立的 /library 资料库，与远征 /tour 分家。
 */
export function HomeScreen() {
  const { save } = useSave();
  const { state } = useExpedition();
  const progress = clearedCount(save);
  const stars = totalStars(save);
  // 进行中的远征才驱动首页主目标；已结束的远征只留一行结局回响。
  const activeExp = state && !state.finished ? state : null;
  const entry = activeExp ? (activeExp.nodes[activeExp.nodeIndex] ?? null) : null;
  const entryPoem = entry ? findPoem(entry.poemId) : null;

  // 继续远征的语义（逻辑梳理 2026-09）：当前节点已择墨路 → 直达该页答题（续修），
  // 不再绕去墨路选择页让玩家重选一遍；未择墨路时按钮诚实写「去择墨路」→ /tour。
  const resumeEntry =
    activeExp && entry && entryPoem
      ? { poemId: entry.poemId, path: entry.path, nodeIndex: activeExp.nodeIndex }
      : null;
  const mainLabel = resumeEntry
    ? "继续远征"
    : activeExp
      ? "去择墨路"
      : state?.finished
        ? "再启远征"
        : "点亮第一盏诗火";
  const caption = activeExp
    ? entry && entryPoem
      ? `续修本页：${PATH_DEFS[entry.path].name}《${entryPoem.title}》`
      : `第 ${activeExp.nodeIndex + 1} / 3 页 · 选一条墨路，领一张诗卡`
    : state?.finished
      ? `${endingTitle(state.finished)} · 诗火可以再点起来`
      : "三页诗路，一盏诗火";
  const pendingRelic = activeExp && activeExp.relic !== "none" ? RELIC_DEFS[activeExp.relic] : null;

  return (
    <Stage bg={GAME_BACKGROUNDS.home}>
      <StageHud />
      <p className="title-art paper-glow absolute inset-x-0 top-[8%] z-10 text-center text-[2.3rem] text-paper">
        墨潮远征
      </p>
      <p className="paper-glow absolute inset-x-0 top-[15%] z-10 text-center text-[11px] tracking-[0.32em] text-paper/85">
        唐小诗环游记 · 修页人
      </p>

      {/* 顶部三列统计：scenery-plate 深墨纸托底解耦背景花簇；诗火徽章统一用朱砂语义 */}
      <div className="absolute inset-x-0 top-[19%] z-10 flex justify-center px-4">
        <div className="scenery-plate grid w-full max-w-sm grid-cols-3 gap-1 px-3 py-2 text-center">
          <div>
            <p className="hud-title flex items-center justify-center gap-1 text-paper">
              <span
                aria-hidden
                className="grid h-4 w-4 place-items-center rounded-full border border-seal bg-seal font-display text-[9px] leading-none text-paper"
              >
                火
              </span>
              {activeExp ? `${activeExp.fire}/4` : `${progress.have}/${progress.total}`}
            </p>
            <p className="paper-glow text-[11px] tracking-widest text-paper/80">
              {activeExp ? "诗火" : "已通关"}
            </p>
          </div>
          <div>
            <p className="hud-title text-paper">{stars}</p>
            <p className="paper-glow text-[11px] tracking-widest text-paper/80">已获诗印</p>
          </div>
          <div>
            <p className="hud-title text-paper">{save.totalScore}</p>
            <p className="paper-glow text-[11px] tracking-widest text-paper/80">环游总分</p>
          </div>
        </div>
      </div>

      {/* 三节点旅程条：墨座圆点 + 连接线；完成页盖印，当前页呼吸，未至页沉墨 */}
      <div className="absolute inset-x-0 top-[28%] z-10 flex flex-col items-center gap-2">
        <div className="relative flex items-center gap-4">
          <span
            aria-hidden
            className="absolute inset-x-4 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-seal/65 via-ink/30 to-ink/15"
          />
          {[0, 1, 2].map((index) => {
            const node = activeExp?.nodes[index] ?? null;
            const done = node?.status === "done";
            const failed = node?.status === "failed";
            const current = activeExp?.nodeIndex === index && Boolean(activeExp);
            return (
              <span
                key={index}
                className={`jdot ${done ? "jdot-done" : failed ? "jdot-failed" : current ? "jdot-current" : ""}`}
              >
                {done ? "印" : failed ? "墨" : index + 1}
              </span>
            );
          })}
        </div>
        <p className="caption-pill">
          {activeExp
            ? activeExp.nodes
                .map((node, index) =>
                  node?.status === "done"
                    ? `第${index + 1}页·${nodeQuality(node.mistakes)}`
                    : node?.status === "failed"
                      ? `第${index + 1}页·墨痕`
                      : index === activeExp.nodeIndex
                        ? `第${index + 1}页·此刻`
                        : `第${index + 1}页·未至`,
                )
                .join(" / ")
            : "远征未启 · 三页待修"}
        </p>
        {pendingRelic ? (
          <p className="caption-pill">
            {`下一页带：${pendingRelic.name} · ${pendingRelic.desc}`}
          </p>
        ) : null}
      </div>

      <div className="absolute inset-x-0 bottom-[26%] z-10 flex justify-center">
        <div className="relative flex h-40 w-32 items-end justify-center">
          <span className="sprite-shadow" />
          <img
            src="/sprites/hero.png"
            alt="唐小诗"
            onError={(e) => {
              e.currentTarget.style.visibility = "hidden";
            }}
            className="idle-bob relative z-10 h-40 w-auto object-contain object-bottom drop-shadow-lg"
          />
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-[15%] z-20 flex flex-col items-center gap-1 px-4">
        {resumeEntry ? (
          <Link
            to="/play/$poemId"
            params={{ poemId: resumeEntry.poemId }}
            search={{ route: resumeEntry.path, node: resumeEntry.nodeIndex }}
            className="tap tap-deep"
            aria-label={mainLabel}
          >
            <PlaqueFace className="scale-110">{mainLabel}</PlaqueFace>
          </Link>
        ) : (
          <Link to="/tour" className="tap tap-deep" aria-label={mainLabel}>
            <PlaqueFace className="scale-110">{mainLabel}</PlaqueFace>
          </Link>
        )}
        <p className="paper-glow text-center text-[11px] tracking-widest text-paper/80">{caption}</p>
      </div>

      <nav className="dock-fade absolute inset-x-0 bottom-0 z-20 grid grid-cols-4 px-2 pb-[max(1rem,env(safe-area-inset-bottom))] pt-10 opacity-85">
        <Link to="/library" className="tap flex flex-col items-center gap-1 py-2">
          <img src="/ui/icon-story.png" alt="" className="h-8 w-8 object-contain drop-shadow-md" />
          <span className="font-display text-[13px] tracking-[0.18em] text-paper paper-glow">文集</span>
        </Link>
        <Link to="/practice" className="tap flex flex-col items-center gap-1 py-2">
          <img src="/ui/icon-practice.png" alt="" className="h-8 w-8 object-contain drop-shadow-md" />
          <span className="font-display text-[13px] tracking-[0.18em] text-paper paper-glow">诗库</span>
        </Link>
        <Link to="/endless" className="tap flex flex-col items-center gap-1 py-2">
          <img src="/ui/icon-endless.png" alt="" className="h-8 w-8 object-contain drop-shadow-md" />
          <span className="font-display text-[13px] tracking-[0.18em] text-paper paper-glow">墨潮试炼</span>
        </Link>
        <Link to="/achievements" className="tap flex flex-col items-center gap-1 py-2">
          <img src="/ui/icon-achieve.png" alt="" className="h-8 w-8 object-contain drop-shadow-md" />
          <span className="font-display text-[13px] tracking-[0.18em] text-paper paper-glow">诗册</span>
        </Link>
      </nav>
    </Stage>
  );
}
