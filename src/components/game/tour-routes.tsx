import { useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  RELIC_DEFS,
  beginNode,
  endingTitle,
  newExpedition,
  PATH_DEFS,
  routeOffers,
  useExpedition,
  type ExpeditionPath,
  type ExpeditionState,
  type RouteOffer,
} from "@/lib/game/expedition";
import { findPoem } from "@/lib/game/content";
import { GAME_BACKGROUNDS as BG } from "@/lib/game/content/meta";
import { useSave } from "@/lib/game/save-context";
import { sfxTap } from "@/lib/game/sfx";
import { ArtPanel, PanelCaption, Stage, StageHud } from "./stage";
import { HpPips } from "./hp-pips";
import { PlaqueButton } from "./choice-slip";

/**
 * 墨路选择页（P0 深重构 §5.2）：/tour 只有三条真实路线。
 * 每条路线从题库锁定一张真实诗卡（作者/诗名/文集/风险收益），
 * 点击真实进入 /play/$poemId?route=…&node=…。
 *
 * 入口拆分（ADR-0017，2026-09）：诗集资料库已迁往 /library，
 * 本页不再挂文集网格；当前节点已领诗卡时先给「续修本页」快捷，
 * 保证从首页「继续远征」绕到这里玩家也能一键回到原诗页。
 *
 * 视觉口径（UI 走查）：路线 = 任务卡，类别色脊 + 单字徽章 + 收益 pill + 启程 CTA，
 * 用结构化信息填满卡片而不是留白；底部链接一律 caption-pill 保证对比度。
 */

/** 三条墨路的类别色（与 styles.css 的 lamp/storm/dusk 令牌一致）。 */
const PATH_THEME: Record<ExpeditionPath, { glyph: string; soft: string; main: string }> = {
  safe: { glyph: "灯", soft: "var(--color-lamp-soft)", main: "var(--color-lamp)" },
  risk: { glyph: "澜", soft: "var(--color-storm-soft)", main: "var(--color-storm)" },
  mystery: { glyph: "卷", soft: "var(--color-dusk-soft)", main: "var(--color-dusk)" },
};
export function TourRoutes() {
  const navigate = useNavigate();
  const { save } = useSave();
  const { state, ready, mutate } = useExpedition();

  // 候选卡只在种子/进度变化时重算，保证展示与点击进入的诗卡一致。
  const offers = useMemo(
    () => (state && !state.finished ? routeOffers(state.offerSeed, save.clearedPoems) : []),
    [state, save.clearedPoems],
  );

  function choose(offer: RouteOffer) {
    if (!state || state.finished) return;
    sfxTap();
    mutate((current) => beginNode(current, offer.path, offer.poemId));
    void navigate({
      to: "/play/$poemId",
      params: { poemId: offer.poemId },
      search: { route: offer.path, node: state.nodeIndex },
    });
  }

  /** 续修本节点已领的诗卡（与首页「继续远征」同款语义，见 home-screen）。 */
  function resume(entry: { poemId: string; path: ExpeditionPath }, nodeIndex: number) {
    sfxTap();
    void navigate({
      to: "/play/$poemId",
      params: { poemId: entry.poemId },
      search: { route: entry.path, node: nodeIndex },
    });
  }

  return (
    <Stage bg={BG.tour}>
      <StageHud title="墨潮远征" backTo="/" />
      <div className="absolute inset-x-0 bottom-0 top-[max(4rem,calc(env(safe-area-inset-top)+3.6rem))] z-10 overflow-y-auto px-5 pb-[max(1.6rem,env(safe-area-inset-bottom))]">
        {!ready ? null : state && !state.finished ? (
          <ActivePanel
            state={state}
            offers={offers}
            onChoose={choose}
            onResume={resume}
          />
        ) : (
          <StartPanel state={state} onRelaunch={() => mutate(() => newExpedition())} />
        )}
      </div>
    </Stage>
  );
}

/** 进行中：三节点进度 + 诗火 + 本节点三条墨路候选。 */
function ActivePanel({
  state,
  offers,
  onChoose,
  onResume,
}: {
  state: ExpeditionState;
  offers: RouteOffer[];
  onChoose: (offer: RouteOffer) => void;
  onResume: (entry: { poemId: string; path: ExpeditionPath }, nodeIndex: number) => void;
}) {
  const pendingRelic = state.relic !== "none" ? RELIC_DEFS[state.relic] : null;
  const entry = state.nodes[state.nodeIndex] ?? null;
  const entryPoem = entry ? findPoem(entry.poemId) : null;
  return (
    <>
      {/* 顶部三层堆叠收拢：JourneyDots 保留一行；文案胶囊与诗火合并为一行，省高透气 */}
      <div className="mb-3 flex flex-col items-center gap-2">
        <JourneyDots state={state} />
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="caption-pill">{`第 ${state.nodeIndex + 1} / 3 页 · 择一条墨路`}</span>
          <span className="ink-chip px-2.5 py-1">
            <HpPips value={state.fire} label="诗火" max={4} />
          </span>
          {pendingRelic ? (
            <span className="ink-chip px-2.5 py-1 text-[10px] tracking-wider text-paper/90">
              {`待生效：${pendingRelic.name} · ${pendingRelic.desc}`}
            </span>
          ) : null}
        </div>
      </div>
      {entry && entry.status === "pending" && entryPoem ? (
        <div className="mb-3 flex justify-center">
          <PlaqueButton onClick={() => onResume(entry, state.nodeIndex)}>
            {`续修本页 · 《${entryPoem.title}》`}
          </PlaqueButton>
        </div>
      ) : null}
      <div className="flex flex-col gap-3">
        {offers.map((offer, i) => {
          const def = PATH_DEFS[offer.path];
          const theme = PATH_THEME[offer.path];
          return (
            <button
              key={offer.path}
              type="button"
              className="tap tap-deep block w-full text-left"
              onClick={() => onChoose(offer)}
            >
              <ArtPanel
                className="rise-in relative flex items-center gap-3 pl-4 text-left"
                style={{ animationDelay: `${i * 70}ms` }}
              >
                {/* 类别色脊：3px 宽 + 微弱同色光晕 */}
                <span
                  aria-hidden
                  className="absolute inset-y-3 left-0 w-[3px] rounded-r-full"
                  style={{
                    background: theme.main,
                    opacity: 0.85,
                    boxShadow: `0 0 6px color-mix(in srgb, ${theme.main} 40%, transparent)`,
                  }}
                />
                {/* 单字徽章：灯 / 澜 / 卷 */}
                <span
                  aria-hidden
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-full font-display text-xl leading-none"
                  style={{
                    background: theme.soft,
                    color: theme.main,
                    boxShadow: `inset 0 0 0 2px color-mix(in srgb, ${theme.main} 33%, transparent), 0 2px 6px rgb(28 23 18 / 14%)`,
                  }}
                >
                  {theme.glyph}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="title-ink text-lg leading-tight">{def.name}</span>
                    <span
                      className="shrink-0 rounded-full px-1.5 py-px text-[10px] tracking-widest"
                      style={{ background: theme.soft, color: theme.main, boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${theme.main} 33%, transparent)` }}
                    >
                      {def.tag}
                    </span>
                  </span>
                  <span className="poem-line mt-0.5 block truncate text-[15px] font-medium leading-snug text-ink">
                    《{offer.title}》
                  </span>
                  <span className="block truncate text-[11px] leading-snug text-ink-soft">
                    {offer.authorName ? `${offer.authorName} · ` : ""}
                    {offer.collectionTitle}
                  </span>
                  <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="text-[11px] leading-snug text-ink-soft/85">{def.blurb}</span>
                    <span
                      className="rounded px-1.5 py-px text-[10.5px] font-medium leading-snug"
                      style={{ background: theme.soft, color: theme.main }}
                    >
                      {`益 · ${def.reward}`}
                    </span>
                  </span>
                </span>
                {/* 启程 CTA：h-8 w-8 圆钮 + 小字 */}
                <span className="flex shrink-0 flex-col items-center gap-0.5 pr-0.5">
                  <span
                    aria-hidden
                    className="grid h-8 w-8 place-items-center rounded-full font-display text-base leading-none"
                    style={{ background: theme.main, color: "#f3ebe0" }}
                  >
                    ›
                  </span>
                  <span className="text-[10px] tracking-[0.3em]" style={{ color: theme.main }}>
                    启程
                  </span>
                </span>
              </ArtPanel>
            </button>
          );
        })}
      </div>
    </>
  );
}

/** 旅程三节点：墨座圆点 + 连接线，当前页呼吸高亮（首页/墨路共用视觉）。 */
function JourneyDots({ state }: { state: ExpeditionState }) {
  return (
    <div className="relative flex items-center gap-4" aria-label={`远征进度 ${state.nodeIndex + 1}/3`}>
      <span aria-hidden className="absolute inset-x-4 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-seal/65 via-ink/30 to-ink/15" />
      {[0, 1, 2].map((index) => {
        const node = state.nodes[index];
        const done = node?.status === "done";
        const failed = node?.status === "failed";
        const current = index === state.nodeIndex;
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
  );
}

/** 无远征 / 已结束：点亮第一盏诗火，或展示上一局结局后重开。 */
function StartPanel({ state, onRelaunch }: { state: ExpeditionState | null; onRelaunch: () => void }) {
  return (
    <div className="mx-auto flex h-full min-h-72 max-w-sm flex-col items-center justify-center">
      <ArtPanel className="w-full text-center">
        <img
          src="/ui/lantern.png"
          alt=""
          className="idle-bob mx-auto mb-1 h-12 w-auto object-contain drop-shadow"
        />
        {state?.finished ? (
          <>
            <p className="title-ink text-3xl">{endingTitle(state.finished)}</p>
            <p className="mt-1 text-xs tracking-wider text-ink-soft">上一局远征已收官，诗火可以再点起来了。</p>
          </>
        ) : (
          <>
            <p className="title-ink text-3xl">墨潮已至</p>
            <p className="mx-auto mt-1 max-w-64 text-sm leading-relaxed text-ink-soft">
              诗碑失声，诗页被墨抹去。带上三盏诗火，沿墨路修复三页诗。
            </p>
          </>
        )}
        <div className="mt-3 flex justify-center">
          <PlaqueButton onClick={onRelaunch}>点亮第一盏诗火</PlaqueButton>
        </div>
        <p className="mt-1.5 text-[11px] tracking-wider text-ink/55">三条墨路各藏一张真实诗卡，风险与收益不同。</p>
      </ArtPanel>
      <PanelCaption className="mt-3">想按文集翻诗？回首页底部进「文集」资料库。</PanelCaption>
    </div>
  );
}
