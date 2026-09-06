import { useEffect, useRef, useState } from "react";
import { HERO } from "@/lib/game/content/meta";
import { poemContextFor, scoreForAnswer } from "@/lib/game/progress";
import {
  ITEM_DEFS,
  LEVEL_COUNT,
  LEVEL_PASS,
  applyLevelResult,
  type LevelPlan,
  type PlanQuestion,
} from "@/lib/game/levels";
import type { Inventory, ItemId, QuestionType, Stars } from "@/lib/game/types";
import { useSave } from "@/lib/game/save-context";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { sfxHit, sfxHurt, sfxStamp, sfxTap, sfxWin } from "@/lib/game/sfx";
import { ChoiceSlip, PlaqueButton } from "./choice-slip";
import { ArtPanel, Stage, StageHud } from "./stage";

/**
 * 关卡答题场（ADR-0018）：一关 10 题，答对 6 题过关。
 * - 题目来自玩家专属计划（plan），本关内容固定，重试不换题；
 * - 道具是持久库存：去伪 / 双倍在作答前主动使用，补答在答错后换题补位；
 * - 结算写存档：星级只升不降，每颗新星奖励 1 个道具。
 */

const SETTLE_MS = 450;

/** 选项序号印：甲乙丙丁，作答仪式感。 */
const SLIP_MARKS = ["甲", "乙", "丙", "丁"] as const;

type Phase = "intro" | "battle" | "resolving" | "result";

/** 一题的结算快照：报告层只读它，不重算规则。 */
type Resolution = {
  correct: boolean;
  pickedIndex: number;
  answerText: string;
  /** 补全题单独展示的引用句。 */
  prompt: string;
  questionType: QuestionType;
  context: string[];
  /** 本题是否被「补答」撤下（不计入 10 题）。 */
  replaced: boolean;
  doubleApplied: boolean;
  scoreGain: number;
  comboAfter: number;
  outcome: "next" | "finish";
};

/** 结算页快照。 */
type LevelResult = {
  won: boolean;
  correct: number;
  wrong: number;
  score: number;
  maxCombo: number;
  stars: Stars;
  prevStars: Stars;
  granted: ItemId[];
};

export function LevelQuiz({
  level,
  plan,
  onExit,
  onNextLevel,
}: {
  level: number;
  plan: LevelPlan;
  onExit: () => void;
  /** 过关后「下一关」：由路由层跳到 level+1。 */
  onNextLevel: () => void;
}) {
  const { save, patchSave } = useSave();
  const user = useCurrentUser();
  const userId = user?.id ?? "dev-user";
  const inventory = save.items;

  const [phase, setPhase] = useState<Phase>("intro");
  const [current, setCurrent] = useState<PlanQuestion>(plan.questions[0] as PlanQuestion);
  const [filled, setFilled] = useState(0); // 已计分题数（0..10）
  const [results, setResults] = useState<("correct" | "wrong" | "replaced")[]>([]);
  // 下一道待出的主线题 / 备用题下标（questions[0] 已是 current，所以主线从 1 起）
  const [nextMain, setNextMain] = useState(1);
  const [nextSpare, setNextSpare] = useState(0);

  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [score, setScore] = useState(0);

  // 道具的局内状态
  const [doubleArmed, setDoubleArmed] = useState(false);
  const [revealUsed, setRevealUsed] = useState(false);
  const [hiddenChoices, setHiddenChoices] = useState<number[]>([]);

  const [picked, setPicked] = useState<number | null>(null);
  const [resolution, setResolution] = useState<Resolution | null>(null);
  const [reportReady, setReportReady] = useState(false);
  const [floatText, setFloatText] = useState<string | null>(null);
  const [pose, setPose] = useState<"idle" | "happy" | "sad">("idle");
  const [result, setResult] = useState<LevelResult | null>(null);

  // 回合治理：结算只写一次存档；定时器统一清理。
  const runRef = useRef(0);
  const timersRef = useRef<number[]>([]);
  const finishedRef = useRef(false);
  useEffect(() => {
    const timers = timersRef;
    return () => {
      for (const id of timers.current) window.clearTimeout(id);
    };
  }, []);

  function later(fn: () => void, ms: number) {
    const run = runRef.current;
    const id = window.setTimeout(() => {
      if (runRef.current !== run) return;
      timersRef.current = timersRef.current.filter((item) => item !== id);
      fn();
    }, ms);
    timersRef.current.push(id);
  }

  const question = current.question;
  const poem = current.poem;

  function useReveal() {
    if (phase !== "battle" || revealUsed || !question) return;
    const wrongs = [0, 1, 2, 3].filter((index) => index !== question.answerIndex);
    for (let i = wrongs.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const a = wrongs[i];
      const b = wrongs[j];
      if (a === undefined || b === undefined) continue;
      wrongs[i] = b;
      wrongs[j] = a;
    }
    setHiddenChoices(wrongs.slice(0, 2));
    setRevealUsed(true);
    consumeItem("reveal");
    sfxTap();
  }

  function useDouble() {
    if (phase !== "battle" || doubleArmed || inventory.double <= 0) return;
    setDoubleArmed(true);
    consumeItem("double");
    sfxTap();
  }

  /** 道具消耗即时落存档：用了就是用了，刷新不回滚。 */
  function consumeItem(item: ItemId) {
    void patchSave((currentSave) => ({
      ...currentSave,
      items: { ...currentSave.items, [item]: Math.max(0, currentSave.items[item] - 1) },
    }));
  }

  function choose(choiceIndex: number) {
    if (phase !== "battle" || !question || picked !== null || resolution) return;

    const correctPick = choiceIndex === question.answerIndex;
    const answerText = question.choices[question.answerIndex] ?? "";
    const nextFilled = filled + 1;
    const finish = nextFilled >= 10;

    let res: Resolution;
    if (correctPick) {
      const doubleApplied = doubleArmed;
      const comboAfter = combo + 1;
      const scoreGain = scoreForAnswer({ combo: comboAfter }) * (doubleApplied ? 2 : 1);
      res = {
        correct: true,
        pickedIndex: choiceIndex,
        answerText,
        prompt: question.quote || question.prompt,
        questionType: question.type,
        context: [],
        replaced: false,
        doubleApplied,
        scoreGain,
        comboAfter,
        outcome: finish ? "finish" : "next",
      };
      setCorrect((n) => n + 1);
      setCombo(comboAfter);
      setMaxCombo((n) => Math.max(n, comboAfter));
      setScore((n) => n + scoreGain);
      setDoubleArmed(false); // 双倍在这次答对时消耗
      setFloatText(`+${scoreGain}`);
    } else {
      res = {
        correct: false,
        pickedIndex: choiceIndex,
        answerText,
        prompt: question.quote || question.prompt,
        questionType: question.type,
        context: poemContextFor(poem, question),
        replaced: false,
        doubleApplied: false,
        scoreGain: 0,
        comboAfter: 0,
        outcome: finish ? "finish" : "next",
      };
      setCombo(0);
      setWrong((n) => n + 1);
      setFloatText("答错了");
      try {
        navigator.vibrate?.(35);
      } catch {
        // 忽略不支持的环境
      }
    }

    setFilled(nextFilled);
    setResults((list) => [...list, correctPick ? "correct" : "wrong"]);
    setPicked(choiceIndex);
    setResolution(res);
    setReportReady(false);
    setPose(res.correct ? "happy" : "sad");
    if (res.correct) sfxHit();
    else sfxHurt();
    setPhase("resolving");
    later(() => {
      setReportReady(true);
      if (finish) sfxWin();
    }, SETTLE_MS);
  }

  /** 收句：推进到下一题或进入结算。 */
  function continueAfterResolution() {
    const res = resolution;
    if (phase !== "resolving" || !res || !reportReady) return;
    sfxTap();
    if (res.outcome === "finish") {
      enterResult();
      return;
    }
    advanceTo(res.replaced ? "replaced" : "counted");
  }

  /** 用补答：本题撤下不计，立刻换备用题。 */
  function replaceWithSpare() {
    const res = resolution;
    if (phase !== "resolving" || !res || res.correct || nextSpare >= plan.spares.length) return;
    if (inventory.redo <= 0) return;
    consumeItem("redo");
    sfxTap();
    // 撤下的题不计分：回填进度与答错计数
    setFilled((n) => Math.max(0, n - 1));
    setWrong((n) => Math.max(0, n - 1));
    setResults((list) => {
      const next = [...list];
      next[next.length - 1] = "replaced";
      return next;
    });
    advanceTo("replaced");
  }

  /** 出下一道题：补答换题先出备用题，否则按主线顺序。 */
  function advanceTo(kind: "counted" | "replaced") {
    setPicked(null);
    setResolution(null);
    setReportReady(false);
    setHiddenChoices([]);
    setRevealUsed(false);
    setFloatText(null);
    setPose("idle");
    if (kind === "replaced") {
      const spare = plan.spares[nextSpare];
      setNextSpare((n) => n + 1);
      if (!spare) {
        enterResult();
        return;
      }
      setCurrent(spare);
    } else {
      const main = plan.questions[nextMain];
      setNextMain((n) => n + 1);
      if (!main) {
        enterResult();
        return;
      }
      setCurrent(main);
    }
    setPhase("battle");
  }

  /** 结算：写一次存档（星级 + 道具奖励 + 总分），基于最新存档计算。 */
  function enterResult() {
    if (finishedRef.current) return;
    finishedRef.current = true;
    runRef.current += 1;
    for (const id of timersRef.current) window.clearTimeout(id);
    timersRef.current = [];
    const won = correct >= LEVEL_PASS;
    const outcome = { level, won, mistakes: wrong, score };
    let delta = { prevStars: 0, stars: 0, granted: [] as ItemId[], save };
    void patchSave((currentSave) => {
      delta = applyLevelResult(currentSave, userId, outcome);
      return delta.save;
    });
    setResult({
      won,
      correct,
      wrong,
      score,
      maxCombo,
      stars: delta.stars as Stars,
      prevStars: delta.prevStars as Stars,
      granted: delta.granted,
    });
    setPhase("result");
    if (won) {
      sfxStamp();
      try {
        navigator.vibrate?.([20, 30, 20]);
      } catch {
        // 忽略不支持的环境
      }
    }
  }

  /** 再试一次：本关题目固定，重置状态即可重打同一份题。 */
  function retry() {
    sfxTap();
    finishedRef.current = false;
    setCurrent(plan.questions[0] as PlanQuestion);
    setFilled(0);
    setResults([]);
    setNextMain(1);
    setNextSpare(0);
    setCorrect(0);
    setWrong(0);
    setCombo(0);
    setMaxCombo(0);
    setScore(0);
    setDoubleArmed(false);
    setRevealUsed(false);
    setHiddenChoices([]);
    setPicked(null);
    setResolution(null);
    setReportReady(false);
    setFloatText(null);
    setPose("idle");
    setResult(null);
    setPhase("intro");
  }

  const questionNo = Math.min(filled + 1, 10);
  const bigLine = question?.quote ?? "";
  const ask = question
    ? question.type === "title"
      ? "出自哪一首？"
      : question.type === "complete-next"
        ? "的下一句是？"
        : "的上一句是？"
    : "";

  return (
    <Stage bg={phase === "intro" || phase === "result" ? poem.background || "/art/bg/home.png" : poem.background} dim={phase === "result"}>
      <StageHud title={`第 ${level} 关`} backTo="/levels" />

      {phase === "intro" ? (
        <IntroPanel
          level={level}
          inventory={inventory}
          onStart={() => {
            sfxTap();
            setPhase("battle");
          }}
        />
      ) : null}

      {(phase === "battle" || phase === "resolving") && question ? (
        <>
          {/* 顶部：题号 + 对错进度点 + 连击（答对/答错数字用松绿/朱砂淡色计读） */}
          <div className="absolute inset-x-0 top-[max(3.6rem,calc(env(safe-area-inset-top)+3.2rem))] z-10 flex flex-col items-center gap-1.5 px-4">
            <div className="flex items-center gap-2">
              <span className="ink-chip paper-glow px-3 py-1 text-[11px] tracking-[0.25em] text-paper/95">
                第 {questionNo} / 10 题
              </span>
              <span className="ink-chip paper-glow px-3 py-1 text-[11px] tracking-wider text-paper/95">
                答对 <span className="text-[#b9e2d2]">{correct}</span> · 答错{" "}
                <span className="text-[#f0b3a8]">{wrong}</span>
              </span>
              {combo > 1 ? (
                <span className="ink-chip paper-glow px-2.5 py-1 text-[11px] tracking-wider text-paper/95">
                  <span key={combo} className="combo-bump inline-block">连击 ×{combo}</span>
                </span>
              ) : null}
            </div>
            <ProgressDots results={results} active={filled} />
          </div>

          {/* 道具行：持有的道具在这里直接用 */}
          <div className="absolute inset-x-0 top-[max(6.6rem,calc(env(safe-area-inset-top)+6.2rem))] z-10 flex justify-center gap-2">
            <ItemChip
              item="reveal"
              count={inventory.reveal}
              disabled={revealUsed}
              label={revealUsed ? "排除·已用" : undefined}
              onClick={useReveal}
            />
            <ItemChip
              item="double"
              count={inventory.double}
              disabled={doubleArmed}
              label={doubleArmed ? "双倍·已就绪" : undefined}
              onClick={useDouble}
            />
          </div>

          {/* 唐小诗（情绪形态）：靠上居中，与题卡留出呼吸空间 */}
          <div className="absolute inset-x-0 top-[max(9.2rem,calc(env(safe-area-inset-top)+8.8rem))] z-10 flex justify-center">
            <div className="relative flex h-28 items-end justify-center">
              <span className="sprite-shadow" />
              <img
                src={pose === "happy" ? HERO.happy : pose === "sad" ? HERO.sad : HERO.idle}
                alt=""
                onError={(e) => {
                  e.currentTarget.style.visibility = "hidden";
                }}
                className={`relative z-10 h-28 w-auto object-contain object-bottom drop-shadow-lg ${
                  pose === "happy" ? "mood-happy" : pose === "sad" ? "mood-sad" : "idle-bob"
                }`}
              />
            </div>
          </div>

          {floatText && phase === "resolving" ? (
            <p
              aria-hidden
              className={`float-glyph pointer-events-none absolute left-1/2 z-30 -translate-x-1/2 font-display text-2xl ${
                resolution?.correct ? "text-pine" : "text-seal"
              }`}
              style={{ bottom: "46%" }}
            >
              {floatText}
            </p>
          ) : null}

          <section
            key={question.id}
            className={`absolute inset-x-0 bottom-0 z-20 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 ${
              phase === "resolving" && reportReady ? "slip-fade-back pointer-events-none" : "pop-in"
            }`}
          >
            {/* 题干宣纸笺：米纸底 + 墨字，出处一并入笺，任何场景上都稳定可读 */}
            <div className="question-plate ink-in mx-auto mb-2 w-full max-w-[26rem] px-4 py-2 text-center">
              {bigLine ? (
                <p className="title-art text-center text-[clamp(1.15rem,5vw,1.5rem)] leading-snug text-ink">
                  {bigLine}
                </p>
              ) : null}
              <p className="mt-0.5 text-center text-sm tracking-wider text-ink-soft">{ask}</p>
              {question.type !== "title" ? (
                <p className="poem-line mt-0.5 text-center text-[11px] text-ink-soft/75">
                  「{poem.title}」·{poem.authorName}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-2">
              {question.choices.map((choice, index) => {
                if (hiddenChoices.includes(index)) {
                  return (
                    <div key={`${question.id}-hidden-${index}`} className="slip-in opacity-35">
                      <ChoiceSlip text="" state="idle" disabled />
                    </div>
                  );
                }
                const selected = picked === index;
                const right = index === question.answerIndex;
                let state: "idle" | "on" | "miss" = "idle";
                if (picked !== null && right) state = "on";
                else if (selected && !right) state = "miss";
                return (
                  <div key={`${question.id}-${choice}`} className="slip-in" style={{ animationDelay: `${index * 50}ms` }}>
                    <ChoiceSlip text={choice} state={state} disabled={picked !== null} mark={SLIP_MARKS[index]} onClick={() => choose(index)} />
                  </div>
                );
              })}
            </div>
          </section>

          {phase === "resolving" && resolution && reportReady ? (
            <ReportPanel
              res={resolution}
              poemTitle={poem.title}
              authorName={poem.authorName}
              redoCount={inventory.redo}
              canRedo={nextSpare < plan.spares.length}
              onContinue={continueAfterResolution}
              onRedo={replaceWithSpare}
            />
          ) : null}
        </>
      ) : null}

      {phase === "result" && result ? (
        <ResultPanel
          result={result}
          hasNext={level < LEVEL_COUNT}
          onRetry={retry}
          onNext={() => {
            sfxTap();
            onNextLevel();
          }}
          onExit={onExit}
        />
      ) : null}
    </Stage>
  );
}

/** 十个小圆点：本关每题的对错一眼可见。 */
function ProgressDots({ results, active }: { results: ("correct" | "wrong" | "replaced")[]; active: number }) {
  return (
    <div className="flex items-center gap-1" aria-label={`已答 ${results.length} 题`}>
      {Array.from({ length: 10 }, (_, i) => {
        const state = results[i];
        const cls =
          state === "correct"
            ? "bg-pine"
            : state === "wrong"
              ? "bg-seal"
              : state === "replaced"
                ? "bg-paper/30"
                : i === active
                  ? "bg-paper/80 jdot-current"
                  : "bg-paper/25";
        return <span key={i} className={`h-1.5 w-4 rounded-full ${cls}`} />;
      })}
    </div>
  );
}

/** 道具按钮：数量为 0 时整颗隐藏，保持界面只有能用的东西。 */
function ItemChip({
  item,
  count,
  disabled,
  label,
  onClick,
}: {
  item: ItemId;
  count: number;
  disabled?: boolean;
  label?: string;
  onClick: () => void;
}) {
  if (count <= 0 && !label) return null;
  const def = ITEM_DEFS[item];
  const showCount = count > 0;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || !showCount}
      className="tap ink-chip paper-glow px-2.5 py-1 text-[11px] tracking-wider text-paper/95 disabled:opacity-60"
      title={def.desc}
    >
      {label ?? `${def.name} ×${count}`}
    </button>
  );
}

/** 开场说明：把过关线、星级和道具规则一次讲清楚。 */
function IntroPanel({
  level,
  inventory,
  onStart,
}: {
  level: number;
  inventory: Inventory;
  onStart: () => void;
}) {
  const ownedItems = (["reveal", "redo", "double"] as ItemId[]).filter((item) => inventory[item] > 0);
  return (
    <section className="pop-in absolute inset-x-3 bottom-[max(1rem,env(safe-area-inset-bottom))] z-20">
      <ArtPanel className="text-center">
        <p className="title-ink text-3xl">{`第 ${level} 关`}</p>
        {/* 三星预览：实心=可冲星档，给「开打前」一个具体目标 */}
        <div className="mt-1.5 flex justify-center gap-1.5" aria-label="星档：最高三星">
          {[1, 2, 3].map((n) => (
            <img
              key={n}
              src="/ui/icon-star.png"
              alt=""
              className="h-6 w-6 object-contain opacity-90 drop-shadow"
            />
          ))}
        </div>
        <div className="ink-divider mx-auto mt-2 max-w-[13rem]" aria-hidden>
          <span className="font-display text-[9px]">◈</span>
        </div>
        <p className="mt-2 text-sm text-ink-soft">10 道题，答对 6 题过关。</p>
        <p className="mt-0.5 text-xs tracking-wider text-ink/60">
          一道不错 = 三星 · 错 1–2 题 = 两星 · 过关 = 一星
        </p>
        {ownedItems.length > 0 ? (
          <p className="mx-auto mt-2 max-w-[24em] rounded-lg bg-ink/5 px-3 py-2 text-[11.5px] leading-relaxed text-ink-soft">
            本关道具：
            {ownedItems.map((item) => `${ITEM_DEFS[item].name}×${inventory[item]}（${ITEM_DEFS[item].desc}）`).join("、")}
          </p>
        ) : null}
        <div className="mt-3 flex justify-center">
          <PlaqueButton onClick={onStart}>开始答题</PlaqueButton>
        </div>
      </ArtPanel>
    </section>
  );
}

/** 作答报告：对错 + 完整诗句 + 出处；答错时可以决定是否用补答换题。 */
function ReportPanel({
  res,
  poemTitle,
  authorName,
  redoCount,
  canRedo,
  onContinue,
  onRedo,
}: {
  res: Resolution;
  poemTitle: string;
  authorName: string;
  redoCount: number;
  canRedo: boolean;
  onContinue: () => void;
  onRedo: () => void;
}) {
  const fullCouplet =
    res.questionType === "complete-next"
      ? `「${res.prompt}，${res.answerText}」`
      : res.questionType === "complete-prev"
        ? `「${res.answerText}，${res.prompt}」`
        : `「${res.answerText}」`;
  const redoAvailable = !res.correct && redoCount > 0 && canRedo;
  return (
    <section className="sheet-up absolute inset-x-2 bottom-[max(0.6rem,env(safe-area-inset-bottom))] z-30">
      <ArtPanel className="text-center">
        {res.correct ? (
          <>
            <p className="title-ink text-2xl">答对了</p>
            <p className="poem-line mt-1 text-base font-medium leading-snug text-ink">{fullCouplet}</p>
            <p className="poem-line mt-0.5 text-[11px] text-ink-soft/70">
              {`出自「${poemTitle}」·${authorName}`}
            </p>
            <p className="mt-1 text-xs tracking-wider text-ink-soft">
              连击 ×{res.comboAfter} · +{res.scoreGain} 分
              {res.doubleApplied ? " · 双倍" : ""}
            </p>
          </>
        ) : (
          <>
            <p className="title-ink text-2xl">答错了</p>
            <p className="poem-line mt-1 text-sm font-medium leading-snug text-pine">正确答案：{fullCouplet}</p>
            <p className="poem-line mt-0.5 text-[11px] text-ink-soft/70">
              {`出自「${poemTitle}」·${authorName}`}
            </p>
            {res.context.map((line) => (
              <p key={line} className="poem-line text-xs leading-snug text-ink-soft/70">
                {line}
              </p>
            ))}
          </>
        )}
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          {redoAvailable ? (
            <PlaqueButton onClick={onRedo} className="scale-90">
              {`用补答 · 换一题（剩 ${redoCount}）`}
            </PlaqueButton>
          ) : null}
          <PlaqueButton onClick={onContinue}>{res.outcome === "next" ? "下一题" : "看结果"}</PlaqueButton>
        </div>

      </ArtPanel>
    </section>
  );
}

/** 结算：过关线、星级、新星奖励一目了然。 */
function ResultPanel({
  result,
  hasNext,
  onRetry,
  onNext,
  onExit,
}: {
  result: LevelResult;
  hasNext: boolean;
  onRetry: () => void;
  onNext: () => void;
  onExit: () => void;
}) {
  const starText = result.won
    ? result.stars === 3
      ? "全对！三星"
      : result.stars === 2
        ? "两星，离满星不远"
        : "过关，拿到一星"
    : `答对 ${result.correct}/10，差 ${LEVEL_PASS - result.correct} 题过关`;
  return (
    <section className="pop-in absolute inset-x-2 bottom-[max(1rem,env(safe-area-inset-bottom))] z-20">
      <ArtPanel className="relative text-center">
        {result.won ? (
          /* 过关朱砂印：右上角斜盖一枚「通」，与诗印、落印动效同一仪式语言 */
          <span className="stamp-in pointer-events-none absolute right-3 top-2 z-20" aria-hidden>
            <span className="relative block h-14 w-14">
              <img src="/ui/seal-blank.png" alt="" className="absolute inset-0 h-full w-full object-contain opacity-85" />
              <span className="absolute inset-0 grid place-items-center pb-0.5 font-display text-xl leading-none text-seal/90">
                通
              </span>
            </span>
          </span>
        ) : null}
        <div className="max-h-[64dvh] overflow-y-auto">
          <p className="title-ink text-3xl">{result.won ? "过关" : "差一点"}</p>
          <p className="mt-1 text-sm text-ink-soft">{starText}</p>
          {result.won ? (
            <div className="mt-2 flex justify-center gap-2" aria-label={`${result.stars} 星`}>
              {[1, 2, 3].map((n) => (
                <img
                  key={n}
                  src="/ui/icon-star.png"
                  alt=""
                  style={{ animationDelay: `${(n - 1) * 160}ms` }}
                  className={`seal-pop h-10 w-10 object-contain drop-shadow-md ${
                    n <= result.stars ? "" : "opacity-25 grayscale"
                  }`}
                />
              ))}
            </div>
          ) : null}
          {result.won && result.granted.length > 0 ? (
            <p className="mt-2 text-[12px] tracking-wider text-seal">
              星星奖励：
              {result.granted
                .map((item) => ITEM_DEFS[item].name)
                .join("、")}
            </p>
          ) : null}
          {result.won && result.granted.length === 0 ? (
            <p className="mt-2 text-[11px] tracking-wider text-ink/60">再冲更高星有新奖励</p>
          ) : null}
          <div className="ink-divider mx-auto mt-2.5 max-w-[13rem]" aria-hidden>
            <span className="font-display text-[9px]">◈</span>
          </div>
          <p className="mt-2 flex items-baseline justify-center gap-2">
            <span className="text-xs tracking-widest text-ink-soft">本关得分</span>
            <span className="title-ink text-4xl">{result.score}</span>
          </p>
          <p className="mt-0.5 text-[11px] tracking-wider text-ink/60">
            答对 {result.correct} · 答错 {result.wrong} · 最高连击 ×{result.maxCombo}
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-3">
            {!result.won ? <PlaqueButton onClick={onRetry}>再试一次</PlaqueButton> : null}
            {result.won && hasNext ? <PlaqueButton onClick={onNext}>下一关</PlaqueButton> : null}
            <PlaqueButton onClick={onExit}>{result.won ? "回关卡列表" : "返回"}</PlaqueButton>
          </div>

        </div>
      </ArtPanel>
    </section>
  );
}
