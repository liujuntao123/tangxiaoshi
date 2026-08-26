import { DYNASTIES, POEMS, poemsByPoet, poetsInDynasty } from "@/lib/game/content";
import { sfxHit, sfxHurt, sfxTap } from "@/lib/game/sfx";
import { useMemo, useState } from "react";
import { ChoiceSlip, WoodSlip } from "./choice-slip";
import { ArtPanel, Stage, StageHud } from "./stage";

export function PracticeView() {
  const [dynastyId, setDynastyId] = useState<string | null>(null);
  const [poetId, setPoetId] = useState<string | null>(null);
  const [poemId, setPoemId] = useState<string | null>(null);
  const [qIndex, setQIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [showPoem, setShowPoem] = useState(false);

  const poets = useMemo(() => (dynastyId ? poetsInDynasty(dynastyId) : []), [dynastyId]);
  const poetPoems = useMemo(() => (poetId ? poemsByPoet(poetId) : []), [poetId]);
  const poem = POEMS.find((item) => item.id === poemId);
  const question = poem?.questions[qIndex];

  function resetQuestion() {
    setPicked(null);
    setShowPoem(false);
  }

  if (!dynastyId) {
    return (
      <Stage bg="/art/scene-tower.jpg">
        <StageHud title="练习" backTo="/" />
        <div className="absolute inset-x-0 bottom-0 top-[18%] z-10 overflow-y-auto px-3 pb-8">
          <p className="paper-glow px-2 pb-2 text-center text-[11px] tracking-[0.22em] text-paper/80">
            按朝代出题。可答题，也可直接看答案。
          </p>
          {DYNASTIES.map((dynasty) => (
            <WoodSlip
              key={dynasty.id}
              className="my-1 w-full"
              onClick={() => {
                sfxTap();
                setDynastyId(dynasty.id);
              }}
            >
              <span className="title-ink text-xl">{dynasty.name}</span>
              <span className="max-w-[52%] truncate text-right text-[11px] tracking-widest text-ink-soft">
                {POEMS.filter((item) => item.dynastyId === dynasty.id).length} 首
              </span>
            </WoodSlip>
          ))}
        </div>
      </Stage>
    );
  }

  if (!poetId) {
    return (
      <Stage bg="/art/scene-tower.jpg">
        <StageHud title="练习" backTo="/" />
        <div className="absolute inset-x-0 bottom-0 top-[18%] z-10 overflow-y-auto px-3 pb-8">
          <button
            type="button"
            onClick={() => setDynastyId(null)}
            className="tap paper-glow mb-2 block w-full text-center text-[11px] tracking-widest text-paper/75"
          >
            ← 朝代
          </button>
          {poets.map((poet) => (
            <WoodSlip
              key={poet.poetId}
              className="my-1 w-full"
              onClick={() => {
                sfxTap();
                setPoetId(poet.poetId);
              }}
            >
              <span className="title-ink text-xl">{poet.poetName}</span>
              <span className="text-[11px] text-ink-soft">{poemsByPoet(poet.poetId).length} 首</span>
            </WoodSlip>
          ))}
        </div>
      </Stage>
    );
  }

  if (!poem) {
    return (
      <Stage bg="/art/scene-tower.jpg">
        <StageHud title="练习" backTo="/" />
        <div className="absolute inset-x-0 bottom-0 top-[18%] z-10 overflow-y-auto px-3 pb-8">
          <button
            type="button"
            onClick={() => setPoetId(null)}
            className="tap paper-glow mb-2 block w-full text-center text-[11px] tracking-widest text-paper/75"
          >
            ← 诗人
          </button>
          {poetPoems.map((item) => (
            <WoodSlip
              key={item.id}
              className="my-1 w-full"
              onClick={() => {
                sfxTap();
                setPoemId(item.id);
                setQIndex(0);
                resetQuestion();
              }}
            >
              <span className="title-ink truncate text-lg">《{item.title}》</span>
            </WoodSlip>
          ))}
        </div>
      </Stage>
    );
  }

  return (
    <Stage bg="/art/scene-tower.jpg">
      <StageHud title="练习" backTo="/" />
      <button
        type="button"
        onClick={() => {
          setPoemId(null);
          resetQuestion();
        }}
        className="paper-glow absolute inset-x-0 top-[14%] z-10 text-center text-[11px] tracking-widest text-paper/75"
      >
        ← 《{poem.title}》
      </button>

      {showPoem ? (
        <button
          type="button"
          className="absolute inset-x-3 top-[20%] z-30 text-left"
          onClick={() => setShowPoem(false)}
        >
          <ArtPanel className="text-center">
            <p className="title-ink text-2xl">《{poem.title}》</p>
            <p className="mt-1 text-[11px] tracking-[0.28em] text-ink-soft">{poem.poetName}</p>
            <div className="poem-line mt-3 max-h-48 space-y-0.5 overflow-y-auto text-[15px] leading-relaxed text-ink">
              {poem.lines.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
            <p className="mt-3 text-[11px] tracking-widest text-ink-soft">点这里收起</p>
          </ArtPanel>
        </button>
      ) : null}

      {question ? (
        <section className="absolute inset-x-0 bottom-0 z-10 px-2 pb-[max(0.7rem,env(safe-area-inset-bottom))] pt-8">
          <div className="flex items-center justify-between px-4 text-[11px] tracking-widest text-paper/85">
            <span className="paper-glow">
              {qIndex + 1} / {poem.questions.length}
            </span>
            <button
              type="button"
              onClick={() => {
                sfxTap();
                setShowPoem(true);
                setPicked(question.answerIndex);
              }}
              className="tap paper-glow"
            >
              查看答案
            </button>
          </div>
          <p className="title-art paper-glow mt-1 px-3 text-center text-[clamp(1.05rem,4.6vw,1.35rem)] leading-snug text-paper">
            {question.prompt}
          </p>
          <div className="mt-1">
            {question.choices.map((choice, index) => {
              const selected = picked === index;
              const right = index === question.answerIndex;
              let state: "idle" | "on" | "miss" = "idle";
              if (picked !== null && right) state = "on";
              else if (selected && !right) state = "miss";
              return (
                <ChoiceSlip
                  key={choice}
                  text={choice}
                  state={state}
                  disabled={picked !== null}
                  onClick={() => {
                    setPicked(index);
                    if (index === question.answerIndex) sfxHit();
                    else sfxHurt();
                  }}
                />
              );
            })}
          </div>
          <div className="mt-1 flex justify-between px-6">
            <button
              type="button"
              disabled={qIndex === 0}
              onClick={() => {
                setQIndex((n) => Math.max(0, n - 1));
                resetQuestion();
              }}
              className="tap hud-title text-paper disabled:opacity-30"
            >
              上一题
            </button>
            <button
              type="button"
              disabled={qIndex >= poem.questions.length - 1}
              onClick={() => {
                setQIndex((n) => Math.min(poem.questions.length - 1, n + 1));
                resetQuestion();
              }}
              className="tap hud-title text-paper disabled:opacity-30"
            >
              下一题
            </button>
          </div>
        </section>
      ) : null}
    </Stage>
  );
}
