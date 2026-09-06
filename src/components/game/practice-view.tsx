import { DYNASTIES, POEMS, poemsByPoet, poetsInDynasty } from "@/lib/game/content";
import { sfxHit, sfxHurt, sfxTap } from "@/lib/game/sfx";
import { useMemo, useState } from "react";
import { ChoiceSlip, PlaqueButton, WoodSlip } from "./choice-slip";
import { ArtPanel, Stage, StageHud } from "./stage";

export function PracticeView() {
  const [dynastyId, setDynastyId] = useState<string | null>(null);
  const [poetId, setPoetId] = useState<string | null>(null);
  const [poemId, setPoemId] = useState<string | null>(null);
  const [qIndex, setQIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [showPoem, setShowPoem] = useState(false);
  // 会话内完成记录：poemId -> 已完成题号。切诗文不丢记录，退出练习即清，不写存档。
  const [done, setDone] = useState<Record<string, number[]>>({});

  const poets = useMemo(() => (dynastyId ? poetsInDynasty(dynastyId) : []), [dynastyId]);
  const poetPoems = useMemo(() => (poetId ? poemsByPoet(poetId) : []), [poetId]);
  const poem = POEMS.find((item) => item.id === poemId);
  const question = poem?.questions[qIndex];
  const doneForPoem = (id: string | null) => (id && done[id] ? done[id].length : 0);
  const isDone = poemId !== null && !!done[poemId]?.includes(qIndex);

  function markDone(id: string | null, index: number) {
    if (!id) return;
    setDone((prev) => {
      const list = prev[id] ?? [];
      if (list.includes(index)) return prev;
      return { ...prev, [id]: [...list, index] };
    });
  }

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
          <div className="mb-2 flex justify-center">
            <PlaqueButton onClick={() => setDynastyId(null)}>回朝代</PlaqueButton>
          </div>
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
          <div className="mb-2 flex justify-center">
            <PlaqueButton onClick={() => setPoetId(null)}>回诗人</PlaqueButton>
          </div>
          {poetPoems.map((item) => {
            const doneCount = doneForPoem(item.id);
            const total = item.questions.length;
            return (
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
                <span
                  className={`text-[11px] tracking-widest ${doneCount >= total ? "text-ink" : "text-ink-soft"}`}
                >
                  {doneCount >= total ? "已完成" : `${doneCount}/${total}`}
                </span>
              </WoodSlip>
            );
          })}
        </div>
      </Stage>
    );
  }

  return (
    <Stage bg="/art/scene-tower.jpg">
      <StageHud title="练习" backTo="/" />
      <div className="absolute inset-x-0 top-[14%] z-10 flex justify-center">
        <PlaqueButton
          onClick={() => {
            setPoemId(null);
            resetQuestion();
          }}
        >
          回诗文
        </PlaqueButton>
      </div>

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
            <p className="mt-3 text-center">
              <span className="title-ink text-sm tracking-widest text-ink-soft">点牌收回</span>
            </p>
          </ArtPanel>
        </button>
      ) : null}

      {question ? (
        <section className="absolute inset-x-0 bottom-0 z-10 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
          <div className="flex items-center justify-between px-4 text-[11px] tracking-widest text-paper/85">
            <span className="paper-glow">
              第 {qIndex + 1}/{poem.questions.length} 题 · 已完成 {doneForPoem(poemId)}/{poem.questions.length}
            </span>
            <PlaqueButton
              onClick={() => {
                sfxTap();
                setShowPoem(true);
                setPicked(question.answerIndex);
                markDone(poemId, qIndex);
              }}
            >
              查看答案
            </PlaqueButton>
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
                    markDone(poemId, qIndex);
                    if (index === question.answerIndex) sfxHit();
                    else sfxHurt();
                  }}
                />
              );
            })}
          </div>
          {picked !== null ? (
            <p className="paper-glow mt-1.5 text-center text-[12px] tracking-widest text-paper">
              {picked === question.answerIndex ? (
                <span className="text-ink">✓ 答对了</span>
              ) : (
                <>
                  正确答案：<span className="text-ink">{question.choices[question.answerIndex]}</span>
                </>
              )}
              {isDone && doneForPoem(poemId) >= poem.questions.length ? " · 本篇已完成" : ""}
            </p>
          ) : null}
          <div className="mt-2 flex justify-between gap-3 px-2">
            <PlaqueButton
              disabled={qIndex === 0}
              onClick={() => {
                setQIndex((n) => Math.max(0, n - 1));
                resetQuestion();
              }}
            >
              上一题
            </PlaqueButton>
            <PlaqueButton
              disabled={qIndex >= poem.questions.length - 1}
              onClick={() => {
                setQIndex((n) => Math.min(poem.questions.length - 1, n + 1));
                resetQuestion();
              }}
            >
              下一题
            </PlaqueButton>
          </div>
        </section>
      ) : null}
    </Stage>
  );
}
