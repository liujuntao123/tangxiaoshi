import { useMemo, useState } from "react";
import { allQuestions } from "@/lib/game/content";
import { GAME_BACKGROUNDS } from "@/lib/game/content/meta";
import { applyEndlessRun } from "@/lib/game/progress";
import { useSave } from "@/lib/game/save-context";
import { sfxHit, sfxHurt, sfxTap, sfxWin } from "@/lib/game/sfx";
import { ChoiceSlip, PlaqueButton } from "./choice-slip";
import { ArtPanel, Stage, StageHud } from "./stage";

/**
 * 无尽：已编译全部题池随机，一题答错即止（ADR-0011）。
 * 记最高连对与最高分；无通关概念，不写成就。
 */
export function EndlessView() {
  const { save, patchSave } = useSave();
  const pool = useMemo(() => {
    // Fisher-Yates 洗牌，每局不同
    const deck = [...allQuestions()];
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const a = deck[i]!;
      const b = deck[j]!;
      deck[i] = b;
      deck[j] = a;
    }
    return deck;
  }, []);
  const [seed, setSeed] = useState(0);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [ended, setEnded] = useState(false);
  const [started, setStarted] = useState(false);

  const entry = pool[index % Math.max(pool.length, 1)];
  const question = entry?.question;
  const best = save.endlessBestScore;

  async function onEnd(finalScore: number) {
    setEnded(true);
    await patchSave((current) => applyEndlessRun(current, finalScore, finalScore));
  }

  function choose(choiceIndex: number) {
    if (!question || picked !== null || ended) return;
    setPicked(choiceIndex);
    const right = choiceIndex === question.answerIndex;
    window.setTimeout(() => {
      if (right) sfxHit();
      else sfxHurt();
      if (!right) {
        void onEnd(score);
        return;
      }
      const next = score + 1;
      setScore(next);
      if (next % 10 === 0) sfxWin();
      setIndex((n) => n + 1);
      setPicked(null);
    }, 420);
  }

  function restart() {
    sfxTap();
    setSeed((n) => n + 1);
    setIndex(0);
    setScore(0);
    setPicked(null);
    setEnded(false);
    setStarted(true);
  }

  if (!started) {
    return (
      <Stage bg={GAME_BACKGROUNDS.endless}>
        <StageHud title="无尽" backTo="/" />
        <div className="absolute inset-x-3 bottom-[max(1rem,env(safe-area-inset-bottom))] z-10">
          <ArtPanel className="text-center">
            <p className="title-ink text-2xl">一题答错，本局结束</p>
            <p className="mt-2 text-sm tracking-widest text-ink-soft">
              {`最高连对 ${save.endlessBestStreak} · 最高分 ${best}`}
            </p>
            <div className="mt-4">
              <PlaqueButton
                onClick={() => {
                  sfxTap();
                  setStarted(true);
                }}
              >
                开始
              </PlaqueButton>
            </div>
          </ArtPanel>
        </div>
      </Stage>
    );
  }

  return (
    <Stage bg={GAME_BACKGROUNDS.endless}>
      <StageHud title="无尽" backTo="/" />
      <div className="absolute inset-x-0 top-[max(3.8rem,calc(env(safe-area-inset-top)+3.4rem))] z-10 flex justify-center">
        <span className="ink-chip paper-glow px-3 py-1 text-[11px] tracking-[0.3em] text-paper/95">
          连对 {score}
        </span>
      </div>

      {question && !ended ? (
        <section className="pop-in absolute inset-x-0 bottom-0 z-20 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2" key={seed}>
          <p className="title-art paper-glow mb-1 px-3 text-center text-[clamp(1.15rem,5vw,1.5rem)] leading-snug text-paper">
            {question.quote || question.prompt}
          </p>
          <p className="mb-1 px-3 text-center text-sm tracking-wider text-paper/90">
            {question.type === "title" ? "出自哪一首？" : question.type === "complete-next" ? "的下一句是？" : "的上一句是？"}
          </p>
          <div className="flex flex-col gap-0">
            {question.choices.map((choice, i) => {
              const selected = picked === i;
              const right = i === question.answerIndex;
              let state: "idle" | "on" | "miss" = "idle";
              if (picked !== null && right) state = "on";
              else if (selected && !right) state = "miss";
              return (
                <ChoiceSlip key={choice} text={choice} state={state} disabled={picked !== null} onClick={() => choose(i)} />
              );
            })}
          </div>
        </section>
      ) : null}

      {ended ? (
        <div className="pop-in absolute inset-x-2 bottom-6 z-20">
          <ArtPanel className="text-center">
            <p className="title-ink text-3xl">本局结束</p>
            <p className="mt-1 text-sm text-ink-soft">{`连对 ${score} 题 · 历史最高 ${Math.max(best, score)}`}</p>
            <div className="mt-3">
              <PlaqueButton onClick={restart}>再来一局</PlaqueButton>
            </div>
          </ArtPanel>
        </div>
      ) : null}
    </Stage>
  );
}
