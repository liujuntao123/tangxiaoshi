import { Link } from "@tanstack/react-router";
import { DYNASTIES, PROLOGUE, chaptersIn } from "@/lib/game/content";
import { isDynastyUnlocked, rescuedPoetIds } from "@/lib/game/progress";
import { useSave } from "@/lib/game/save-context";
import { useState } from "react";
import { SlipShell } from "./choice-slip";
import { Cutscene } from "./cutscene";
import { Stage, StageHud } from "./stage";

function seenKey(id: string) {
  return `tx-seen:${id}`;
}

function hasSeen(id: string) {
  try {
    return sessionStorage.getItem(seenKey(id)) === "1";
  } catch {
    return false;
  }
}

function markSeen(id: string) {
  try {
    sessionStorage.setItem(seenKey(id), "1");
  } catch {
    /* ignore */
  }
}

export function DynastyHub() {
  const { save } = useSave();
  const rescued = new Set(rescuedPoetIds(save));
  const fresh = save.clearedLevels.length === 0;
  const [showPrologue, setShowPrologue] = useState(fresh && PROLOGUE.length > 0 && !hasSeen("prologue"));

  if (showPrologue) {
    return (
      <Cutscene
        bg="/art/scene-moon.jpg"
        title="出发"
        backTo="/"
        lines={PROLOGUE}
        onDone={() => {
          markSeen("prologue");
          setShowPrologue(false);
        }}
      />
    );
  }

  return (
    <Stage bg="/art/map.jpg">
      <StageHud title="选朝代" backTo="/" />
      <div className="absolute inset-x-0 bottom-0 top-[18%] z-10 overflow-y-auto px-4 pb-8">
        <p className="paper-glow mb-3 text-center text-[11px] tracking-[0.22em] text-paper/80">
          一朝一朝去救人。救出一位，下一朝才开门。
        </p>
        <ul>
          {DYNASTIES.map((dynasty) => {
            const open = isDynastyUnlocked(dynasty.id, save);
            const chapters = chaptersIn(dynasty.id);
            const have = chapters.filter((chapter) => rescued.has(chapter.poetId)).length;
            return (
              <li key={dynasty.id}>
                {open ? (
                  <Link to="/story/$dynastyId" params={{ dynastyId: dynasty.id }} className="tap my-1 block">
                    <SlipShell>
                      <span className="title-ink text-2xl">{dynasty.name}</span>
                      <span className="text-[11px] tracking-widest text-ink-soft">
                        {have}/{chapters.length}
                      </span>
                    </SlipShell>
                  </Link>
                ) : (
                  <div className="my-1 opacity-50">
                    <SlipShell>
                      <span className="title-ink text-2xl">{dynasty.name}</span>
                      <span className="text-[11px] tracking-widest text-ink-soft">未开</span>
                    </SlipShell>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </Stage>
  );
}
