import { useEffect, useRef, useState } from "react";
import { authorById, chancesFor, passMark, shuffleQuestions } from "@/lib/game/content";
import { HERO } from "@/lib/game/content/meta";
import {
  applyPoemWin,
  poemContextFor,
  scoreForAnswer,
  starsForRun,
  TALISMANS,
} from "@/lib/game/progress";
import type { Poem, PoemRunResult, Question, QuestionType, Stars, TalismanDef, TalismanId } from "@/lib/game/types";
import {
  EXPEDITION_MAX_FIRE,
  INKSTONE_BONUS,
  PATH_DEFS,
  RELIC_DEFS,
  RISK_SCORE_BONUS,
  endingTitle,
  nodeQuality,
  relicChoices,
  type ExpeditionPath,
  type ExpeditionPlay,
  type ExpeditionResultView,
} from "@/lib/game/expedition";
import { useSave } from "@/lib/game/save-context";
import { sfxHit, sfxHurt, sfxStamp, sfxTap, sfxWin } from "@/lib/game/sfx";
import { ChoiceSlip, PlaqueButton } from "./choice-slip";
import { HpPips } from "./hp-pips";
import { ArtPanel, PoetImg, Stage, StageHud } from "./stage";

export type QuizMode = "tour" | "practice";

/** 答对时的诗气回报，与连携/回响口径（docs/game-design.md §5.2/§5.3，实现取值在此统一）。 */
const QI_PER_CORRECT = 30;
const QI_ECHO_BONUS = 30;
const ECHO_SCORE_BONUS = 50;
/** 连续答对多少题获得一次连携。 */
const LINK_COMBO = 3;
/** 出招反馈时长（毫秒）：只影响报告出现节奏，不推进题目。 */
const SETTLE_MS = 500;

/** 一题的结算快照：报告层只读它，不再重算规则（玩法重做的 Resolution 模式）。 */
type Resolution = {
  correct: boolean;
  pickedIndex: number;
  answerText: string;
  /** 题干原句/引用，用于报告层拼合完整诗联展示（审查 P0-04） */
  prompt: string;
  /** 题型，决定上/下联拼接顺序与格式 */
  questionType: QuestionType;
  context: string[];
  wardBlocked: boolean;
  lanternLost: boolean;
  lanternsLeft: number;
  linked: boolean;
  echoBonus: boolean;
  echoLost: boolean;
  linkEarned: boolean;
  scoreGain: number;
  qiGain: number;
  /** 远征加成：磨墨（首答）与险滩（风雨路线），只影响展示，分值已在 scoreGain 里。 */
  inkBonus: number;
  riskBonus: number;
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
type EchoState = "idle" | "armed" | "spent";
type Phase = "loadout" | "battle" | "resolving" | "result";

/**
 * 一张诗卡 = 一轮 5 题（docs/content-rules.md），答题手感来自玩法重做（ADR-0015）：
 * - tour：选诗签 → 机会灯笼 + 及格线；作答后必须点「收句」才推进；通关写存档并评级诗印；
 * - practice：无灯笼、无诗签，可先看答案，同样点「收句」推进，不写存档。
 */
export function PoemQuiz({
  poem,
  mode,
  backTo,
  onExit,
  expedition,
  expeditionBadge,
}: {
  poem: Poem;
  mode: QuizMode;
  backTo: string;
  onExit: () => void;
  /** 远征模式：/tour 选卡后由 /play 注入；答题结果会改变诗火与节点状态。 */
  expedition?: ExpeditionPlay;
  /** 仅展示用徽标：深链带 route 参数但对不上远征状态时，仍显示节点/路线语义。 */
  expeditionBadge?: { nodeIndex: number; path: ExpeditionPath } | null;
}) {
  const author = authorById(poem.authorId);
  const { save, patchSave } = useSave();
  const tour = mode === "tour";
  const exp = tour ? expedition : undefined;
  const expBadge = tour && !exp ? (expeditionBadge ?? null) : null;
  const expeditionMode = Boolean(exp);
  const total = poem.questions.length;
  // 远征里诗火就是机会灯笼：开局火数决定本轮容错（1..4）。
  const chances = exp ? Math.min(Math.max(exp.fire, 1), EXPEDITION_MAX_FIRE) : chancesFor(total);
  const need = passMark(total);

  const [phase, setPhase] = useState<Phase>(tour ? "loadout" : "battle");
  const [qIndex, setQIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);

  // —— 答题数值（连击/诗气/连携；灯笼数由 wrong 推算） ——
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [score, setScore] = useState(0);
  const [qi, setQi] = useState(0);
  const [linkReady, setLinkReady] = useState(false);
  const [echoState, setEchoState] = useState<EchoState>("idle");

  // —— 诗签（tour 专属：明心/护卷/回响） ——
  const [talismanPick, setTalismanPick] = useState<TalismanId | null>(null);
  const [talisman, setTalisman] = useState<TalismanId | null>(null);
  const [clarityUsed, setClarityUsed] = useState(false);
  const [wardUsed, setWardUsed] = useState(false);
  const [hiddenChoices, setHiddenChoices] = useState<number[]>([]);

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

  // 题组每轮重洗一次；重试/再战由 restartRun 显式换新，避免 useMemo 依赖告警。
  const [deck, setDeck] = useState<Question[]>(() => shuffleQuestions(poem.questions));

  // 回合治理（玩法重做四件套）：回合 token + 定时器统一清理 + 同步互斥 + 存档只写一次。
  const runRef = useRef(0);
  // 结算那一刻的远征上下文（兜底用）：结算期 /play 仍传实时 expedition（含 result），
  // ResultPanel 优先用实时 prop；深链对不上远征状态时才退回这份定格快照。
  const expAtResultRef = useRef<ExpeditionPlay | null>(null);
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

  // —— 诗签：明心（主动一次，隐藏两个错误选项） ——
  function useClarity() {
    if (phase !== "battle" || talisman !== "clarity" || clarityUsed || !question) return;
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
    setClarityUsed(true);
    sfxTap();
  }

  function startRound() {
    if (phase !== "loadout" || !talismanPick) return;
    busyRef.current = false;
    sfxTap();
    setTalisman(talismanPick);
    setPhase("battle");
  }

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
      // 回响只在「选了回响且已蓄力」时生效，其他诗签不得白吃加成。
      const echoBonus = talisman === "echo" && echoState === "armed";
      // 远征加成：磨墨只保首答，险滩每题都加（高风险高收益）。
      const inkBonus = exp && exp.relic === "inkstone" && qIndex === 0 ? INKSTONE_BONUS : 0;
      const riskBonus = exp && exp.path === "risk" ? RISK_SCORE_BONUS : 0;
      const comboAfter = combo + 1;
      const scoreGain =
        scoreForAnswer({ combo: comboAfter, linked }) + (echoBonus ? ECHO_SCORE_BONUS : 0) + inkBonus + riskBonus;
      const qiGain = QI_PER_CORRECT + (echoBonus ? QI_ECHO_BONUS : 0);
      const nextCorrect = correct + 1;
      // 未选回响时 echoState 恒为 idle：不蓄力、不显示、不加成。
      // idle → armed（已蓄，下一题吃加成）→ spent（已收，终态）。
      const nextEcho: EchoState =
        talisman !== "echo"
          ? "idle"
          : echoBonus
            ? "spent"
            : echoState === "idle"
              ? "armed"
              : echoState;
      const outcome: Resolution["outcome"] = !done
        ? "next"
        : !tour
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
        wardBlocked: false,
        lanternLost: false,
        lanternsLeft: chances - wrong,
        linked,
        echoBonus,
        echoLost: false,
        linkEarned: comboAfter % LINK_COMBO === 0,
        scoreGain,
        qiGain,
        inkBonus,
        riskBonus,
        comboBefore: combo,
        comboAfter,
        outcome,
      };
      setCorrect(nextCorrect);
      setCombo(comboAfter);
      setMaxCombo(Math.max(maxCombo, comboAfter));
      setScore(score + scoreGain);
      setQi(Math.min(100, qi + qiGain));
      setLinkReady(res.linkEarned);
      setEchoState(nextEcho);
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
          talisman,
        };
      }
    } else {
      const wardBlocked = tour && talisman === "ward" && !wardUsed;
      if (wardBlocked) setWardUsed(true);
      const lanternsLeft = chances - (wrong + (wardBlocked ? 0 : 1));
      const echoLost = echoState === "armed";
      const outcome: Resolution["outcome"] = done
        ? !tour
          ? "done"
          : correct >= need
            ? "win"
            : "lose"
        : tour && lanternsLeft <= 0
          ? "lose"
          : "next";

      // 微触觉：远征答错灭灯时振动反馈 35ms
      if (expeditionMode && !wardBlocked) {
        try {
          navigator.vibrate?.(35);
        } catch {
          // 忽略不支持
        }
      }

      res = {
        correct: false,
        pickedIndex: choiceIndex,
        answerText,
        prompt: question.quote || question.prompt,
        questionType: question.type,
        context: poemContextFor(poem, question),
        wardBlocked,
        lanternLost: !wardBlocked,
        lanternsLeft,
        linked: false,
        echoBonus: false,
        echoLost,
        linkEarned: false,
        scoreGain: 0,
        qiGain: 0,
        inkBonus: 0,
        riskBonus: 0,
        comboBefore: combo,
        comboAfter: 0,
        outcome,
      };
      setCombo(0);
      setQi(0);
      setLinkReady(false);
      setWrong(wrong + 1); // 护卷挡下不灭灯笼，但仍计答错（拿不到 3 印）
      setEchoState(echoLost ? "spent" : echoState);
      setFloatText(expeditionMode ? (wardBlocked ? "护卷挡下" : "诗火 -1") : wardBlocked ? "护卷！" : "连对中断");
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
    setHiddenChoices([]);
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
      talisman,
    };
    if (exp) {
      // 定格远征上下文：节点完成后路由层状态会推进，面板回调改用快照。
      expAtResultRef.current = exp;
      if (won) {
        exp.onWin({
          stars: starsForRun(run),
          score: run.score,
          maxCombo: run.maxCombo,
          mistakes: wrong,
          fireLeft: run.chancesLeft,
        });
      } else {
        exp.onLose({ mistakes: wrong, score: run.score });
      }
    }
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

  // —— 再试/再战：作废旧回合，清空全部本轮临时状态，回诗签选择（tour）或直接开答 ——
  function restartRun() {
    const expAtResult = expAtResultRef.current;
    if (phase === "result" && expAtResult) {
      // 远征失败重走：通知路由层重燃诗火、清结算快照。
      expAtResult.onRetry();
    }
    expAtResultRef.current = null;
    runRef.current += 1;
    clearTimers();
    finalRunRef.current = null;
    resultSavedRef.current = false;
    busyRef.current = false;
    setPhase(tour ? "loadout" : "battle");
    setQIndex(0);
    setCorrect(0);
    setWrong(0);
    setCombo(0);
    setMaxCombo(0);
    setScore(0);
    setQi(0);
    setLinkReady(false);
    setEchoState("idle");
    setTalismanPick(null);
    setTalisman(null);
    setClarityUsed(false);
    setWardUsed(false);
    setHiddenChoices([]);
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
      <StageHud title={tour ? author.name : `${author.name}·练习`} backTo={backTo} />

      <div className="absolute inset-x-0 top-[max(3.6rem,calc(env(safe-area-inset-top)+3.2rem))] z-10 flex items-center justify-between gap-2 px-4">
        {tour ? (
          <div className="flex min-w-0 items-center gap-1.5">
            {exp ? (
              <span className="ink-chip paper-glow shrink-0 px-2.5 py-1 text-[11px] tracking-wider text-paper/95">
                {`节点 ${exp.nodeIndex + 1}/3 · ${PATH_DEFS[exp.path].name}`}
              </span>
            ) : expBadge ? (
              <span className="ink-chip paper-glow shrink-0 px-2.5 py-1 text-[11px] tracking-wider text-paper/95">
                {`节点 ${expBadge.nodeIndex + 1}/3 · ${PATH_DEFS[expBadge.path].name}`}
              </span>
            ) : null}
            <HpPips value={lanternsLeft} label={exp ? "诗火" : ""} max={chances} />
          </div>
        ) : (
          <span className="ink-chip paper-glow px-3 py-1 text-[11px] tracking-[0.3em] text-paper/95">练习</span>
        )}
        <span className="ink-chip paper-glow shrink-0 px-3 py-1 text-[11px] tracking-[0.3em] text-paper/95">
          第 {questionNo} / {total} 题
        </span>
      </div>

      {tour && (phase === "battle" || phase === "resolving") ? (
        <QuizHud
          combo={combo}
          qi={qi}
          linkReady={linkReady}
          talisman={talisman}
          clarityUsed={clarityUsed}
          wardUsed={wardUsed}
          echoState={echoState}
          onClarity={useClarity}
        />
      ) : null}

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

      {phase === "loadout" ? (
        <section className="pop-in absolute inset-x-0 bottom-0 z-20 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
          <div className="mb-1.5 flex justify-center">
            <p className="title-art paper-glow rounded-lg bg-ink/60 px-3 py-1 text-center text-[clamp(1.05rem,4.6vw,1.3rem)] text-paper">
              选一枚诗签，再入诗境
            </p>
          </div>
          {exp && exp.relic !== "none" ? (
            <p className="paper-glow mb-1.5 text-center text-[11px] tracking-wider text-paper/85">
              {`随行修页奖励：${RELIC_DEFS[exp.relic].name} · ${RELIC_DEFS[exp.relic].desc}`}
            </p>
          ) : null}
          <div className="flex flex-col gap-1.5">
            {TALISMANS.map((def) => (
              <TalismanSlip
                key={def.id}
                def={def}
                selected={talismanPick === def.id}
                onPick={() => {
                  sfxTap();
                  setTalismanPick(def.id);
                }}
              />
            ))}
          </div>
          <div className="mt-2.5 flex justify-center">
            <PlaqueButton disabled={!talismanPick} onClick={startRound} className="disabled:opacity-50">
              {talismanPick ? "开始答题" : "先选一枚诗签"}
            </PlaqueButton>
          </div>
        </section>
      ) : null}

      {(phase === "battle" || phase === "resolving") && question ? (
        <section
          key={question.id}
          className={`absolute inset-x-0 bottom-0 z-20 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 ${
            phase === "resolving" && reportReady ? "slip-fade-back pointer-events-none" : "pop-in"
          }`}
        >
          {/* 听句：修页奖励让开局先见一行诗文，降低第一次选择压力 */}
          {exp?.relic === "listen" && qIndex === 0 && poem.lines[0] ? (
            <p className="paper-glow ink-in mb-0.5 px-3 text-center text-[11px] tracking-wider text-paper/75">
              {`听句 · 「${poem.lines[0]}」`}
            </p>
          ) : null}
          {/* 题干信笺：柔和墨纱托底（多行安全圆角，非 9999px 药丸），
              保证亮色水面/花簇等任何场景插花上题干都 ≥4.5:1 可读（UI 走查 P0-02） */}
          <div
            className="ink-in mx-auto mb-1 w-fit max-w-full rounded-2xl border border-paper/15 bg-gradient-to-b from-ink/55 to-ink/35 px-4 py-1.5 text-center backdrop-blur-[2px]"
            style={{ boxShadow: "inset 0 0 0 1px rgb(243 235 224 / 12%)" }}
          >
            {bigLine ? (
              <p className="title-art paper-glow text-center text-[clamp(1.15rem,5vw,1.5rem)] leading-snug text-paper">
                {bigLine}
              </p>
            ) : null}
            <p className="paper-glow mt-0.5 text-center text-sm tracking-wider text-paper/90">{ask}</p>
          </div>
          <div className="flex flex-col gap-2">
            {question.choices.map((choice, index) => {
              if (hiddenChoices.includes(index)) {
                return (
                  <div
                    key={`${question.id}-hidden-${index}`}
                    className="slip-in opacity-35"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="wash-fade">
                      <ChoiceSlip text="" state="idle" disabled />
                    </div>
                  </div>
                );
              }
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
                    onClick={() => choose(index)}
                  />
                </div>
              );
            })}
          </div>
          {!tour ? (
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
        <ReportPanel res={resolution} tour={tour} expedition={expeditionMode} onContinue={continueAfterResolution} />
      ) : null}

      {phase === "result" && resultView ? (
        <ResultPanel
          view={resultView}
          total={total}
          poemText={poem.text}
          expedition={exp ?? expAtResultRef.current}
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

const ECHO_LABEL: Record<EchoState, string> = {
  idle: "回响·待答",
  armed: "回响·已蓄",
  spent: "回响·已收",
};

/** 答题 HUD：连击、诗气与当前诗签状态（玩法重做的 BattleHud 收敛为一行）。 */
function QuizHud({
  combo,
  qi,
  linkReady,
  talisman,
  clarityUsed,
  wardUsed,
  echoState,
  onClarity,
}: {
  combo: number;
  qi: number;
  linkReady: boolean;
  talisman: TalismanId | null;
  clarityUsed: boolean;
  wardUsed: boolean;
  echoState: EchoState;
  onClarity: () => void;
}) {
  return (
    <div className="scenery-plate absolute inset-x-2 top-[max(5.6rem,calc(env(safe-area-inset-top)+5.2rem))] z-10 flex items-center gap-2 px-2.5 py-1">
      <p className="shrink-0 text-[11px] tracking-wider text-paper/90" aria-label={`连击 ${combo}`}>
        连击{" "}
        <span key={combo} className="combo-ripple inline-block">
          <span className="combo-bump inline-block">
            ×{combo}
          </span>
        </span>
      </p>
      <span className="shrink-0 text-[10px] tracking-widest text-paper/80">诗气</span>
      <div
        role="progressbar"
        aria-label="诗气"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={qi}
        className={`h-2 min-w-8 flex-1 overflow-hidden rounded-full bg-paper/25 shadow-[inset_0_1px_2px_rgb(28_23_18/30%)] ${
          linkReady || qi >= 100 ? "qi-breathe" : ""
        }`}
      >
        <div className="qi-fill qi-flow h-full rounded-full bg-seal" style={{ width: `${qi}%` }} />
      </div>
      {talisman === "clarity" ? (
        <button
          type="button"
          onClick={onClarity}
          disabled={clarityUsed}
          className="tap shrink-0 rounded-md border border-[var(--color-fire,#b83b26)]/40 bg-[var(--color-fire,#b83b26)]/90 px-2 py-0.5 text-[10px] font-display tracking-wider text-paper shadow-sm disabled:border-ink/30 disabled:bg-ink/60 disabled:text-paper/50"
        >
          {clarityUsed ? "明心·已用" : "明心·隐两项"}
        </button>
      ) : (
        <span className="shrink-0 rounded-md bg-paper/15 px-2 py-0.5 text-[10px] tracking-wider text-paper/90">
          {talisman === "ward"
            ? wardUsed
              ? "护卷·已挡"
              : "护卷·待命"
            : talisman === "echo"
              ? ECHO_LABEL[echoState]
              : "无诗签"}
        </span>
      )}
    </div>
  );
}

/** 诗签三选一：名称、符号、短说明与选中态（本地 TalismanSlip，落到上游木牍底图）。 */
function TalismanSlip({ def, selected, onPick }: { def: TalismanDef; selected: boolean; onPick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onPick}
      className={`tap block w-full ${selected ? "picked talisman-lift" : ""}`}
    >
      <span className="ui-slip relative block min-h-[3.75rem]">
        <span className="relative z-10 flex min-h-[3.75rem] w-full items-center gap-2.5 px-6 py-1.5 text-left">
          <span
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 font-display text-lg leading-none ${
              selected
                ? "border-pine bg-pine text-paper"
                : "border-ink/20 bg-paper-deep/80 text-ink shadow-[inset_0_1px_2px_rgba(28,23,18,0.2)]"
            }`}
          >
            {def.symbol}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-baseline gap-2">
              <span className="title-ink text-base leading-tight">{def.name}</span>
              <span className="shrink-0 text-[10px] tracking-wider text-ink/50">可用 {def.uses} 次</span>
            </span>
            <span className="block text-[11px] leading-normal text-ink-soft">{def.description}</span>
          </span>
          {selected ? <span className="shrink-0 text-[10px] tracking-widest text-pine">已选</span> : null}
        </span>
      </span>
    </button>
  );
}

/** resolving 报告层：对错、连击/诗气变化；远征语义下把结果讲成「诗页/墨潮/诗火」。 */
function ReportPanel({
  res,
  tour,
  expedition,
  onContinue,
}: {
  res: Resolution;
  tour: boolean;
  expedition: boolean;
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
            <p className="title-ink text-2xl">{expedition ? "诗页补回一行" : "答对"}</p>
            {/* 完整诗联展示（审查 P0-04）：深墨大字 serif，展示补全后的完整名联 */}
            <p className="poem-line mt-1 text-base font-medium leading-snug text-ink">{fullPoemCouplet}</p>
            <p className="mt-1 text-xs tracking-wider text-ink-soft">
              连击 ×{res.comboAfter} · +{res.scoreGain} 分 · 诗气 +{res.qiGain}
              {res.echoBonus ? " · 回响加成" : ""}
              {res.riskBonus > 0 ? ` · 险滩 +${res.riskBonus}` : ""}
              {res.inkBonus > 0 ? ` · 磨墨 +${res.inkBonus}` : ""}
            </p>
            {res.linkEarned && !res.linked ? (
              <p className="mt-0.5 text-xs tracking-wider text-pine">连携已就绪！下次正确额外加分</p>
            ) : null}
            {res.linked ? <p className="mt-0.5 text-xs tracking-wider text-pine">连携出手！诗韵加倍</p> : null}
          </>
        ) : (
          <>
            <p className="title-ink text-2xl">
              {expedition ? (res.wardBlocked ? "护卷挡下，诗火未灭" : "墨潮抹去一盏诗火") : "答错"}
              {!expedition && tour ? (
                res.wardBlocked ? (
                  <span className="ml-2 text-base text-pine">护卷挡下了，灯笼未灭</span>
                ) : (
                  <span className="ml-2 text-base text-seal">灭了一盏灯笼</span>
                )
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
              {expedition
                ? `${res.comboBefore > 0 ? `连击 ×${res.comboBefore} 中断` : "墨潮压近"} · 收句继续修复`
                : res.comboBefore > 0
                  ? `连击 ×${res.comboBefore} 中断`
                  : "连击重新开始"}
              {res.echoLost ? " · 回响散去了" : ""}
            </p>
          </>
        )}
        <div className="mt-3 flex justify-center">
          <PlaqueButton onClick={onContinue}>{res.outcome === "next" ? "收句" : "继续"}</PlaqueButton>
        </div>
      </ArtPanel>
    </section>
  );
}

/**
 * 结算页：普通模式展示诗印/得分/最高连击与整诗原文；
 * 远征模式改为「修页结果」——中盘选修页奖励、终盘给因果结局、失败可重走或另选墨路。
 */
function ResultPanel({
  view,
  total,
  poemText,
  onReplay,
  onExit,
  expedition,
}: {
  view: ResultView;
  total: number;
  poemText: string;
  onReplay: () => void;
  onExit: () => void;
  expedition?: ExpeditionPlay | null;
}) {
  const bestStars = Math.max(view.prevStars, view.stars);
  const bestScore = Math.max(view.prevScore, view.score);
  const bestCombo = Math.max(view.prevCombo, view.maxCombo);
  const scoreRecord = view.score > view.prevScore && view.score > 0;
  const starsRecord = view.stars > view.prevStars;
  const title = view.won ? "通关" : view.finished ? "答完了" : "差一点";
  const expResult = expedition?.result ?? null;

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
          {expedition && expResult ? (
            <ExpeditionResultBody exp={expedition} result={expResult} poemText={poemText} onReplay={onReplay} />
          ) : (
            <>
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
                <p className="mt-1 text-sm text-ink-soft">{`对了 ${view.correct}/${total}。`}</p>
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
                  <p className="mt-1 flex items-baseline justify-center gap-2">
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
              <p className="mx-auto mt-2 max-w-[26em] whitespace-pre-wrap text-left text-[13px] leading-relaxed text-ink-soft">
                {poemText}
              </p>
              <div className="mt-3 flex justify-center gap-3">
                {!view.won ? <PlaqueButton onClick={onReplay}>再试一次</PlaqueButton> : null}
                {view.won ? <PlaqueButton onClick={onExit}>收下诗卡</PlaqueButton> : null}
                <PlaqueButton onClick={view.won ? onReplay : onExit}>{view.won ? "再战提分" : "返回"}</PlaqueButton>
              </div>
            </>
          )}
        </div>
      </ArtPanel>
    </section>
  );
}

/** 远征结局面板：中盘 = 领修页奖励去下一节点；终盘 = 三种因果结局 + 旅程摘要；失败 = 重走或换路。 */
function ExpeditionResultBody({
  exp,
  result,
  poemText,
  onReplay,
}: {
  exp: ExpeditionPlay;
  result: ExpeditionResultView;
  poemText: string;
  onReplay: () => void;
}) {
  if (!result.won) {
    return (
      <>
        <p className="title-ink text-3xl">{endingTitle("failed")}</p>
        <p className="mt-1 text-sm text-ink-soft">诗火燃尽，这一页没能收句。</p>
        <p className="mt-1 text-[11px] tracking-wider text-ink/60">重走此页会重新点亮诗火，或换一条墨路再来。</p>
        <p className="mx-auto mt-2 max-w-[26em] whitespace-pre-wrap text-left text-[13px] leading-relaxed text-ink-soft">
          {poemText}
        </p>
        <div className="mt-3 flex justify-center gap-3">
          <PlaqueButton onClick={onReplay}>再战此页</PlaqueButton>
          <PlaqueButton onClick={exp.onToTour}>另选墨路</PlaqueButton>
        </div>
      </>
    );
  }
  if (result.ending) {
    return (
      <>
        <p className="title-ink text-3xl">{endingTitle(result.ending)}</p>
        <p className="mt-1 text-xs tracking-wider text-ink-soft">
          {result.ending === "clear" ? "三页清声齐鸣，墨潮退去。" : "带着墨痕归卷，诗声已复明大半。"}
        </p>
        <div className="mx-auto mt-2 flex max-w-[26em] flex-col gap-0.5 text-left">
          {result.nodes.map((node, index) => (
            <p key={`${node.title}-${index}`} className="text-[11.5px] leading-snug text-ink-soft">
              <span className="title-ink mr-1 text-[13px] text-ink">{`第${index + 1}页`}</span>
              {`${PATH_DEFS[node.path].name}《${node.title}》 · ${
                node.status === "done" ? nodeQuality(node.mistakes) : node.status === "failed" ? "墨痕" : "未至"
              }`}
            </p>
          ))}
        </div>
        <p className="mt-1.5 flex items-baseline justify-center gap-2">
          <span className="text-xs tracking-widest text-ink-soft">远征得分</span>
          <span className="title-ink text-3xl">{result.nodes.reduce((sum, node) => sum + node.score, 0)}</span>
        </p>
        <p className="mt-0.5 text-[11px] tracking-wider text-ink/60">诗印与得分已计入诗册，下次可换一条墨路再征。</p>
        <div className="mt-3 flex justify-center gap-3">
          <PlaqueButton onClick={exp.onRelaunch}>再启远征</PlaqueButton>
          <PlaqueButton onClick={exp.onHome}>回远征台</PlaqueButton>
        </div>
      </>
    );
  }
  const choices = relicChoices(exp.path);
  return (
    <>
      <p className="title-ink text-3xl">诗页已修复</p>
      <p className="mt-0.5 text-xs tracking-wider text-ink-soft">
        {`${nodeQuality(result.mistakes)} · 诗火余 ${result.fireLeft} · 连击 ×${result.maxCombo}`}
      </p>
      <p className="mt-1 flex items-baseline justify-center gap-2">
        <span className="text-xs tracking-widest text-ink-soft">本页得分</span>
        <span className="title-ink text-3xl">{result.score}</span>
      </p>
      <p className="mx-auto mt-2 max-w-[26em] whitespace-pre-wrap text-left text-[13px] leading-relaxed text-ink-soft">
        {poemText}
      </p>
      <p className="mt-2 text-xs tracking-widest text-ink-soft">{`择一枚修页奖励，赶往第 ${exp.nodeIndex + 2} 页`}</p>
      <div className="mt-1.5 flex flex-wrap items-center justify-center gap-2">
        {choices.map((id) => (
          <PlaqueButton key={id} onClick={() => exp.onChooseRelic(id)} className="scale-90">
            {RELIC_DEFS[id].name}
          </PlaqueButton>
        ))}
      </div>
      <p className="mt-0.5 text-[10.5px] leading-snug tracking-wider text-ink/55">
        {choices.map((id) => `${RELIC_DEFS[id].name}：${RELIC_DEFS[id].desc}`).join(" · ")}
      </p>
      <button
        type="button"
        className="tap mt-1 px-4 py-1 text-[11px] tracking-widest text-ink/60"
        onClick={exp.onToTour}
      >
        不用奖励，直接赶路
      </button>
    </>
  );
}
