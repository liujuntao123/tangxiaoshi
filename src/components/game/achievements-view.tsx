import { useMemo, useState } from "react";
import { ACHIEVEMENTS, achievementProgress } from "@/lib/game/content";
import { GAME_BACKGROUNDS } from "@/lib/game/content/meta";
import type { AchievementDef, AchievementKind } from "@/lib/game/types";
import { useSave } from "@/lib/game/save-context";
import { PagedList } from "./paged-list";
import { ArtPanel, Stage, StageHud } from "./stage";

type KindFilter = AchievementKind | "all";

const GROUPS: { kind: KindFilter; title: string }[] = [
  { kind: "all", title: "全部" },
  { kind: "author", title: "作者" },
  { kind: "collection", title: "文集" },
  { kind: "dynasty", title: "朝代" },
];

function AchievementRow({ def }: { def: AchievementDef }) {
  const { save } = useSave();
  const progress = achievementProgress(def, save);
  const done = progress.done;
  return (
    <ArtPanel className="flex items-center gap-3 text-left">
      <img
        src={def.art}
        alt=""
        onError={(e) => {
          e.currentTarget.style.visibility = "hidden";
        }}
        className={`h-14 w-auto shrink-0 object-contain ${done ? "" : "opacity-60 grayscale"}`}
      />
      <div className="min-w-0 flex-1 px-1">
        <p className="title-ink text-lg leading-tight">{def.title}</p>
        <p className="mt-0.5 text-sm text-ink-soft">{def.subtitle}</p>
        <p className="mt-1 text-xs text-ink-soft">
          {`${progress.have} / ${progress.total} 首`}
          {done ? " · 已达成" : ""}
        </p>
      </div>
      {done ? (
        <img src="/ui/check-on.png" alt="" className="pop-in h-7 w-7 shrink-0 drop-shadow-md" />
      ) : null}
    </ArtPanel>
  );
}

/** 成就：全通制三类（ADR-0013）。上方分类筛选 + 下方左右分页的全量成就列表。 */
export function AchievementsView() {
  const [kind, setKind] = useState<KindFilter>("all");

  const list = useMemo(
    () => (kind === "all" ? ACHIEVEMENTS : ACHIEVEMENTS.filter((a) => a.kind === kind)),
    [kind],
  );

  return (
    <Stage bg={GAME_BACKGROUNDS.achievements}>
      <StageHud title="成就" backTo="/" />
      <div className="absolute inset-x-0 bottom-0 top-[max(4rem,calc(env(safe-area-inset-top)+3.6rem))] z-10 overflow-y-auto px-4 pb-[max(1.2rem,env(safe-area-inset-bottom))]">
        <div className="sticky top-0 z-10 mb-2 flex justify-center gap-1.5 bg-gradient-to-b from-ink/40 to-transparent pb-1 pt-1">
          {GROUPS.map((g) => {
            const on = g.kind === kind;
            return (
              <button
                key={g.kind}
                type="button"
                className={`tap rounded-full border px-4 py-1 text-xs tracking-[0.25em] ${
                  on ? "border-paper bg-paper/90 text-ink" : "border-paper/50 text-paper/90"
                }`}
                onClick={() => setKind(g.kind)}
              >
                {g.title}
              </button>
            );
          })}
        </div>

        {list.length > 0 ? (
          <PagedList pageSize={4} count={list.length}>
            {(from, to) => (
              <div className="flex flex-col gap-3">
                {list.slice(from, to).map((a) => (
                  <AchievementRow key={a.id} def={a} />
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
