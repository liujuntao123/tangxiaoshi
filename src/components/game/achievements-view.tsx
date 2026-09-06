import { useMemo, useState } from "react";
import { ACHIEVEMENTS, achievementProgress } from "@/lib/game/content";
import { GAME_BACKGROUNDS } from "@/lib/game/content/meta";
import { totalStars } from "@/lib/game/progress";
import type { AchievementDef, AchievementKind } from "@/lib/game/types";
import { useSave } from "@/lib/game/save-context";
import { PagedList } from "./paged-list";
import { ArtPanel, ArtSlot, Stage, StageHud } from "./stage";

type KindFilter = AchievementKind | "all";

const GROUPS: { kind: KindFilter; title: string }[] = [
  { kind: "all", title: "全部" },
  { kind: "author", title: "作者" },
  { kind: "collection", title: "文集" },
  { kind: "dynasty", title: "朝代" },
];

function AchievementRow({ def, index }: { def: AchievementDef; index: number }) {
  const { save } = useSave();
  const progress = achievementProgress(def, save);
  const done = progress.done;
  const pct = progress.total > 0 ? Math.round((progress.have / progress.total) * 100) : 0;
  return (
    <ArtPanel
      className={`rise-in flex items-center gap-3 text-left ${done ? "picked" : ""}`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <ArtSlot
        className={`h-14 w-14 rounded-full ${done ? "" : "grayscale"}`}
        imgClassName="h-12"
        src={def.art}
      />
      <div className="min-w-0 flex-1">
        <p className="title-ink truncate text-lg leading-tight">{def.title}</p>
        <p className="mt-0.5 truncate text-xs text-ink-soft">{def.subtitle}</p>
        <p className="mt-1.5 flex items-center gap-2">
          <span className="meter w-full max-w-28">
            <i
              className={`meter-fill block ${done ? "" : "meter-fill-pine"}`}
              style={{ width: `${pct}%` }}
            />
          </span>
          <span className="shrink-0 text-[11px] tabular-nums text-ink-soft">
            {`${progress.have}/${progress.total} 首`}
            {done ? " · 已达成" : ""}
          </span>
        </p>
      </div>
      {done ? (
        <img src="/ui/check-on.png" alt="" className="pop-in h-7 w-7 shrink-0 drop-shadow-md" />
      ) : (
        <span
          aria-hidden
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-ink/20 bg-ink/5 font-display text-[11px] leading-none text-ink/40"
        >
          未
        </span>
      )}
    </ArtPanel>
  );
}

/** 成就：全通制三类（ADR-0013）。上方分类筛选 + 全局统计 + 左右分页的全量成就列表。 */
export function AchievementsView() {
  const [kind, setKind] = useState<KindFilter>("all");
  const { save } = useSave();

  const list = useMemo(
    () => (kind === "all" ? ACHIEVEMENTS : ACHIEVEMENTS.filter((a) => a.kind === kind)),
    [kind],
  );

  return (
    <Stage bg={GAME_BACKGROUNDS.achievements}>
      <StageHud title="诗册" backTo="/" />
      <div className="absolute inset-x-0 bottom-0 top-[max(4rem,calc(env(safe-area-inset-top)+3.6rem))] z-10 overflow-y-auto px-5 pb-[max(1.6rem,env(safe-area-inset-bottom))]">
        <div className="sticky top-0 z-10 mb-2 flex justify-center gap-1.5 bg-gradient-to-b from-ink/40 to-transparent pb-1 pt-1">
          {GROUPS.map((g) => {
            const on = g.kind === kind;
            return (
              <button
                key={g.kind}
                type="button"
                className={`tap rounded-full border px-4 py-1 text-xs tracking-[0.25em] transition-colors ${
                  on
                    ? "border-paper bg-paper text-ink shadow-md"
                    : "border-paper/40 bg-ink/45 text-paper/90"
                }`}
                onClick={() => setKind(g.kind)}
              >
                {g.title}
              </button>
            );
          })}
        </div>

        {/* 全局统计：与首页数据座同语言（纸座 + 墨字 + 列间细分隔），跨屏读作同一套「碑刻」 */}
        <div className="paper-plate paper-plate-ink stat-grid mb-4 px-2 py-2">
          {[
            { icon: "印", value: totalStars(save), label: "诗印总数" },
            { value: save.totalScore, label: "环游总分" },
            { value: save.endlessBestStreak, label: "无尽最高连对" },
          ].map((s) => (
            <div key={s.label} className="flex flex-col items-center px-1 py-0.5 text-center">
              <p className="title-ink flex items-center justify-center gap-1 text-[15px]">
                {s.icon ? (
                  <span
                    aria-hidden
                    className="grid h-4 w-4 place-items-center rounded-full border border-seal bg-seal font-display text-[9px] leading-none text-paper"
                  >
                    {s.icon}
                  </span>
                ) : null}
                {s.value}
              </p>
              <p className="mt-0.5 text-[10px] tracking-widest text-ink-soft">{s.label}</p>
            </div>
          ))}
        </div>

        {list.length > 0 ? (
          <PagedList pageSize={4} count={list.length}>
            {(from, to) => (
              <div className="flex flex-col gap-3">
                {list.slice(from, to).map((a, i) => (
                  <AchievementRow key={a.id} def={a} index={i} />
                ))}
              </div>
            )}
          </PagedList>
        ) : (
          <ArtPanel className="text-center">
            <p className="py-6 text-sm text-ink-soft">这一类还没有成就，先去通关诗卡吧。</p>
          </ArtPanel>
        )}
      </div>
    </Stage>
  );
}
