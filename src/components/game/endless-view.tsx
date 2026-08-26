import { Link } from "@tanstack/react-router";
import { questionsFromPoems } from "@/lib/game/content";
import { applyEndlessRun, unlockedPoemIds } from "@/lib/game/progress";
import { useSave } from "@/lib/game/save-context";
import { useMemo, useState } from "react";
import { ChoiceSlip, PlaqueButton, PlaqueFace } from "./choice-slip";
import { ArtPanel, Stage, StageHud } from "./stage";

export function EndlessView() {
  const { save, patchSave } = useSave();
  const poemIds = unlockedPoemIds(save);
  const deck = useMemo(() => questionsFromPoems(poemIds), [poemIds]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [ended, setEnded] = useState(false);
  const [started, setStarted] = useState(false);

  const question = deck[index % Math.max(deck.length, 1)];

  async function onEnd(finalScore: number) {
    setEnded(true);
    await patchSave((current) => applyEndlessRun(current, finalScore));
  }

  function choose(choiceIndex: number) {
    if (!question || picked !== null || ended) return;
    setPicked(choiceIndex);
    const correct = choiceIndex === question.answerIndex;
    window.setTimeout(() => {
      if (!correct) {
        void onEnd(score);
        return;
      }
      const next = score + 1;
      setScore(next);
      setIndex((n) => n + 1);
      setPicked(null);
    }, 400);
  }

  if (poemIds.length === 0) {
    return (
      <Stage bg="/art/scene-peach.jpg">
        <StageHud title="无尽" backTo="/" />
        <div className="absolute inset-x-3 bottom-[max(1rem,env(safe-area-inset-bottom))] z-10">
          <ArtPanel className="text-center">
            <img src="/sprites/fx/bolt.png" alt="" className="mx-auto h-10 w-10 object-contain" />
            <p className="title-ink mt-2 text-2xl">还没有解锁的诗</p>
            <p className="mt-2 text-sm text-ink-soft">先去历险过一关，无尽才会出题。</p>
            <Link to="/story" className="tap mt-4 inline-flex justify-center">
              <PlaqueFace>去历险</PlaqueFace>
            </Link>
          </ArtPanel>
        </div>
      </Stage>
    );
  }

  if (!started) {
    return (
      <Stage bg="/art/scene-peach.jpg">
        <StageHud title="无尽" backTo="/" />
        <div className="absolute inset-x-3 bottom-[max(1rem,env(safe-area-inset-bottom))] z-10">
          <ArtPanel className="text-center">
            <p className="title-ink text-2xl">一题错，本局结束</p>
            <p className="mt-2 text-sm tracking-widest text-ink-soft">
              最高连对 {save.endlessBestStreak} · 最高分 {save.endlessBestScore}
            </p>
            <div className="mt-4 flex justify-center">
              <PlaqueButton onClick={() => setStarted(true)}>开始</PlaqueButton>
            </div>
          </ArtPanel>
        </div>
      </Stage>
    );
  }

  if (ended) {
    return (
      <Stage bg="/art/scene-peach.jpg">
        <StageHud title="无尽" backTo="/" />
        <div className="absolute inset-x-3 bottom-[max(1rem,env(safe-area-inset-bottom))] z-10">
          <ArtPanel className="text-center">
            <p className="title-ink text-2xl">本局结束</p>
            <p className="title-ink mt-1 text-5xl">{score}</p>
            <p className="text-sm tracking-widest text-ink-soft">连对</p>
            <div className="mt-4 flex justify-center">
              <PlaqueButton
                onClick={() => {
                  setIndex(0);
                  setScore(0);
                  setPicked(null);
                  setEnded(false);
                }}
              >
                再来一局
              </PlaqueButton>
            </div>
          </ArtPanel>
        </div>
      </Stage>
    );
  }

  if (!question) return null;

  return (
    <Stage bg="/art/scene-peach.jpg">
      <StageHud title="无尽" backTo="/" />
      <p className="paper-glow absolute inset-x-0 top-[16%] z-10 text-center text-[11px] tracking-[0.22em] text-paper/80">
        连对 {score}
      </p>
      <section className="absolute inset-x-0 bottom-0 z-10 px-2 pb-[max(0.8rem,env(safe-area-inset-bottom))] pt-8">
        <p className="title-art paper-glow mb-1 px-3 text-center text-[clamp(1.05rem,4.6vw,1.35rem)] leading-snug text-paper">
          {question.prompt}
        </p>
        {question.choices.map((choice, choiceIndex) => {
          const selected = picked === choiceIndex;
          const right = choiceIndex === question.answerIndex;
          let state: "idle" | "on" | "miss" = "idle";
          if (picked !== null && right) state = "on";
          else if (selected && !right) state = "miss";
          return (
            <ChoiceSlip
              key={`${question.id}-${choice}`}
              text={choice}
              state={state}
              disabled={picked !== null}
              onClick={() => choose(choiceIndex)}
            />
          );
        })}
      </section>
    </Stage>
  );
}
