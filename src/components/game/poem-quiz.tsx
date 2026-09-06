import { useEffect, useMemo, useRef, useState } from "react";
import { authorById, chancesFor, passMark, shuffleQuestions } from "@/lib/game/content";
import { HERO } from "@/lib/game/content/meta";
import type { Poem } from "@/lib/game/types";
import { applyPoemWin } from "@/lib/game/progress";
import { useSave } from "@/lib/game/save-context";
import { sfxHit, sfxHurt, sfxTap, sfxWin } from "@/lib/game/sfx";
import { ChoiceSlip, PlaqueButton } from "./choice-slip";
import { HpPips } from "./hp-pips";
import { ArtPanel, PoetImg, Stage, StageHud } from "./stage";

export type QuizMode = "tour" | "practice";

type Pose = "idle" | "happy" | "sad";

/**
 * 一张诗卡 = 一轮 5 题（docs/content-rules.md）。
 * tour：机会灯笼 + 及格线，通关写存档；practice：无灯笼，可先看答案，不写存档。
 */
export function PoemQuiz({
  poem,
  mode,
  backTo,
  onExit,
}: {
  poem: Poem;
  mode: QuizMode;
  backTo: string;
  onExit: () => void;
}) {
  const author = authorById(poem.authorId);
  const { patchSave } = useSave();
  const deck = useMemo(() => shuffleQuestions(poem.questions), [poem.id]);
  const total = deck.length;
  const chances = chancesFor(total);
  const need = passMark(total);

  const [round, setRound] = useState(0);
  const [qIndex, setQIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [reveal, setReveal] = useState(false);
  const [pose, setPose] = useState<Pose>("idle");
  const [mood, setMood] = useState(0);
  const [result, setResult] = useState<"win" | "lose" | "done" | null>(null);
  const savedRef = useRef(false);

  useEffect(() => {
    setRound(0);
    setQIndex(0);
    setCorrect(0);
    setWrong(0);
    setPicked(null);
    setReveal(false);
    setResult(null);
    savedRef.current = false;
  }, [poem.id]);

  const question = deck[qIndex];

  function retry() {
    setRound((n) => n + 1);
    setQIndex(0);
    setCorrect(0);
    setWrong(0);
    setPicked(null);
    setReveal(false);
    setResult(null);
    setPose("idle");
  }

  function choose(index: number) {
    if (!question || picked !== null || result) return;
    setPicked(index);
    const right = index === question.answerIndex;
    if (right) sfxHit();
    else sfxHurt();
    setPose(right ? "happy" : "sad");
    setMood((n) => n + 1);
    window.setTimeout(() => {
      const nextCorrect = right ? correct + 1 : correct;
      const nextWrong = right ? wrong : wrong + 1;
      setCorrect(nextCorrect);
      setWrong(nextWrong);
      setPose("idle");
      const done = qIndex + 1 >= total;
      const failed = mode === "tour" && nextWrong >= chances && !done;
      if (failed) {
        setResult("lose");
        setPicked(null);
        return;
      }
      if (done) {
        if (mode === "practice") {
          setResult("done");
        } else if (nextCorrect >= need) {
          sfxWin();
          setResult("win");
          if (!savedRef.current) {
            savedRef.current = true;
            void patchSave((current) => applyPoemWin(current, poem.id));
          }
        } else {
          setResult("lose");
        }
        setPicked(null);
        return;
      }
      setQIndex((n) => n + 1);
      setPicked(null);
      setReveal(false);
    }, 640);
  }

  const chancesLeft = chances - wrong;
  const bigLine = question ? (question.type === "title" ? question.quote : question.quote) : "";
  const ask = question ? (question.type === "title" ? "出自哪一首？" : question.type === "complete-next" ? "的下一句是？" : "的上一句是？") : "";

  return (
    <Stage bg={poem.background}>
      <StageHud title={mode === "tour" ? author.name : `${author.name}·练习`} backTo={backTo} />

      <div className="absolute inset-x-0 top-[max(3.6rem,calc(env(safe-area-inset-top)+3.2rem))] z-10 flex items-center justify-between px-4">
        <HpPips value={mode === "tour" ? Math.max(0, chancesLeft) : 0} label="" max={mode === "tour" ? chances : 0} />
        <span className="ink-chip paper-glow px-3 py-1 text-[11px] tracking-[0.3em] text-paper/95">
          第 {Math.min(qIndex + 1, total)} / {total} 题
        </span>
      </div>

      {/* 双人位：左唐小诗（情绪形态），右作者（单一立绘，只出题） */}
      <div className="absolute inset-x-0 bottom-[38%] z-10 flex items-end justify-between px-2">
        <div className="w-[44%] text-center">
          <p className="hud-title text-paper">唐小诗</p>
          <div className="relative mx-auto mt-1 flex h-36 items-end justify-center">
            <span className="sprite-shadow" />
            <img
              src={pose === "happy" ? HERO.happy : pose === "sad" ? HERO.sad : HERO.idle}
              alt=""
              key={mood}
              onError={(e) => {
                e.currentTarget.style.visibility = "hidden";
              }}
              className={`relative z-10 h-36 w-auto object-contain object-bottom drop-shadow-lg ${
                pose === "happy" ? "mood-happy" : pose === "sad" ? "mood-sad" : "idle-bob"
              }`}
            />
          </div>
        </div>
        <div className="w-[44%] -scale-x-100 text-center">
          <p className="hud-title -scale-x-100 text-paper">{author.name}</p>
          <div className="relative mx-auto mt-1 flex h-40 items-end justify-center">
            <span className="sprite-shadow" />
            <PoetImg
              src={author.portrait}
              className="relative z-10 h-40 w-auto -scale-x-100 object-contain object-bottom drop-shadow-lg"
            />
          </div>
        </div>
      </div>

      {question && !result ? (
        <section className="pop-in absolute inset-x-0 bottom-0 z-20 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
          {bigLine ? (
            <p className="title-art paper-glow mb-1 px-3 text-center text-[clamp(1.15rem,5vw,1.5rem)] leading-snug text-paper">
              {bigLine}
            </p>
          ) : null}
          <p className="mb-1 px-3 text-center text-sm tracking-wider text-paper/90">{ask}</p>
          <div className="flex flex-col gap-0">
            {question.choices.map((choice, index) => {
              const selected = picked === index;
              const right = index === question.answerIndex;
              let state: "idle" | "on" | "miss" = "idle";
              if ((picked !== null && right) || (reveal && right)) state = "on";
              else if (selected && !right) state = "miss";
              return (
                <ChoiceSlip
                  key={choice}
                  text={choice}
                  state={state}
                  disabled={picked !== null}
                  onClick={() => choose(index)}
                />
              );
            })}
          </div>
          {mode === "practice" ? (
            <button
              type="button"
              className="tap mx-auto mt-1 block px-4 py-1 text-xs tracking-widest text-paper/80"
              onClick={() => {
                sfxTap();
                setReveal(true);
              }}
            >
              先看答案
            </button>
          ) : null}
        </section>
      ) : null}

      {result ? (
        <div className="pop-in absolute inset-x-2 bottom-6 z-20">
          <ArtPanel className="text-center">
            {result === "win" ? (
              <>
                <p className="title-ink text-3xl">通关</p>
                <p className="mt-1 text-sm text-ink-soft">{`对了 ${correct}/${total}，这张诗卡收下了。`}</p>
              </>
            ) : result === "done" ? (
              <>
                <p className="title-ink text-3xl">答完了</p>
                <p className="mt-1 text-sm text-ink-soft">{`对了 ${correct}/${total}。`}</p>
              </>
            ) : (
              <>
                <p className="title-ink text-3xl">差一点</p>
                <p className="mt-1 text-sm text-ink-soft">{`对了 ${correct}/${total}，再来一次吧。`}</p>
              </>
            )}
            <p className="mx-auto mt-2 max-w-[26em] whitespace-pre-wrap text-left text-[13px] leading-relaxed text-ink-soft">
              {poem.text}
            </p>
            <div className="mt-3 flex justify-center gap-3">
              {result === "lose" ? <PlaqueButton onClick={retry}>再试一次</PlaqueButton> : null}
              {result === "win" || result === "done" ? (
                <PlaqueButton
                  onClick={() => {
                    sfxTap();
                    onExit();
                  }}
                >
                  返回
                </PlaqueButton>
              ) : null}
            </div>
          </ArtPanel>
        </div>
      ) : null}
    </Stage>
  );
}
