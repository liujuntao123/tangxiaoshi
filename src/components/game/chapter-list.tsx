import { Link } from "@tanstack/react-router";
import { chaptersIn, dynastyById, poetArt } from "@/lib/game/content";
import { isChapterCleared, isChapterUnlocked } from "@/lib/game/progress";
import { useSave } from "@/lib/game/save-context";
import { useState } from "react";
import { SlipShell } from "./choice-slip";
import { Cutscene } from "./cutscene";
import { PoetImg, Stage, StageHud } from "./stage";

function seenKey(id: string) {
  return `tx-seen:dynasty:${id}`;
}

export function ChapterList({ dynastyId }: { dynastyId: string }) {
  const dynasty = dynastyById(dynastyId);
  const { save } = useSave();
  const chapters = chaptersIn(dynastyId);
  const [showOpening, setShowOpening] = useState(() => {
    if (!dynasty.opening?.length) return false;
    try {
      return sessionStorage.getItem(seenKey(dynastyId)) !== "1";
    } catch {
      return true;
    }
  });

  if (showOpening && dynasty.opening?.length) {
    return (
      <Cutscene
        bg={dynasty.scene}
        title={dynasty.name}
        backTo="/story"
        lines={dynasty.opening}
        onDone={() => {
          try {
            sessionStorage.setItem(seenKey(dynastyId), "1");
          } catch {
            /* ignore */
          }
          setShowOpening(false);
        }}
      />
    );
  }

  return (
    <Stage bg={dynasty.scene}>
      <StageHud title={dynasty.name} backTo="/story" />
      <div className="absolute inset-x-0 bottom-0 top-[18%] z-10 overflow-y-auto px-4 pb-8">
        <p className="paper-glow mb-3 text-center text-[11px] tracking-[0.22em] text-paper/80">
          {dynasty.tagline}。点一位诗人，上地图。
        </p>
        <ul>
          {chapters.map((chapter) => {
            const open = isChapterUnlocked(chapter.id, save);
            const done = isChapterCleared(chapter.id, save);
            const inner = (
              <>
                <PoetImg src={poetArt(chapter.poetId)} className="h-11 w-9 object-contain object-bottom" />
                <span className="min-w-0 flex-1 text-left">
                  <span className="title-ink block text-xl leading-tight">{chapter.poetName}</span>
                  <span className="block truncate text-[11px] tracking-widest text-ink-soft">{chapter.hook}</span>
                </span>
                <span className="shrink-0 text-[11px] tracking-widest text-ink-soft">
                  {done ? "已救出" : open ? `${chapter.levels.length} 关` : "锁"}
                </span>
              </>
            );
            return (
              <li key={chapter.id}>
                {open ? (
                  <Link
                    to="/story/$dynastyId/$chapterId"
                    params={{ dynastyId, chapterId: chapter.poetId }}
                    className="tap my-1 block"
                  >
                    <SlipShell>{inner}</SlipShell>
                  </Link>
                ) : (
                  <div className="my-1 opacity-50">
                    <SlipShell>{inner}</SlipShell>
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
