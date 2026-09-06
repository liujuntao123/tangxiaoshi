import { Link } from "@tanstack/react-router";
import { POEMS } from "@/lib/game/content";
import { applyEndlessRun, scoreForAnswer, unlockedPoemIds } from "@/lib/game/progress";
import { useSave } from "@/lib/game/save-context";
import { sfxHit, sfxHurt, sfxTap, sfxWin } from "@/lib/game/sfx";
import { HERO_ATTACK, HERO_HURT, HERO_IDLE, poseFrames } from "@/lib/game/sprites";
import type { Poem, Question } from "@/lib/game/types";
import { useRef, useState } from "react";
import { ChoiceSlip, PlaqueButton, PlaqueFace } from "./choice-slip";
import { ArtPanel, Stage, StageHud } from "./stage";
import { SpriteFrames } from "./sprite-frames";

/**
 * 无尽模式（docs/game-design.md §8）：规则仍是一题错本局结束，但反馈与主线一致——
 * battle -> report ->（收句）-> battle / ended。反馈层不使用任何定时器自动推进，
 * 答对与答错都必须由玩家点「收句」才进入下一题或结束页。
 */
type Phase = "idle" | "battle" | "report" | "ended";
type Pose = "idle" | "attack" | "hurt";

/** 每题诗气回报（与主线同口径），只做即时节奏反馈，不写入存档。 */
const QI_PER_CORRECT = 30;

/** 无尽题库项：题目 + 所属诗，答错时给诗句上下文。 */
type DeckItem = { question: Question; poem: Poem };

/** 一题的结算快照：报告层只读它，不再重算规则。 */
type Resolution = {
  correct: boolean;
  pickedIndex: number;
  answerText: string;
  context: string[];
  streakBefore: number;
  streakAfter: number;
  scoreGain: number;
  qiGain: number;
  outcome: "next" | "end";
};

/** 结束页快照：写入存档前先取旧纪录，用于「新纪录」判断。 */
type ResultView = {
  streak: number;
  score: number;
  prevStreak: number;
  prevScore: number;
};

/** 出题库：已解锁诗文的全部题目（含所属诗），打乱后供本局使用。 */
function buildDeck(poemIds: string[]): DeckItem[] {
  const ids = new Set(poemIds);
  const items: DeckItem[] = [];
  for (const poem of POEMS) {
    if (!ids.has(poem.id)) continue;
    for (const question of poem.questions) items.push({ question, poem });
  }
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = items[i];
    const b = items[j];
    if (!a || !b) continue;
    items[i] = b;
    items[j] = a;
  }
  return items;
}

/** 答错时给出正确答案所在诗句及其相邻一句，最多两行，不写长解析。 */
function poemContextFor(poem: Poem, question: Question): string[] {
  const answer = question.choices[question.answerIndex] ?? "";
  const lines = poem.lines;
  const at = lines.indexOf(answer);
  if (at >= 0) {
    const withPrev = [lines[at - 1], lines[at]].filter((line): line is string => Boolean(line));
    if (withPrev.length === 2) return withPrev;
    const withNext = [lines[at], lines[at + 1]].filter((line): line is string => Boolean(line));
    if (withNext.length >= 1) return withNext;
  }
  return lines.slice(0, 2);
}

export function EndlessView() {
  const { save, patchSave } = useSave();
  const poemIds = unlockedPoemIds(save);
  // 题库一局一份（开局时重洗），避免渲染期重算导致题目串线。
  const [deck, setDeck] = useState<DeckItem[]>(() => buildDeck(poemIds));
  const [phase, setPhase] = useState<Phase>("idle");
  const [index, setIndex] = useState(0);
  const [streak, setStreak] = useState(0);
  const [score, setScore] = useState(0);
  const [qi, setQi] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [resolution, setResolution] = useState<Resolution | null>(null);
  const [pose, setPose] = useState<Pose>("idle");
  const [floatText, setFloatText] = useState<string | null>(null);
  const [resultView, setResultView] = useState<ResultView | null>(null);

  // 同步互斥：同 tick 的连点在 React 刷新前到达，用 ref 立刻挡住。
  const busyRef = useRef(false);
  const savedRef = useRef(false);

  const item: DeckItem | undefined = deck.length > 0 ? deck[index % deck.length] : undefined;
  const question = item?.question;
  const heroFrames = poseFrames(pose, HERO_IDLE, HERO_ATTACK, HERO_HURT);

  function resetRun() {
    setDeck(buildDeck(unlockedPoemIds(save)));
    setIndex(0);
    setStreak(0);
    setScore(0);
    setQi(0);
    setPicked(null);
    setResolution(null);
    setPose("idle");
    setFloatText(null);
    setResultView(null);
    savedRef.current = false;
    busyRef.current = false;
    setPhase("battle");
  }

  function restartRun() {
    if (phase !== "ended") return;
    sfxTap();
    resetRun();
  }

  // —— 作答：一次点击只结算一次，不用定时器推进 ——
  function choose(choiceIndex: number) {
    if (busyRef.current) return;
    if (phase !== "battle" || !question || !item || picked !== null || resolution) return;
    busyRef.current = true;
    const correct = choiceIndex === question.answerIndex;
    const answerText = question.choices[question.answerIndex] ?? "";

    let res: Resolution;
    if (correct) {
      const streakAfter = streak + 1;
      const scoreGain = scoreForAnswer({ combo: streakAfter });
      const qiGain = QI_PER_CORRECT;
      res = {
        correct: true,
        pickedIndex: choiceIndex,
        answerText,
        context: [],
        streakBefore: streak,
        streakAfter,
        scoreGain,
        qiGain,
        outcome: "next",
      };
      setStreak(streakAfter);
      setScore(score + scoreGain);
      setQi(Math.min(100, qi + qiGain));
      setPose("attack");
      setFloatText(`+${scoreGain}`);
      sfxHit();
    } else {
      res = {
        correct: false,
        pickedIndex: choiceIndex,
        answerText,
        context: poemContextFor(item.poem, question),
        streakBefore: streak,
        streakAfter: 0,
        scoreGain: 0,
        qiGain: 0,
        outcome: "end",
      };
      setPose("hurt");
      setFloatText("连对中断");
      sfxHurt();
    }
    setPicked(choiceIndex);
    setResolution(res);
    setPhase("report");
  }

  // —— 收句：唯一的推进入口（下一题或结束页） ——
  function continueAfterResolution() {
    const res = resolution;
    if (phase !== "report" || !res || !busyRef.current) return;
    sfxTap();
    setPicked(null);
    setResolution(null);
    setFloatText(null);
    setPose("idle");
    if (res.outcome === "next") {
      busyRef.current = false;
      setIndex((n) => n + 1);
      setPhase("battle");
      return;
    }
    enterEnd(res);
  }

  // —— 结束：applyEndlessRun 仍以连对数更新旧纪录，只写一次 ——
  function enterEnd(res: Resolution) {
    if (savedRef.current) return;
    savedRef.current = true;
    setResultView({
      streak: res.streakBefore,
      score,
      prevStreak: save.endlessBestStreak,
      prevScore: save.endlessBestScore,
    });
    if (res.streakBefore > save.endlessBestStreak) sfxWin();
    setPhase("ended");
    void patchSave((current) => applyEndlessRun(current, res.streakBefore));
  }

  const inRun = phase === "battle" || phase === "report";

  if (poemIds.length === 0 || (inRun && !question)) {
    return (
      <Stage bg="/art/scene-peach.jpg">
        <StageHud title="无尽" backTo="/" />
        <div className="absolute inset-x-3 bottom-[max(1rem,env(safe-area-inset-bottom))] z-10">
          <ArtPanel className="text-center">
            <img src="/sprites/fx/bolt.png" alt="" className="mx-auto h-10 w-10 object-contain" />
            <p className="title-ink mt-2 text-2xl">{poemIds.length === 0 ? "还没有解锁的诗" : "这一局没有可出的题"}</p>
            <p className="mt-2 text-sm text-ink-soft">先去历险过一关，无尽才会出题。</p>
            <div className="mt-4 flex justify-center">
              <Link to="/story" className="tap">
                <PlaqueFace>去历险</PlaqueFace>
              </Link>
            </div>
          </ArtPanel>
        </div>
      </Stage>
    );
  }

  if (phase === "idle") {
    return (
      <Stage bg="/art/scene-peach.jpg">
        <StageHud title="无尽" backTo="/" />
        <div className="absolute inset-x-3 bottom-[max(1rem,env(safe-area-inset-bottom))] z-10">
          <ArtPanel className="text-center">
            <p className="title-ink text-2xl">一题错，本局结束</p>
            <p className="mt-2 text-sm tracking-widest text-ink-soft">
              历史最高连对 {save.endlessBestStreak} · 历史最高分 {save.endlessBestScore}
            </p>
            <div className="mt-4 flex justify-center">
              <PlaqueButton
                onClick={() => {
                  sfxTap();
                  resetRun();
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

  if (phase === "ended") {
    // resultView 缺失时兜底用当前数值，避免出现空白舞台。
    const view = resultView ?? {
      streak,
      score,
      prevStreak: save.endlessBestStreak,
      prevScore: save.endlessBestScore,
    };
    const bestStreak = Math.max(view.prevStreak, view.streak);
    const bestScore = Math.max(view.prevScore, view.score);
    const newRecord = view.streak > view.prevStreak && view.streak > 0;
    return (
      <Stage bg="/art/scene-peach.jpg">
        <StageHud title="无尽" backTo="/" />
        <div className="absolute inset-x-3 bottom-[max(1rem,env(safe-area-inset-bottom))] z-10">
          <ArtPanel className="text-center">
            <p className="title-ink text-2xl">本局结束</p>
            <p className="title-ink mt-1 text-5xl">{view.streak}</p>
            <p className="text-sm tracking-widest text-ink-soft">本局连对</p>
            <p className="mt-1 flex items-baseline justify-center gap-2">
              <span className="text-xs tracking-widest text-ink-soft">本局得分</span>
              <span className="title-ink text-3xl">{view.score}</span>
              {newRecord ? (
                <span className="rounded bg-seal px-1.5 py-0.5 text-[10px] tracking-wider text-paper">刷新纪录</span>
              ) : null}
            </p>
            <p className="mt-1 text-[11px] tracking-wider text-ink/60">
              历史最高连对 {bestStreak} · 历史最高分 {bestScore}
            </p>
            <div className="mt-3 flex flex-col items-center gap-2">
              <PlaqueButton onClick={restartRun}>再来一局</PlaqueButton>
              <Link to="/" className="tap" aria-label="回首页">
                <PlaqueFace>回首页</PlaqueFace>
              </Link>
            </div>
          </ArtPanel>
        </div>
      </Stage>
    );
  }

  if (!question || !item) return null;

  return (
    <Stage bg="/art/scene-peach.jpg">
      <StageHud title="无尽" backTo="/" />

      {inRun ? (
        <EndlessHud streak={streak} score={score} qi={qi} questionNo={index + 1} />
      ) : null}

      <div className="absolute inset-x-0 bottom-[45%] z-10 flex justify-center">
        <div className="relative flex h-32 items-end justify-center">
          <span className="sprite-shadow" />
          <div className={pose === "attack" ? "pose-lunge" : pose === "hurt" ? "pose-recoil" : "idle-bob"}>
            <SpriteFrames
              frames={heroFrames}
              fps={0}
              playing={false}
              alt="唐小诗"
              className="relative z-10 h-32 w-auto object-contain object-bottom drop-shadow-lg"
            />
          </div>
        </div>
      </div>

      {floatText ? (
        <p
          key={`${question.id}-${picked ?? "x"}`}
          className="glyph-burst pointer-events-none absolute bottom-[56%] left-1/2 z-30 font-display text-3xl text-seal"
        >
          {floatText}
        </p>
      ) : null}

      {phase === "battle" ? (
        <section className="pop-in absolute inset-x-0 bottom-0 z-20 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
          <p className="title-art paper-glow mb-0.5 px-3 text-center text-[clamp(0.95rem,4.2vw,1.2rem)] leading-snug text-paper">
            {question.prompt}
          </p>
          <div className="flex flex-col gap-0">
            {question.choices.map((choice, choiceIndex) => (
              <ChoiceSlip
                key={`${question.id}-${choice}`}
                text={choice}
                state="idle"
                disabled={picked !== null}
                onClick={() => choose(choiceIndex)}
              />
            ))}
          </div>
        </section>
      ) : null}

      {phase === "report" && resolution ? (
        <ReportPanel res={resolution} onContinue={continueAfterResolution} />
      ) : null}
    </Stage>
  );
}

/** 战斗 HUD：连对、分数、题号与诗气（docs/game-design.md §8 无尽）。 */
function EndlessHud({
  streak,
  score,
  qi,
  questionNo,
}: {
  streak: number;
  score: number;
  qi: number;
  questionNo: number;
}) {
  return (
    <div className="absolute inset-x-2 top-[5.2rem] z-10 flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2 rounded-lg bg-ink/50 px-2.5 py-1">
        <p className="text-[11px] tracking-wider text-paper/90" aria-label={`连对 ${streak}`}>
          连对{" "}
          <span key={streak} className="combo-bump inline-block font-display text-base text-paper">
            ×{streak}
          </span>
        </p>
        <p className="text-[11px] tracking-wider text-paper/90" aria-label={`分数 ${score}`}>
          分数 <span className="font-display text-base text-paper">{score}</span>
        </p>
        <p className="text-[11px] tracking-wider text-paper/90">题 {questionNo}</p>
      </div>
      <div className="flex items-center gap-2 rounded-lg bg-ink/50 px-2.5 py-1">
        <span className="shrink-0 text-[10px] tracking-widest text-paper/80">诗气</span>
        <div
          role="progressbar"
          aria-label="诗气"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={qi}
          className="h-2 flex-1 overflow-hidden rounded-full bg-paper/25"
        >
          <div className="qi-fill h-full rounded-full bg-seal" style={{ width: `${qi}%` }} />
        </div>
      </div>
    </div>
  );
}

/** 反馈层：答对报连对/得分/诗气；答错高亮正解、给两句上下文；都等玩家收句。 */
function ReportPanel({ res, onContinue }: { res: Resolution; onContinue: () => void }) {
  return (
    <section className="pop-in absolute inset-x-2 bottom-[max(0.6rem,env(safe-area-inset-bottom))] z-20">
      <ArtPanel className="text-center">
        {res.correct ? (
          <>
            <p className="title-ink text-2xl">答对</p>
            <p className="mt-1 text-xs tracking-wider text-ink-soft">
              连对 ×{res.streakAfter} · +{res.scoreGain} 分 · 诗气 +{res.qiGain}
            </p>
          </>
        ) : (
          <>
            <p className="title-ink text-2xl">答错</p>
            <p className="poem-line mt-1 rounded-md bg-pine/15 px-2 py-1 text-sm leading-snug text-ink">
              正确是「{res.answerText}」
            </p>
            {res.context.map((line) => (
              <p key={line} className="poem-line text-xs leading-snug text-ink-soft">
                {line}
              </p>
            ))}
            <p className="mt-0.5 text-xs tracking-wider text-ink-soft">
              {res.streakBefore > 0 ? `连对 ×${res.streakBefore} 中断` : "本局刚刚开始"}
              · 一题错，本局结束
            </p>
          </>
        )}
        <div className="mt-3 flex justify-center">
          <PlaqueButton onClick={onContinue}>{res.outcome === "next" ? "收句" : "收句 · 看结果"}</PlaqueButton>
        </div>
      </ArtPanel>
    </section>
  );
}
