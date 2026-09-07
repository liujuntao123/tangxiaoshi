import { useEffect, useRef, useState } from "react";
import { authorById, chancesFor, passMark, shuffleQuestions } from "@/lib/game/content";
import { HERO } from "@/lib/game/content/meta";
import {
  applyPoemWin,
  poemContextFor,
  scoreForAnswer,
  starsForRun,
} from "@/lib/game/progress";
import type { Poem, PoemRunResult, Question, QuestionType, Stars } from "@/lib/game/types";
import { useSave } from "@/lib/game/save-context";
import { sfxHit, sfxHurt, sfxStamp, sfxTap, sfxWin } from "@/lib/game/sfx";
import { ChoiceSlip, PlaqueButton } from "./choice-slip";
import { HpPips } from "./hp-pips";
import { ArtPanel, PoetImg, Stage, StageHud } from "./stage";

export type QuizMode = "poem" | "practice";

/** 连续答对多少题获得一次连携（连携正确额外 +LINK_BONUS 分）。 */
const LINK_COMBO = 3;
/** 出招反馈时长（毫秒）：只影响报告出现节奏，不推进题目。 */
const SETTLE_MS = 500;

/** 选项序号印：甲乙丙丁，作答仪式感。 */
const SLIP_MARKS = ["甲", "乙", "丙", "丁"] as const;

/**
 * 一题的结算快照：报告层只读它，不再重算规则（玩法重做的 Resolution 模式）。
 * 回响诗签已随墨路远征移除（ADR-0018），这里只保留连携口径。
 */
type Resolution = {
  correct: boolean;
  pickedIndex: number;
  answerText: string;
  /** 题干原句/引用，用于报告层拼合完整诗联展示。 */
  prompt: string;
  /** 题型，决定上/下联拼接顺序与格式 */
  questionType: QuestionType;
  context: string[];
  lanternLost: boolean;
  lanternsLeft: number;
  linked: boolean;
  linkEarned: boolean;
  scoreGain: number;
  comboBefore: number;
  comboAfter: number;
  outcome: "next" | "win" | "lose" | "done";
};

/** 结算页快照：写入存档前先取旧记录，用于「新纪录 / 诗印提升」对比。 */
type ResultView = {
  won: boolean;
  /** practice 答完全部题（无失败概念），title 用「答完了」。 */
  finished: boolean;
  correct: number;
  stars: Stars;
  score: number;
  maxCombo: number;
  prevStars: Stars;
  prevScore: number;
  prevCombo: number;
  firstClear: boolean;
};

type Pose = "idle" | "happy" | "sad";
type Phase = "battle" | "resolving" | "result";

/**
 * 单张诗卡问答（docs/content-rules.md）：5 题，60% 及格，机会灯笼制。
 * - poem：诗集资料库进入的「修页」，通关写存档并评级诗印；
 * - practice：诗库自由练习，可先看答案，不写存档。
 * 主线闯关见 level-quiz.tsx（关卡制，ADR-0018）。
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
  const { save, patchSave } = useSave();
  const poemMode = mode === "poem";
  const total = poem.questions.length;
  const chances = chancesFor(total);
  const need = passMark(total);

  const [phase, setPhase] = useState<Phase>("battle");
  const [qIndex, setQIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);

  // —— 答题数值（连击/诗气/连携；灯笼数由 wrong 推算） ——
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [score, setScore] = useState(0);
  const [linkReady, setLinkReady] = useState(false);

  // —— 本题作答与视觉反馈 ——
  const [picked, setPicked] = useState<number | null>(null);
  const [resolution, setResolution] = useState<Resolution | null>(null);
  const [reportReady, setReportReady] = useState(false);
  const [pose, setPose] = useState<Pose>("idle");
  const [mood, setMood] = useState(0);
  const [floatText, setFloatText] = useState<string | null>(null);
  const [reveal, setReveal] = useState(false);
  // 守卷人呼应：答对时右侧作者立绘短暂作揖致意
  const [bowing, setBowing] = useState(false);

  // —— 结算 ——
  const [resultView, setResultView] = useState<ResultView | null>(null);

  // 题组每轮重洗一次；重试/再战由 restartRun 显式换新。
  const [deck, setDeck] = useState<Question[]>(() => shuffleQuestions(poem.questions));

  // 回合治理：回合 token + 定时器统一清理 + 同步互斥 + 存档只写一次。
  const runRef = useRef(0);
  const timersRef = useRef<number[]>([]);
  const finalRunRef = useRef<PoemRunResult | null>(null);
  const resultSavedRef = useRef(false);
  const busyRef = useRef(false);

  useEffect(() => {
    const timers = timersRef;
    return () => {
      for (const id of timers.current) window.clearTimeout(id);
      timers.current = [];
    };
  }, []);

  function clearTimers() {
    for (const id of timersRef.current) window.clearTimeout(id);
    timersRef.current = [];
  }

  function later(fn: () => void, ms: number) {
    const run = runRef.current;
    const id = window.setTimeout(() => {
      if (runRef.current !== run) return; // 回合已作废，旧回调不再改状态
      timersRef.current = timersRef.current.filter((item) => item !== id);
      fn();
    }, ms);
    timersRef.current.push(id);
  }

  const question: Question | undefined = qIndex < deck.length ? deck[qIndex] : undefined;

  // —— 作答：一次点击只结算一次；动画只做反馈，推进只由「收句」触发 ——
  function choose(choiceIndex: number) {
    if (busyRef.current) return;
    if (phase !== "battle" || !question || picked !== null || resolution) return;
    busyRef.current = true;

    // 微触觉（克制）：作答确认轻微振动
    try {
      navigator.vibrate?.(12);
    } catch {
      // 忽略不支持或受限环境
    }

    const correctPick = choiceIndex === question.answerIndex;
    const answerText = question.choices[question.answerIndex] ?? "";
    const done = qIndex + 1 >= deck.length;

    let res: Resolution;
    if (correctPick) {
      // 守卷人呼应：答对时右侧作者立绘短暂作揖致意 500ms
      setBowing(true);
      later(() => setBowing(false), 500);

      const linked = linkReady;
      const comboAfter = combo + 1;
      const scoreGain = scoreForAnswer({ combo: comboAfter, linked });
      const nextCorrect = correct + 1;
      const outcome: Resolution["outcome"] = !done
        ? "next"
        : !poemMode
          ? "done"
          : nextCorrect >= need
            ? "win"
            : "lose";
      res = {
        correct: true,
        pickedIndex: choiceIndex,
        answerText,
        prompt: question.quote || question.prompt,
        questionType: question.type,
        context: [],
        lanternLost: false,
        lanternsLeft: chances - wrong,
        linked,
        linkEarned: comboAfter % LINK_COMBO === 0,
        scoreGain,
        comboBefore: combo,
        comboAfter,
        outcome,
      };
      setCorrect(nextCorrect);
      setCombo(comboAfter);
      setMaxCombo(Math.max(maxCombo, comboAfter));
      setScore(score + scoreGain);
      setLinkReady(res.linkEarned);
      setFloatText(`+${scoreGain}`);
      if (outcome === "win") {
        finalRunRef.current = {
          poemId: poem.id,
          won: true,
          chancesLeft: chances - wrong,
          chancesTotal: chances,
          maxCombo: Math.max(maxCombo, comboAfter),
          score: score + scoreGain,
          mistakes: wrong,
        };
      }
    } else {
      const lanternsLeft = chances - (wrong + 1);
      const outcome: Resolution["outcome"] = done
        ? !poemMode
          ? "done"
          : correct >= need
            ? "win"
            : "lose"
        : poemMode && lanternsLeft <= 0
          ? "lose"
          : "next";

      res = {
        correct: false,
        pickedIndex: choiceIndex,
        answerText,
        prompt: question.quote || question.prompt,
        questionType: question.type,
        context: poemContextFor(poem, question),
        lanternLost: true,
        lanternsLeft,
        linked: false,
        linkEarned: false,
        scoreGain: 0,
        comboBefore: combo,
        comboAfter: 0,
        outcome,
      };
      setCombo(0);
      setLinkReady(false);
      setWrong(wrong + 1);
      setFloatText(poemMode ? "灭了一盏灯笼" : "连对中断");
    }

    setPicked(choiceIndex);
    setResolution(res);
    setReportReady(false);
    setPose(res.correct ? "happy" : "sad");
    setMood((n) => n + 1);
    if (res.correct) sfxHit();
    else sfxHurt();
    setPhase("resolving");

    // 只做反馈节奏，不推进题目；reportReady 后才出现「收句」。
    later(() => {
      setReportReady(true);
      if (res.outcome === "win") sfxWin();
    }, SETTLE_MS);
  }

  // —— 收句：唯一的题目推进入口 ——
  function continueAfterResolution() {
    const res = resolution;
    if (phase !== "resolving" || !res || !reportReady) return;
    if (!busyRef.current) return; // 与 choose 共用同一把互斥锁
    sfxTap();
    setPicked(null);
    setResolution(null);
    setReportReady(false);
    setReveal(false);
    setFloatText(null);
    setPose("idle");
    if (res.outcome === "next") {
      busyRef.current = false; // 回到 battle，允许下一题作答
      setQIndex((n) => n + 1);
      setPhase("battle");
      return;
    }
    enterResult(res);
  }

  // —— 结算：win 写一次存档（成绩 + 通关 + 成就）；lose/practice 不写 ——
  function enterResult(res: Resolution) {
    if (resultSavedRef.current) return;
    resultSavedRef.current = true;
    const won = res.outcome === "win";
    const run: PoemRunResult = finalRunRef.current ?? {
      poemId: poem.id,
      won,
      chancesLeft: Math.max(0, chances - wrong),
      chancesTotal: chances,
      maxCombo,
      score,
      mistakes: wrong,
    };
    const prevStars = save.poemRecords[poem.id]?.bestStars ?? 0;
    const prevScore = save.poemRecords[poem.id]?.bestScore ?? 0;
    const prevCombo = save.poemRecords[poem.id]?.bestCombo ?? 0;
    setResultView({
      won,
      finished: res.outcome !== "lose",
      // correct/wrong 状态在 choose 时已包含最后一题，这里只读快照。
      correct: correct + (res.correct ? 1 : 0),
      stars: starsForRun(run),
      score: run.score,
      maxCombo: run.maxCombo,
      prevStars,
      prevScore,
      prevCombo,
      firstClear: !save.clearedPoems.includes(poem.id),
    });
    setPhase("result");
    if (won) {
      void patchSave((current) => applyPoemWin(current, poem.id, run));
    }
  }

  // —— 再试/再战：作废旧回合，清空全部本轮临时状态 ——
  function restartRun() {
    runRef.current += 1;
    clearTimers();
    finalRunRef.current = null;
    resultSavedRef.current = false;
    busyRef.current = false;
    setPhase("battle");
    setQIndex(0);
    setCorrect(0);
    setWrong(0);
    setCombo(0);
    setMaxCombo(0);
    setScore(0);
    setLinkReady(false);
    setPicked(null);
    setResolution(null);
    setReportReady(false);
    setPose("idle");
    setBowing(false);
    setFloatText(null);
    setReveal(false);
    setResultView(null);
    setDeck(shuffleQuestions(poem.questions));
  }

  const questionNo = Math.min(qIndex + 1, total);
  const lanternsLeft = Math.max(0, chances - wrong);
  const bigLine = question?.quote ?? "";
  const ask = question
    ? question.type === "title"
      ? "出自哪一首？"
      : question.type === "complete-next"
        ? "的下一句是？"
        : "的上一句是？"
    : "";

  return (
    <Stage bg={poem.background} dim={phase === "result"}>
      <StageHud title={poemMode ? author.name : `${author.name}·练习`} backTo={backTo} />

      {poemMode ? (
        <p className="caption-pill absolute left-1/2 top-[max(7.2rem,calc(env(safe-area-inset-top)+6.8rem))] z-10 -translate-x-1/2 text-[10.5px]">
          {`${total} 道题 · 答对 ${need} 题通关 · 灯笼灭完本轮结束`}
        </p>
      ) : null}

      <div className="absolute inset-x-0 top-[max(3.6rem,calc(env(safe-area-inset-top)+3.2rem))] z-10 flex items-center justify-between gap-2 px-4">
        <div className="flex min-w-0 items-center gap-1.5">
          {poemMode ? (
            /* 灯笼行收进墨签：与右侧题号签同一套 HUD 语言 */
            <span className="ink-chip paper-glow flex items-center gap-1.5 px-2.5 py-1">
              <HpPips value={lanternsLeft} label="灯笼" max={chances} />
            </span>
          ) : (
            <span className="ink-chip paper-glow px-3 py-1 text-[11px] tracking-[0.3em] text-paper/95">练习</span>
          )}
        </div>
        <span className="ink-chip paper-glow shrink-0 px-3 py-1 text-[11px] tracking-[0.3em] text-paper/95">
          第 {questionNo} / {total} 题
        </span>
      </div>

      {poemMode && (phase === "battle" || phase === "resolving") ? <QuizHud combo={combo} linkReady={linkReady} /> : null}

      {/* 双人位：左唐小诗（情绪形态），右作者（单一立绘，只出题） */}
      <div className="absolute inset-x-0 bottom-[42%] z-10 flex items-end justify-between px-2">
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
            <div className={`relative z-10 flex items-end justify-center ${bowing ? "bow" : ""}`}>
              <PoetImg
                src={author.portrait}
                className="h-40 w-auto -scale-x-100 object-contain object-bottom drop-shadow-lg"
              />
            </div>
          </div>
        </div>
      </div>

      {floatText && phase === "resolving" ? (
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

      {(phase === "battle" || phase === "resolving") && question ? (
        <section
          key={question.id}
          className={`absolute inset-x-0 bottom-0 z-20 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 ${
            phase === "resolving" && reportReady ? "slip-fade-back pointer-events-none" : "pop-in"
          }`}
        >
          {/* 题干宣纸笺：与关卡答题同款纸面语言，任何场景上都稳定可读 */}
          <div className="question-plate ink-in mx-auto mb-2 w-full max-w-[26rem] px-4 py-2 text-center">
            {bigLine ? (
              <p className="title-art text-center text-[clamp(1.15rem,5vw,1.5rem)] leading-snug text-ink">
                {bigLine}
              </p>
            ) : null}
            <p className="mt-0.5 text-center text-sm tracking-wider text-ink-soft">{ask}</p>
          </div>
          <div className="flex flex-col gap-2">
            {question.choices.map((choice, index) => {
              const selected = picked === index;
              const right = index === question.answerIndex;
              let state: "idle" | "on" | "miss" = "idle";
              if ((picked !== null && right) || (reveal && right)) state = "on";
              else if (selected && !right) state = "miss";

              const isSelectedWrong = resolution !== null && selected && !right;
              const isCorrectChoice = resolution !== null && right;
              const feedbackClass = isSelectedWrong ? "slip-tremble" : isCorrectChoice ? "slip-reveal" : "";

              return (
                <div
                  key={`${question.id}-${choice}`}
                  className={`slip-in ${feedbackClass}`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <ChoiceSlip
                    text={choice}
                    state={state}
                    disabled={picked !== null}
                    mark={SLIP_MARKS[index]}
                    onClick={() => choose(index)}
                  />
                </div>
              );
            })}
          </div>
          {!poemMode ? (
            <button
              type="button"
              className="tap ink-chip paper-glow mx-auto mt-1 block px-4 py-1 text-xs tracking-widest text-paper/90"
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

      {phase === "resolving" && resolution && reportReady ? (
        <ReportPanel res={resolution} poemMode={poemMode} onContinue={continueAfterResolution} />
      ) : null}

      {phase === "result" && resultView ? (
        <ResultPanel
          view={resultView}
          total={total}
          need={need}
          poemText={poem.text}
          onReplay={restartRun}
          onExit={() => {
            sfxTap();
            onExit();
          }}
        />
      ) : null}
    </Stage>
  );
}

/** 答题 HUD：连击与连携就绪提示（一行）。 */
function QuizHud({ combo, linkReady }: { combo: number; linkReady: boolean }) {
  // 连击为 0 且连携未就绪时不占位：把左上角还给灯笼行，画面更干净
  if (combo <= 0 && !linkReady) return null;
  return (
    <div className="absolute left-3 top-[max(5.6rem,calc(env(safe-area-inset-top)+5.2rem))] z-10 flex max-w-[75%] items-center gap-2">
      <span className="ink-chip paper-glow shrink-0 px-2.5 py-1 text-[11px] tracking-wider text-paper/95" aria-label={`连击 ${combo}`}>
        连击{" "}
        <span key={combo} className="combo-ripple inline-block">
          <span className="combo-bump inline-block">×{combo}</span>
        </span>
      </span>
      {linkReady ? (
        <span className="ink-chip paper-glow px-2.5 py-1 text-[10px] tracking-wider text-paper/90">连携已就绪 · 下次答对额外加分</span>
      ) : null}
    </div>
  );
}

/** resolving 报告层：对错、连击/诗气变化；诗卡模式把答错讲成「灭了一盏灯笼」。 */
function ReportPanel({
  res,
  poemMode,
  onContinue,
}: {
  res: Resolution;
  poemMode: boolean;
  onContinue: () => void;
}) {
  const fullPoemCouplet =
    res.questionType === "complete-next"
      ? `「${res.prompt}，${res.answerText}」`
      : res.questionType === "complete-prev"
        ? `「${res.answerText}，${res.prompt}」`
        : `「${res.answerText}」`;

  return (
    <section className="sheet-up absolute inset-x-2 bottom-[max(0.6rem,env(safe-area-inset-bottom))] z-30">
      <ArtPanel className="text-center">
        {res.correct ? (
          <>
            <p className="title-ink text-2xl">答对了</p>
            {/* 完整诗联展示：深墨大字 serif */}
            <p className="poem-line mt-1 text-base font-medium leading-snug text-ink">{fullPoemCouplet}</p>
            <p className="mt-1 text-xs tracking-wider text-ink-soft">
              连击 ×{res.comboAfter} · +{res.scoreGain} 分
            </p>
            {res.linkEarned && !res.linked ? (
              <p className="mt-0.5 text-xs tracking-wider text-pine">连携已就绪！下次正确额外加分</p>
            ) : null}
            {res.linked ? <p className="mt-0.5 text-xs tracking-wider text-pine">连携出手！额外 +100 分</p> : null}
          </>
        ) : (
          <>
            <p className="title-ink text-2xl">
              答错
              {poemMode ? (
                <span className="ml-2 text-base text-seal">灭了一盏灯笼，还剩 {res.lanternsLeft} 盏</span>
              ) : null}
            </p>
            {/* 答错时正确答案以松绿强调，原上下文弱化显示 */}
            <p className="poem-line mt-1 text-sm font-medium leading-snug text-pine">正确是「{res.answerText}」</p>
            {res.context.map((line) => (
              <p key={line} className="poem-line text-xs leading-snug text-ink-soft/70">
                {line}
              </p>
            ))}
            <p className="mt-0.5 text-xs tracking-wider text-ink-soft">
              {res.comboBefore > 0 ? `连击 ×${res.comboBefore} 中断` : "连击重新开始"}
            </p>
          </>
        )}
        <div className="mt-3 flex justify-center">
          <PlaqueButton onClick={onContinue}>{res.outcome === "next" ? "下一题" : "看结果"}</PlaqueButton>
        </div>
      </ArtPanel>
    </section>
  );
}

/**
 * 结算页：诗印/得分/最高连击与整诗原文；练习模式不写存档，只给对题数与原文。
 */
function ResultPanel({
  view,
  total,
  need,
  poemText,
  onReplay,
  onExit,
}: {
  view: ResultView;
  total: number;
  need: number;
  poemText: string;
  onReplay: () => void;
  onExit: () => void;
}) {
  const bestStars = Math.max(view.prevStars, view.stars);
  const bestScore = Math.max(view.prevScore, view.score);
  const bestCombo = Math.max(view.prevCombo, view.maxCombo);
  const scoreRecord = view.score > view.prevScore && view.score > 0;
  const starsRecord = view.stars > view.prevStars;
  const title = view.won ? "通关" : view.finished ? "答完了" : "差一点";

  useEffect(() => {
    // 诗印落印仪式：通关首次展示诗印时触发沉稳顿章声与微触觉反馈
    if (view.won) {
      sfxStamp();
      try {
        navigator.vibrate?.([20, 30, 20]);
      } catch {
        // 忽略不支持
      }
    }
  }, [view.won]);

  return (
    <section className="pop-in absolute inset-x-2 bottom-[max(1rem,env(safe-area-inset-bottom))] z-20">
      <ArtPanel className="text-center">
        <div className="max-h-[64dvh] overflow-y-auto">
          <p className="title-ink text-3xl">{title}</p>
          {view.won ? (
            <div className="mt-2 flex justify-center gap-2" aria-label={`诗印 ${view.stars} 枚`}>
              {[1, 2, 3].map((n) => (
                <span
                  key={n}
                  style={{ animationDelay: `${(n - 1) * 160}ms` }}
                  className={`seal-pop grid h-9 w-9 place-items-center rounded-full border-2 font-display leading-none ${
                    n <= view.stars ? "border-seal bg-seal text-paper" : "border-ink/20 text-ink/25"
                  }`}
                >
                  印
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-1 text-sm text-ink-soft">
              {view.finished
                ? `一共 ${total} 题，答对了 ${view.correct} 题。`
                : `答对 ${need} 题通关，这次答对了 ${view.correct} 题。`}
            </p>
          )}
          {view.won ? (
            <>
              {starsRecord || view.firstClear ? (
                <p className="mt-1 text-[11px] tracking-wider text-seal">
                  {starsRecord ? "诗印提升！" : ""}
                  {starsRecord && view.firstClear ? " · " : ""}
                  {view.firstClear ? "首次通关" : ""}
                </p>
              ) : null}
              <div className="ink-divider mx-auto mt-2.5 max-w-[13rem]" aria-hidden>
                <span className="font-display text-[9px]">◈</span>
              </div>
              <p className="mt-2 flex items-baseline justify-center gap-2">
                <span className="text-xs tracking-widest text-ink-soft">本轮得分</span>
                <span className="title-ink text-4xl">{view.score}</span>
                {scoreRecord ? (
                  <span className="stamp-in rounded bg-seal px-1.5 py-0.5 text-[10px] tracking-wider text-paper">新纪录</span>
                ) : null}
              </p>
              <p className="mt-0.5 text-[11px] tracking-wider text-ink/60">
                历史最佳 {bestStars} 印 · {bestScore} 分 · 连击 ×{bestCombo}
              </p>
            </>
          ) : null}
          <div className="ink-divider mx-auto mt-2.5 max-w-[13rem]" aria-hidden>
            <span className="font-display text-[9px]">诗</span>
          </div>
          <p className="mx-auto mt-2 max-w-[26em] whitespace-pre-wrap text-left text-[13px] leading-relaxed text-ink-soft">
            {poemText}
          </p>
          <div className="mt-3 flex justify-center gap-3">
            {!view.won ? <PlaqueButton onClick={onReplay}>再试一次</PlaqueButton> : null}
            {view.won ? <PlaqueButton onClick={onExit}>收下诗卡</PlaqueButton> : null}
            <PlaqueButton onClick={view.won ? onReplay : onExit}>{view.won ? "再战提分" : "返回"}</PlaqueButton>
          </div>
        </div>
      </ArtPanel>
    </section>
  );
}
