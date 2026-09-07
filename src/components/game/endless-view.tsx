import { Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { allQuestions } from "@/lib/game/content";
import { GAME_BACKGROUNDS, HERO } from "@/lib/game/content/meta";
import { applyEndlessRun, poemContextFor, scoreForAnswer } from "@/lib/game/progress";
import type { Poem, Question } from "@/lib/game/types";
import { useSave } from "@/lib/game/save-context";
import { sfxHit, sfxHurt, sfxTap, sfxWin } from "@/lib/game/sfx";
import { ChoiceSlip, PlaqueButton, PlaqueFace } from "./choice-slip";
import { ArtPanel, Stage, StageHud } from "./stage";

/**
 * 无尽（上游口径）：已编译全部题池随机，一题答错即止，无通关概念（ADR-0011）。
 * 答题手感（玩法重做，ADR-0015）：battle -> report ->（收句）-> battle / ended，
 * 连击计分 + 诗气反馈；答错给正确答案与诗句上下文，全程无定时器自动推进。
 */
type Phase = "idle" | "battle" | "report" | "ended";
type Pose = "idle" | "happy" | "sad";

/** 选项序号印：甲乙丙丁，作答仪式感。 */
const SLIP_MARKS = ["甲", "乙", "丙", "丁"] as const;

/** 每题诗气回报（与环游答题同口径），只做即时节奏反馈，不写入存档。 */
const QI_PER_CORRECT = 30;

/** 无尽题库项：题目 + 所属诗，答错时给诗句上下文。 */
type DeckItem = { question: Question; poem: Poem };

/** 一题的结算快照：报告层只读它，不再重算规则。 */
type Resolution = {
  correct: boolean;
  answerText: string;
  context: string[];
  streakBefore: number;
  streakAfter: number;
  scoreGain: number;
  qiGain: number;
  outcome: "next" | "end";
};

/** 结束页快照：写入存档前先取旧纪录，用于「刷新纪录」判断。 */
type ResultView = {
  streak: number;
  score: number;
  prevStreak: number;
  prevScore: number;
};

/** 出题库：已编译全部诗的题目（含所属诗），Fisher-Yates 打乱后供本局使用。 */
function buildDeck(): DeckItem[] {
  const items = allQuestions();
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

export function EndlessView() {
  const { save, patchSave } = useSave();
  // 题库一局一份（开局时重洗），避免渲染期重算导致题目串线。
  const [deck, setDeck] = useState<DeckItem[]>(() => buildDeck());
  const [phase, setPhase] = useState<Phase>("idle");
  const [index, setIndex] = useState(0);
  const [streak, setStreak] = useState(0);
  const [score, setScore] = useState(0);
  const [qi, setQi] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [resolution, setResolution] = useState<Resolution | null>(null);
  const [pose, setPose] = useState<Pose>("idle");
  const [mood, setMood] = useState(0);
  const [floatText, setFloatText] = useState<string | null>(null);
  const [resultView, setResultView] = useState<ResultView | null>(null);

  // 同步互斥：同 tick 的连点在 React 刷新前到达，用 ref 立刻挡住。
  const busyRef = useRef(false);
  const savedRef = useRef(false);

  const item: DeckItem | undefined = deck.length > 0 ? deck[index % deck.length] : undefined;
  const question = item?.question;
  const best = save.endlessBestScore;

  function resetRun() {
    setDeck(buildDeck());
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

    // 微触觉（克制）：作答确认轻微振动 12ms
    try {
      navigator.vibrate?.(12);
    } catch {
      // 忽略不支持
    }

    const correct = choiceIndex === question.answerIndex;
    const answerText = question.choices[question.answerIndex] ?? "";

    let res: Resolution;
    if (correct) {
      const streakAfter = streak + 1;
      const scoreGain = scoreForAnswer({ combo: streakAfter });
      res = {
        correct: true,
        answerText,
        context: [],
        streakBefore: streak,
        streakAfter,
        scoreGain,
        qiGain: QI_PER_CORRECT,
        outcome: "next",
      };
      setStreak(streakAfter);
      setScore(score + scoreGain);
      setQi(Math.min(100, qi + QI_PER_CORRECT));
      setPose("happy");
      setMood((n) => n + 1);
      setFloatText(`+${scoreGain}`);
      if (streakAfter % 10 === 0) sfxWin();
      else sfxHit();
    } else {
      res = {
        correct: false,
        answerText,
        context: poemContextFor(item.poem, question),
        streakBefore: streak,
        streakAfter: 0,
        scoreGain: 0,
        qiGain: 0,
        outcome: "end",
      };
      setPose("sad");
      setMood((n) => n + 1);
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

  // —— 结束：连对与得分分别刷新双最佳，只写一次 ——
  function enterEnd(res: Resolution) {
    if (savedRef.current) return;
    savedRef.current = true;

    // 微触觉：终局进入时振动反馈 35ms
    try {
      navigator.vibrate?.(35);
    } catch {
      // 忽略不支持
    }

    setResultView({
      streak: res.streakBefore,
      score,
      prevStreak: save.endlessBestStreak,
      prevScore: save.endlessBestScore,
    });
    if (res.streakBefore > save.endlessBestStreak) sfxWin();
    setPhase("ended");
    void patchSave((current) => applyEndlessRun(current, score, res.streakBefore));
  }

  const inRun = phase === "battle" || phase === "report";

  if (deck.length === 0 || (inRun && !question)) {
    return (
      <Stage bg={GAME_BACKGROUNDS.endless}>
        <StageHud title="无尽模式" backTo="/" />
        <div className="absolute inset-x-3 bottom-[max(1rem,env(safe-area-inset-bottom))] z-10">
          <ArtPanel className="text-center">
            <p className="title-ink mt-2 text-2xl">这一局没有可出的题</p>
            <p className="mt-2 text-sm text-ink-soft">内容编译后再来吧。</p>
            <div className="mt-4 flex justify-center">
              <Link to="/" className="tap">
                <PlaqueFace>回首页</PlaqueFace>
              </Link>
            </div>
          </ArtPanel>
        </div>
      </Stage>
    );
  }

  if (phase === "idle") {
    return (
      <Stage bg={GAME_BACKGROUNDS.endless}>
        <StageHud title="无尽模式" backTo="/" />
        <div className="absolute inset-x-3 inset-y-0 z-10 flex translate-y-[1.5dvh] flex-col justify-center pb-[max(1rem,env(safe-area-inset-bottom))]">
          {/* 开局仪式感：唐小诗立绘跃然卷上（审查 P1-13） */}
          <div className="relative mx-auto mb-2 flex h-28 items-end justify-center">
            <span className="sprite-shadow" />
            <img
              src="/sprites/hero.png"
              alt=""
              className="idle-bob relative z-10 h-28 w-auto object-contain object-bottom drop-shadow-lg"
            />
          </div>
          {/* 背景人物恰在面板脚下：本面板局部垫一层柔光纸底防穿模 */}
          <div className="relative">
            <span aria-hidden className="absolute -inset-1 -z-10 rounded-2xl bg-[#f7f0df]/60 backdrop-blur-md" />
            <ArtPanel className="text-center">
              <img
                src="/ui/lantern.png"
                alt=""
                className="idle-bob mx-auto mb-1 h-12 w-auto object-contain drop-shadow"
              />
            <p className="title-ink text-2xl">一题错，本局结束</p>
            <div className="ink-divider mx-auto mt-2.5 max-w-[15rem]" aria-hidden>
              <span className="font-display text-[9px]">◈</span>
            </div>
            <p className="mt-2 text-sm tracking-widest text-ink-soft">
              {`历史最高连对 ${save.endlessBestStreak} · 历史最高分 ${best}`}
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
          <p className="caption-pill mx-auto mt-3">
            每答对一题涨诗气 · 诗气满额外加分
          </p>
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
      <Stage bg={GAME_BACKGROUNDS.endless}>
        <StageHud title="无尽模式" backTo="/" />
        <div className="absolute inset-x-3 inset-y-0 z-10 flex translate-y-[1.5dvh] flex-col justify-center pb-[max(1rem,env(safe-area-inset-bottom))]">
          <ArtPanel className="text-center">
            <p className="title-ink text-2xl">本局结束</p>
            <p className="title-ink mt-1 text-5xl">{view.streak}</p>
            <p className="text-sm tracking-widest text-ink-soft">本局连对</p>
            <p className="mt-1 flex items-baseline justify-center gap-2">
              <span className="text-xs tracking-widest text-ink-soft">本局得分</span>
              <span className="title-ink text-3xl">{view.score}</span>
              {newRecord ? (
                <span className="stamp-in rounded bg-seal px-1.5 py-0.5 text-[10px] tracking-wider text-paper">刷新纪录</span>
              ) : null}
            </p>
            <p className="mt-1 text-[11px] tracking-wider text-ink/60">
              {`历史最高 连对 ${bestStreak} · ${bestScore} 分`}
            </p>
            <div className="mt-4 flex justify-center gap-3">
              <Link to="/" className="tap">
                <PlaqueFace>回首页</PlaqueFace>
              </Link>
              <PlaqueButton onClick={restartRun}>再来一局</PlaqueButton>
            </div>
          </ArtPanel>
        </div>
      </Stage>
    );
  }

  return (
    <Stage bg={GAME_BACKGROUNDS.endless}>
      <StageHud title="无尽模式" backTo="/" />
      <div className="absolute inset-x-0 top-[max(3.8rem,calc(env(safe-area-inset-top)+3.4rem))] z-10 flex items-center justify-center gap-2">
        <span className="ink-chip paper-glow px-3 py-1 text-[11px] tracking-[0.3em] text-paper/95">
          连对 <span key={streak} className="combo-bump inline-block text-[#b9e2d2]">{streak}</span>
        </span>
        <span className="ink-chip paper-glow px-3 py-1 text-[11px] tracking-[0.3em] text-paper/95">
          <span className="text-[#e6c98a]">{score}</span> 分
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="诗气"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={qi}
        className="absolute inset-x-8 top-[max(6.4rem,calc(env(safe-area-inset-top)+6rem))] z-10 h-2 overflow-hidden rounded-full bg-paper/25 shadow-[inset_0_1px_2px_rgb(28_23_18/30%)]"
      >
        <div className="qi-fill qi-flow h-full rounded-full bg-seal" style={{ width: `${qi}%` }} />
      </div>

      {/* 唐小诗情绪位：答对欢呼、答错沮丧，与环游答题同款反馈 */}
      <div className="absolute inset-x-0 bottom-[33%] z-10 flex justify-center">
        <div className="relative flex h-28 items-end justify-center">
          <span className="sprite-shadow" />
          <img
            src={pose === "happy" ? HERO.happy : pose === "sad" ? HERO.sad : HERO.idle}
            alt=""
            key={mood}
            onError={(e) => {
              e.currentTarget.style.visibility = "hidden";
            }}
            className={`relative z-10 h-28 w-auto object-contain object-bottom drop-shadow-lg ${
              pose === "happy" ? "mood-happy" : pose === "sad" ? "mood-sad" : "idle-bob"
            }`}
          />
        </div>
      </div>

      {floatText && phase === "report" ? (
        <p
          aria-hidden
          className={`float-glyph pointer-events-none absolute left-1/2 z-30 -translate-x-1/2 font-display text-2xl ${
            resolution?.correct ? "text-pine" : "text-seal"
          }`}
          style={{
            bottom: picked !== null
              ? `calc(max(0.5rem, env(safe-area-inset-bottom)) + ${(3 - picked) * 3.3 + 4.2}rem)`
              : "46%",
          }}
        >
          {floatText}
        </p>
      ) : null}

      {question && (phase === "battle" || phase === "report") ? (
        <section
          className={`absolute inset-x-0 bottom-0 z-20 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 ${
            phase === "report" ? "slip-fade-back pointer-events-none" : "pop-in"
          }`}
          key={question.id ?? index}
        >
          {/* 题干宣纸笺：与关卡答题同款纸面语言 */}
          <div className="question-plate ink-in mx-auto mb-2 w-full max-w-[26rem] px-4 py-2 text-center">
            <p className="title-art text-center text-[clamp(1.15rem,5vw,1.5rem)] leading-snug text-ink">
              {question.quote || question.prompt}
            </p>
            <p className="mt-0.5 text-center text-sm tracking-wider text-ink-soft">
              {question.type === "title"
                ? "出自哪一首？"
                : question.type === "complete-next"
                  ? "的下一句是？"
                  : "的上一句是？"}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {question.choices.map((choice, i) => {
              const selected = picked === i;
              const right = i === question.answerIndex;
              let state: "idle" | "on" | "miss" = "idle";
              if (picked !== null && right) state = "on";
              else if (selected && !right) state = "miss";

              const isSelectedWrong = resolution !== null && selected && !right;
              const isCorrectChoice = resolution !== null && right;
              const feedbackClass = isSelectedWrong ? "slip-tremble" : isCorrectChoice ? "slip-reveal" : "";

              return (
                <div
                  key={`${question.id}-${choice}`}
                  className={`slip-in ${feedbackClass}`}
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <ChoiceSlip
                    text={choice}
                    state={state}
                    disabled={picked !== null}
                    mark={SLIP_MARKS[i]}
                    onClick={() => choose(i)}
                  />
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {phase === "report" && resolution ? (
        <section className="sheet-up absolute inset-x-2 bottom-[max(0.6rem,env(safe-area-inset-bottom))] z-30">
          <ArtPanel className="text-center">
            {resolution.correct ? (
              <>
                <p className="title-ink text-2xl">答对</p>
                <p className="mt-1 text-xs tracking-wider text-ink-soft">
                  {`连对 ${resolution.streakAfter} · +${resolution.scoreGain} 分 · 诗气 +${resolution.qiGain}`}
                </p>
              </>
            ) : (
              <>
                <p className="title-ink text-2xl">答错</p>
                <p className="poem-line mt-1 text-sm font-medium leading-snug text-pine">
                  {`正确是「${resolution.answerText}」`}
                </p>
                {resolution.context.map((line) => (
                  <p key={line} className="poem-line text-xs leading-snug text-ink-soft/70">
                    {line}
                  </p>
                ))}
                <p className="mt-0.5 text-xs tracking-wider text-ink-soft">
                  {resolution.streakBefore > 0 ? `连对 ${resolution.streakBefore} 中断` : "连对重新开始"}
                </p>
              </>
            )}
            <div className="mt-3 flex justify-center">
              <PlaqueButton onClick={continueAfterResolution}>
                {resolution.outcome === "next" ? "收句" : "看结果"}
              </PlaqueButton>
            </div>
          </ArtPanel>
        </section>
      ) : null}
    </Stage>
  );
}
