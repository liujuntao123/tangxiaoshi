import { POEMS } from "@/lib/game/content";
import { useState } from "react";
import { ChoiceSlip } from "./choice-slip";
import { ArtPanel, Stage, StageHud } from "./stage";

export function PracticeView() {
  const [poemId, setPoemId] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [qIndex, setQIndex] = useState(0);
  const poem = POEMS.find((item) => item.id === poemId);
  const question = poem?.questions[qIndex];

  if (!poem) {
    return (
      <Stage bg="/art/scene-tower.jpg">
        <StageHud title="练习" backTo="/" />
        <div className="absolute inset-x-0 bottom-0 top-[22%] z-10 overflow-y-auto px-4 pb-8">
          <p className="paper-glow px-2 text-center text-[11px] tracking-[0.22em] text-paper/80">
            点一首。可先看诗再答题，不扣血。
          </p>
          <ul className="mt-3">
            {POEMS.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => {
                    setPoemId(item.id);
                    setQIndex(0);
                    setShowAnswer(false);
                  }}
                  className="relative my-0.5 flex h-12 w-full items-center justify-between px-8"
                >
                  <img src="/ui/choice-slip.png" alt="" className="absolute inset-0 h-full w-full object-fill" />
                  <span className="title-ink relative z-10 text-xl">《{item.title}》</span>
                  <span className="relative z-10 text-[11px] tracking-widest text-ink-soft">{item.poetName}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </Stage>
    );
  }

  return (
    <Stage bg="/art/scene-tower.jpg">
      <StageHud title="练习" backTo="/" />
      <div className="absolute inset-x-3 top-[16%] z-10">
        <button
          type="button"
          onClick={() => setPoemId(null)}
          className="paper-glow mb-2 block w-full text-center text-[11px] tracking-widest text-paper/75"
        >
          ← 全部诗文
        </button>
        <ArtPanel className="px-6 py-5 text-center">
          <p className="title-ink text-3xl">《{poem.title}》</p>
          <p className="mt-1 text-[11px] tracking-[0.28em] text-ink-soft">{poem.poetName}</p>
          <div className="poem-line mt-3 space-y-0.5 text-[15px] leading-relaxed text-ink">
            {poem.lines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </ArtPanel>
      </div>

      {question ? (
        <section className="ink-fade absolute inset-x-0 bottom-0 z-10 px-2 pb-[max(0.7rem,env(safe-area-inset-bottom))] pt-6">
          <div className="flex items-center justify-between px-5 text-[11px] tracking-widest text-paper/85">
            <span className="paper-glow">
              {qIndex + 1} / {poem.questions.length}
            </span>
            <button type="button" onClick={() => setShowAnswer((v) => !v)} className="paper-glow">
              {showAnswer ? "收起答案" : "看答案"}
            </button>
          </div>
          <p className="title-art paper-glow mt-1 px-3 text-center text-xl leading-snug text-paper">
            {question.prompt}
          </p>
          <div className="mt-1">
            {question.choices.map((choice, index) => {
              const right = index === question.answerIndex;
              return (
                <ChoiceSlip
                  key={choice}
                  text={choice}
                  state={showAnswer && right ? "on" : "idle"}
                />
              );
            })}
          </div>
          <div className="mt-1 flex justify-between px-7">
            <button
              type="button"
              disabled={qIndex === 0}
              onClick={() => {
                setQIndex((n) => Math.max(0, n - 1));
                setShowAnswer(false);
              }}
              className="hud-title text-paper disabled:opacity-30"
            >
              上一题
            </button>
            <button
              type="button"
              disabled={qIndex >= poem.questions.length - 1}
              onClick={() => {
                setQIndex((n) => Math.min(poem.questions.length - 1, n + 1));
                setShowAnswer(false);
              }}
              className="hud-title text-paper disabled:opacity-30"
            >
              下一题
            </button>
          </div>
        </section>
      ) : null}
    </Stage>
  );
}
