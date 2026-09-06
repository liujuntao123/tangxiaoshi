import { Link } from "@tanstack/react-router";
import { chapterOfLevel, levelById, poemById, poetBust, shuffleQuestions } from "@/lib/game/content";
import { preloadImages } from "@/lib/game/preload";
import {
  LEVEL_START_HP,
  MONSTER_START_HP,
  TALISMANS,
  applyLevelWin,
  scoreForAnswer,
  starsForRun,
} from "@/lib/game/progress";
import { useSave } from "@/lib/game/save-context";
import { sfxHit, sfxHurt, sfxTap, sfxWin } from "@/lib/game/sfx";
import { bustOf, FX_BOLT, FX_IMPACT, HERO_ATTACK, HERO_HURT, HERO_IDLE, poseFrames } from "@/lib/game/sprites";
import type {
  DialogueLine,
  LevelRunResult,
  Poem,
  Question,
  Stars,
  TalismanDef,
  TalismanId,
} from "@/lib/game/types";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChoiceSlip, PlaqueButton } from "./choice-slip";
import { HpPips } from "./hp-pips";
import { SpeechBox } from "./speech-box";
import { SpriteFrames } from "./sprite-frames";
import { ArtPanel, Stage, StageHud } from "./stage";

/**
 * 主线战斗显式状态机（docs/game-design.md §5.1）：
 * intro -> loadout -> battle -> resolving -> battle，
 * 胜利 resolving -> outro -> result；失败 resolving -> lose。
 * 一局必须把 deck 的每道题各完成一次（不循环、不重复）；
 * 诗魄先归零时剩余题进入“收束诗境”继续，最后一题答对方可 resolving -> outro。
 */
type Phase = "intro" | "loadout" | "battle" | "resolving" | "outro" | "result" | "lose";
type Pose = "idle" | "attack" | "hurt";
type Bolt = { id: number; dir: "right" | "left" };
type EchoState = "idle" | "armed" | "spent";

/** 回响加成与诗气回报口径（设计文档未定值，实现在此统一）。 */
const QI_PER_CORRECT = 30;
const QI_ECHO_BONUS = 30;
const ECHO_SCORE_BONUS = 50;
const LINK_DAMAGE = 2;
/** 连续答对多少题获得一次连携。 */
const LINK_COMBO = 3;
/** 出招飞行与受击停顿的动画时长（毫秒），只影响反馈节奏，不推进题目。 */
const IMPACT_MS = 560;
const SETTLE_MS = 430;

/** 一题的结算快照：resolving 报告层只读它，不再重算规则。 */
type Resolution = {
  correct: boolean;
  pickedIndex: number;
  answerText: string;
  context: string[];
  wardBlocked: boolean;
  linked: boolean;
  echoBonus: boolean;
  echoLost: boolean;
  linkEarned: boolean;
  damage: number;
  scoreGain: number;
  qiGain: number;
  comboBefore: number;
  comboAfter: number;
  /** 本次正确是否真的削减了诗魄；诗魄已尽后为 false，只保留得分与连击。 */
  hpDealt: boolean;
  /** 诗魄已尽但本题之后仍有未完成题：进入“收束诗境”，不得提前胜利。 */
  concluding: boolean;
  /** 本题之后还剩多少题（收束提示用）。 */
  questionsLeft: number;
  outcome: "next" | "win" | "lose";
};

/** 结算页快照：写入存档前先取旧记录，用于“新纪录/历史最佳”对比。 */
type ResultView = {
  stars: Stars;
  score: number;
  maxCombo: number;
  hpLeft: number;
  prevStars: Stars;
  prevScore: number;
  prevCombo: number;
  firstClear: boolean;
};

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

export function PlayLevel({ levelId }: { levelId: string }) {
  const level = levelById(levelId);
  const chapter = chapterOfLevel(level);
  const poem = poemById(level.poemId);
  const { save, patchSave } = useSave();

  // —— 状态机与对白 ——
  const [phase, setPhase] = useState<Phase>("intro");
  const [lineIndex, setLineIndex] = useState(0);
  const [qIndex, setQIndex] = useState(0);

  // —— 战斗数值 ——
  const [playerHp, setPlayerHp] = useState(LEVEL_START_HP);
  const [monsterHp, setMonsterHp] = useState(MONSTER_START_HP);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [qi, setQi] = useState(0);
  const [linkReady, setLinkReady] = useState(false);
  const [echoPrimed, setEchoPrimed] = useState(false);
  const [echoState, setEchoState] = useState<EchoState>("idle");

  // —— 诗签（明心/护卷/回响） ——
  const [talismanPick, setTalismanPick] = useState<TalismanId | null>(null);
  const [talisman, setTalisman] = useState<TalismanId | null>(null);
  const [clarityUsed, setClarityUsed] = useState(false);
  const [wardUsed, setWardUsed] = useState(false);
  const [hiddenChoices, setHiddenChoices] = useState<number[]>([]);

  // —— 本题作答 ——
  const [picked, setPicked] = useState<number | null>(null);
  const [resolution, setResolution] = useState<Resolution | null>(null);
  const [reportReady, setReportReady] = useState(false);

  // —— 视觉反馈 ——
  const [shake, setShake] = useState(false);
  const [heroPose, setHeroPose] = useState<Pose>("idle");
  const [bossPose, setBossPose] = useState<Pose>("idle");
  const [bolts, setBolts] = useState<Bolt[]>([]);
  const [impact, setImpact] = useState<"hero" | "boss" | null>(null);
  const [floatText, setFloatText] = useState<{ side: "hero" | "boss"; text: string } | null>(null);

  // —— 结算 ——
  const [resultView, setResultView] = useState<ResultView | null>(null);

  // 题组每局重洗一次；重试/再战由 restartRun 显式换新，避免 useMemo 依赖告警。
  const [deck, setDeck] = useState<Question[]>(() => shuffleQuestions(poem));

  // 统一 cleanup：动画延时只在当前回合生效，离开/重开后旧回调一律作废。
  const runRef = useRef(0);
  const timersRef = useRef<number[]>([]);
  const finalRunRef = useRef<LevelRunResult | null>(null);
  const resultSavedRef = useRef(false);
  // 同步互斥：同 tick 的连点在 React 刷新前到达，用 ref 立刻挡住，防重复结算/跳题。
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

  useEffect(() => {
    preloadImages([
      level.sceneBg,
      level.monsterArt,
      ...level.monsterIdle,
      ...level.monsterAttack,
      ...level.monsterHurt,
      ...HERO_IDLE,
      ...HERO_ATTACK,
      ...HERO_HURT,
      bustOf(level.monsterArt),
      poetBust(chapter.poetId),
    ]);
  }, [level, chapter.poetId]);

  // 每题只完成一次：qIndex 不取模，deck 走完即本局题尽，绝不循环或重复出题。
  const question: Question | undefined = qIndex < deck.length ? deck[qIndex] : undefined;
  const questionNo = qIndex < deck.length ? qIndex + 1 : 0;
  const lines: DialogueLine[] = phase === "outro" ? level.outro : level.intro;
  const currentLine = lines[lineIndex] ?? lines[0];
  const lastDialogue = lineIndex >= lines.length - 1;

  const speakerArt =
    currentLine?.speaker === "tang"
      ? "/sprites/hero-bust.png"
      : currentLine?.name === chapter.poetName
        ? poetBust(chapter.poetId)
        : bustOf(level.monsterArt);

  // —— 诗签：明心（主动一次） ——
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

  // —— 作答：一次点击只结算一次，动画延时全部受回合 token 管辖 ——
  function choose(choiceIndex: number) {
    if (busyRef.current) return;
    if (phase !== "battle" || !question || picked !== null || resolution) return;
    busyRef.current = true;
    const correct = choiceIndex === question.answerIndex;
    const answerText = question.choices[question.answerIndex] ?? "";
    const bolt: Bolt = { id: Date.now() + Math.random(), dir: correct ? "right" : "left" };
    // deck 每题各完成一次：本题之后的剩余题数决定“收束诗境”与胜利时机。
    const questionsLeft = deck.length - qIndex - 1;

    let res: Resolution;
    if (correct) {
      const linked = linkReady;
      // 回响只在「选了回响且已蓄力」时生效（§5.3），其他诗签不得白吃加成。
      const echoBonus = talisman === "echo" && echoState === "armed";
      const comboAfter = combo + 1;
      const scoreGain = scoreForAnswer({ combo: comboAfter, linked }) + (echoBonus ? ECHO_SCORE_BONUS : 0);
      const qiGain = QI_PER_CORRECT + (echoBonus ? QI_ECHO_BONUS : 0);
      const damage = linked ? LINK_DAMAGE : 1;
      const monsterHpAfter = Math.max(0, monsterHp - damage);
      const hpDealt = monsterHpAfter < monsterHp;
      const maxComboAfter = Math.max(maxCombo, comboAfter);
      // 未选回响时 echoState 恒为 idle：不蓄力、不显示、不加成。
      const nextEcho: EchoState = talisman !== "echo" ? "idle" : echoBonus ? "spent" : echoPrimed ? echoState : "armed";
      res = {
        correct: true,
        pickedIndex: choiceIndex,
        answerText,
        context: [],
        wardBlocked: false,
        linked,
        echoBonus,
        echoLost: false,
        linkEarned: comboAfter % LINK_COMBO === 0,
        damage,
        scoreGain,
        qiGain,
        comboBefore: combo,
        comboAfter,
        hpDealt,
        concluding: monsterHpAfter <= 0 && questionsLeft > 0,
        questionsLeft,
        // 胜利只看“最后一题答对”；诗魄先归零时余下题收束诗境，不提前获胜。
        outcome: questionsLeft <= 0 ? "win" : "next",
      };
      setCombo(comboAfter);
      setMaxCombo(maxComboAfter);
      setScore(score + scoreGain);
      setQi(Math.min(100, qi + qiGain));
      setMonsterHp(monsterHpAfter);
      setLinkReady(res.linkEarned);
      setEchoPrimed(true);
      setEchoState(nextEcho);
      if (res.outcome === "win") {
        finalRunRef.current = {
          levelId: level.id,
          won: true,
          hpLeft: playerHp,
          maxCombo: maxComboAfter,
          score: score + scoreGain,
          mistakes,
          talisman,
        };
      }
    } else {
      const wardBlocked = talisman === "ward" && !wardUsed;
      const hpAfter = wardBlocked ? playerHp : Math.max(0, playerHp - 1);
      const echoLost = echoState === "armed";
      res = {
        correct: false,
        pickedIndex: choiceIndex,
        answerText,
        context: poemContextFor(poem, question),
        wardBlocked,
        linked: false,
        echoBonus: false,
        echoLost,
        linkEarned: false,
        damage: 0,
        scoreGain: 0,
        qiGain: 0,
        comboBefore: combo,
        comboAfter: 0,
        hpDealt: false,
        concluding: false,
        questionsLeft,
        outcome: hpAfter <= 0 ? "lose" : "next",
      };
      setCombo(0);
      setQi(0);
      setLinkReady(false);
      setMistakes(mistakes + 1); // 护卷挡下也算答错（拿不到 3 星）
      setPlayerHp(hpAfter);
      if (wardBlocked) setWardUsed(true);
      setEchoState(echoLost ? "spent" : echoState);
    }

    setPicked(choiceIndex);
    setPhase("resolving");
    setResolution(res);
    setReportReady(false);
    setBolts((list) => [...list, bolt]);
    if (correct) {
      setHeroPose("attack");
      sfxHit();
    } else {
      setBossPose("attack");
      sfxHurt();
    }

    // 只做反馈动画，不推进题目；题目推进只由“收句/继续”触发。
    later(() => {
      setBolts((list) => list.filter((item) => item.id !== bolt.id));
      setImpact(correct ? "boss" : "hero");
      setHeroPose(correct ? "attack" : "hurt");
      setBossPose(correct ? "hurt" : "attack");
      setFloatText({
        side: correct ? "boss" : "hero",
        // 诗魄已尽后不再报伤害数字，避免把收束题误当继续扣血。
        text: correct
          ? res.hpDealt
            ? res.linked
              ? `连携 -${res.damage}`
              : `-${res.damage}`
            : "诗魄已尽"
          : res.wardBlocked
            ? "护卷！"
            : "-1",
      });
      setShake(true);
      later(() => setShake(false), 380);
    }, IMPACT_MS);

    later(() => {
      setImpact(null);
      setFloatText(null);
      setReportReady(true);
      if (res.outcome === "win") sfxWin();
    }, IMPACT_MS + SETTLE_MS);
  }

  // —— 收句/继续：唯一的题目推进入口 ——
  function continueAfterResolution() {
    const res = resolution;
    if (phase !== "resolving" || !res || !reportReady) return;
    if (!busyRef.current) return; // 与 choose 共用同一把互斥锁
    sfxTap();
    setPicked(null);
    setResolution(null);
    setReportReady(false);
    setHiddenChoices([]);
    setHeroPose("idle");
    setBossPose("idle");
    if (res.outcome === "win") {
      setPhase("outro");
      setLineIndex(0);
      return; // busyRef 保持 true：本局战斗已封盘，直到 restartRun
    }
    if (res.outcome === "lose") {
      setPhase("lose");
      return;
    }
    busyRef.current = false; // 回到 battle，允许下一题作答
    setQIndex((n) => n + 1);
    setPhase("battle");
  }

  function startBattle() {
    if (phase !== "loadout" || !talismanPick) return;
    busyRef.current = false;
    sfxTap();
    setTalisman(talismanPick);
    setPhase("battle");
  }

  function advanceDialogue() {
    if (phase !== "intro" && phase !== "outro") return;
    sfxTap();
    if (!lastDialogue) {
      setLineIndex(lineIndex + 1);
      return;
    }
    if (phase === "intro") {
      setPhase("loadout"); // 开场对白结束后必须先选诗签，不直接开战
      return;
    }
    enterResult();
  }

  // —— 再战/重试：作废旧回合，清空全部本局临时状态，回到诗签选择 ——
  function restartRun() {
    runRef.current += 1;
    clearTimers();
    finalRunRef.current = null;
    resultSavedRef.current = false;
    busyRef.current = false;
    setPhase("loadout");
    setLineIndex(0);
    setQIndex(0);
    setPlayerHp(LEVEL_START_HP);
    setMonsterHp(MONSTER_START_HP);
    setCombo(0);
    setMaxCombo(0);
    setScore(0);
    setMistakes(0);
    setQi(0);
    setLinkReady(false);
    setEchoPrimed(false);
    setEchoState("idle");
    setTalismanPick(null);
    setTalisman(null);
    setClarityUsed(false);
    setWardUsed(false);
    setHiddenChoices([]);
    setPicked(null);
    setResolution(null);
    setReportReady(false);
    setShake(false);
    setHeroPose("idle");
    setBossPose("idle");
    setBolts([]);
    setImpact(null);
    setFloatText(null);
    setResultView(null);
    setDeck(shuffleQuestions(poem));
  }

  // —— 结算：outro 结束才进入 result，applyLevelWin 只写一次 ——
  function enterResult() {
    if (phase !== "outro" || resultSavedRef.current) return;
    resultSavedRef.current = true;
    const run: LevelRunResult = finalRunRef.current ?? {
      levelId: level.id,
      won: true,
      hpLeft: playerHp,
      maxCombo,
      score,
      mistakes,
      talisman,
    };
    const prev = save.levelRecords[level.id];
    setResultView({
      stars: starsForRun(run),
      score: run.score,
      maxCombo: run.maxCombo,
      hpLeft: run.hpLeft,
      prevStars: prev?.bestStars ?? 0,
      prevScore: prev?.bestScore ?? 0,
      prevCombo: prev?.bestCombo ?? 0,
      firstClear: !save.clearedLevels.includes(level.id),
    });
    setPhase("result");
    void patchSave((current) => applyLevelWin(current, level.id, run));
  }

  const heroFrames = poseFrames(heroPose, HERO_IDLE, HERO_ATTACK, HERO_HURT);
  const bossFrames = poseFrames(bossPose, level.monsterIdle, level.monsterAttack, level.monsterHurt);
  // 对白/结算时角色落底，答题与反馈时抬高，给底部选项和报告留空
  const ground =
    phase === "battle" || phase === "resolving"
      ? "bottom-[46%]"
      : phase === "loadout"
        ? "bottom-[54%]"
        : phase === "result" || phase === "lose"
          ? "bottom-[56%]"
          : "bottom-[24%]";
  const inCombat = phase === "battle" || phase === "resolving";

  return (
    <Stage bg={level.sceneBg} shake={shake} dim={phase === "result" || phase === "lose"}>
      <StageHud title={`${chapter.poetName} · ${level.place}`} backTo={`/story/${chapter.dynastyId}/${chapter.poetId}`} />

      {inCombat && question ? (
        <BattleHud
          playerHp={playerHp}
          monsterHp={monsterHp}
          concluding={monsterHp <= 0}
          questionNo={questionNo}
          questionTotal={deck.length}
          combo={combo}
          qi={qi}
          talisman={talisman}
          clarityUsed={clarityUsed}
          wardUsed={wardUsed}
          echoState={echoState}
          onClarity={useClarity}
        />
      ) : null}

      <div className={`absolute inset-x-0 z-10 flex items-end justify-between px-1 ${ground}`}>
        <Fighter name="唐小诗" hp={playerHp} frames={heroFrames} pose={heroPose} hit={heroPose === "hurt"} align="left" />
        <Fighter
          name={level.monsterName}
          hp={monsterHp}
          frames={bossFrames}
          pose={bossPose}
          hit={bossPose === "hurt"}
          align="right"
          flip
        />
      </div>

      {bolts.map((bolt) => (
        <div key={bolt.id} className="pointer-events-none absolute bottom-[56%] z-20 h-16 w-full">
          <SpriteFrames
            frames={FX_BOLT}
            fps={12}
            className={`absolute top-1/2 h-16 w-16 object-contain drop-shadow ${
              bolt.dir === "right" ? "fly-right" : "fly-left"
            }`}
          />
        </div>
      ))}

      {impact ? (
        <div
          className={`pointer-events-none absolute bottom-[50%] z-20 ${impact === "boss" ? "right-[8%]" : "left-[8%]"}`}
        >
          <SpriteFrames frames={FX_IMPACT} fps={12} className="h-24 w-24 object-contain" />
        </div>
      ) : null}

      {floatText ? (
        <p
          className={`glyph-burst pointer-events-none absolute bottom-[60%] z-30 font-display text-3xl text-seal ${
            floatText.side === "boss" ? "right-[18%]" : "left-[18%]"
          }`}
        >
          {floatText.text}
        </p>
      ) : null}

      {phase === "loadout" ? (
        <section className="pop-in absolute inset-x-0 bottom-0 z-20 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
          <div className="mb-1.5 flex justify-center">
            <p className="title-art paper-glow rounded-lg bg-ink/60 px-3 py-1 text-center text-[clamp(1.05rem,4.6vw,1.3rem)] text-paper">
              选一枚诗签，再入诗境
            </p>
          </div>
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
            <PlaqueButton disabled={!talismanPick} onClick={startBattle} className="disabled:opacity-50">
              {talismanPick ? "开始战斗" : "先选一枚诗签"}
            </PlaqueButton>
          </div>
        </section>
      ) : null}

      {(phase === "battle" || (phase === "resolving" && !reportReady)) && question ? (
        <section className="pop-in absolute inset-x-0 bottom-0 z-20 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
          <div className="mb-1 flex justify-center">
            <p className="title-art paper-glow rounded-lg bg-ink/60 px-3 py-1 text-center text-[clamp(0.95rem,4.2vw,1.2rem)] leading-snug text-paper">
              {question.prompt}
            </p>
          </div>
          <div className="flex flex-col gap-0">
            {question.choices.map((choice, index) => {
              if (hiddenChoices.includes(index)) {
                return (
                  <div key={`${question.id}-hidden-${index}`} className="opacity-40">
                    <ChoiceSlip text="✕ 已隐去" state="idle" disabled />
                  </div>
                );
              }
              const selected = picked === index;
              const right = index === question.answerIndex;
              let state: "idle" | "on" | "miss" = "idle";
              if (picked !== null && right) state = "on";
              else if (selected && !right) state = "miss";
              return (
                <ChoiceSlip
                  key={`${question.id}-${choice}`}
                  text={choice}
                  state={state}
                  disabled={picked !== null || phase !== "battle"}
                  onClick={() => choose(index)}
                />
              );
            })}
          </div>
        </section>
      ) : null}

      {phase === "resolving" && resolution && reportReady ? (
        <ReportPanel res={resolution} onContinue={continueAfterResolution} />
      ) : null}

      {(phase === "intro" || phase === "outro") && currentLine ? (
        <SpeechBox
          art={speakerArt}
          line={currentLine}
          hint={
            phase === "intro"
              ? lastDialogue
                ? "选诗签"
                : "点一下继续"
              : lastDialogue
                ? "收下诗印"
                : "继续"
          }
          showKey={phase === "outro" && lastDialogue}
          onNext={advanceDialogue}
        />
      ) : null}

      {phase === "result" && resultView ? (
        <ResultPanel
          view={resultView}
          mapTo={{ dynastyId: chapter.dynastyId, chapterId: chapter.poetId }}
          onReplay={restartRun}
        />
      ) : null}

      {phase === "lose" ? (
        <section className="pop-in absolute inset-x-2 bottom-[max(1rem,env(safe-area-inset-bottom))] z-20">
          <ArtPanel className="text-center">
            <p className="title-ink text-3xl">本关失败</p>
            <p className="mt-1 text-sm text-ink-soft">诗境还在，可立刻重试。</p>
            <div className="mt-4 flex justify-center gap-3">
              <button type="button" onClick={restartRun} className="tap">
                <WidePlaque>重试</WidePlaque>
              </button>
              <Link
                to="/story/$dynastyId/$chapterId"
                params={{ dynastyId: chapter.dynastyId, chapterId: chapter.poetId }}
                className="tap"
              >
                <WidePlaque>回地图</WidePlaque>
              </Link>
            </div>
          </ArtPanel>
        </section>
      ) : null}
    </Stage>
  );
}

/** 战斗 HUD：玩家血量、妖怪诗魄、题目进度、连击、诗气、当前诗签；诗魄尽时提示收束诗境。 */
function BattleHud({
  playerHp,
  monsterHp,
  concluding,
  questionNo,
  questionTotal,
  combo,
  qi,
  talisman,
  clarityUsed,
  wardUsed,
  echoState,
  onClarity,
}: {
  playerHp: number;
  monsterHp: number;
  concluding: boolean;
  questionNo: number;
  questionTotal: number;
  combo: number;
  qi: number;
  talisman: TalismanId | null;
  clarityUsed: boolean;
  wardUsed: boolean;
  echoState: EchoState;
  onClarity: () => void;
}) {
  return (
    <div className="absolute inset-x-2 top-[5.2rem] z-10 flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2 rounded-lg bg-ink/50 px-2.5 py-1">
        <HpPips value={playerHp} label="血量" />
        <p className="text-[11px] tracking-wider text-paper/90">
          题 {questionNo}/{questionTotal}
        </p>
        <p className="text-[11px] tracking-wider text-paper/90" aria-label={`连击 ${combo}`}>
          连击{" "}
          <span key={combo} className="combo-bump inline-block">
            ×{combo}
          </span>
        </p>
        <HpPips value={monsterHp} label="诗魄" />
      </div>
      {concluding ? (
        <p className="rounded-lg bg-pine/85 px-2.5 py-0.5 text-center text-[10px] tracking-widest text-paper">
          诗魄已尽 · 收束诗境：答完余下诗题方可获胜
        </p>
      ) : null}
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
        {talisman === "clarity" ? (
          <button
            type="button"
            onClick={onClarity}
            disabled={clarityUsed}
            className="tap shrink-0 rounded-md bg-seal/90 px-2 py-0.5 text-[10px] tracking-wider text-paper disabled:bg-ink/60 disabled:text-paper/50"
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
                ? echoState === "armed"
                  ? "回响·已蓄"
                  : echoState === "spent"
                    ? "回响·已收"
                    : "回响·待答"
                : "无诗签"}
          </span>
        )}
      </div>
    </div>
  );
}

/** 诗签三选一：名称、符号、短说明、剩余次数与选中态。 */
function TalismanSlip({ def, selected, onPick }: { def: TalismanDef; selected: boolean; onPick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onPick}
      className={`tap block w-full ${selected ? "picked" : ""}`}
    >
      <span className="relative block overflow-hidden">
        <img
          src={selected ? "/ui/choice-on.png" : "/ui/choice-slip.png"}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-[center_42%]"
        />
        <span className="relative z-10 flex min-h-[3.6rem] w-full items-center gap-2.5 px-4 py-1.5 text-left">
          <span
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 font-display text-lg leading-none ${
              selected ? "border-pine bg-pine text-paper" : "border-ink/25 bg-paper text-ink"
            }`}
          >
            {def.symbol}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-baseline gap-2">
              <span className="title-ink text-base leading-tight">{def.name}</span>
              <span className="shrink-0 text-[10px] tracking-wider text-ink/50">可用 {def.uses} 次</span>
            </span>
            <span className="block text-[10.5px] leading-tight text-ink-soft">{def.description}</span>
          </span>
          {selected ? <span className="shrink-0 text-[10px] tracking-widest text-pine">已选</span> : null}
        </span>
      </span>
    </button>
  );
}

/** resolving 报告层：对错、伤害、连击/诗气变化；答错给正确答案与相邻诗句。 */
function ReportPanel({ res, onContinue }: { res: Resolution; onContinue: () => void }) {
  return (
    <section className="pop-in absolute inset-x-2 bottom-[max(0.6rem,env(safe-area-inset-bottom))] z-20">
      <ArtPanel className="text-center">
        {res.correct ? (
          <>
            <p className="title-ink text-2xl">
              {res.linked ? "连携出手" : "答对"}
              {res.hpDealt ? (
                <span className="ml-2 text-base text-seal">-{res.damage} 诗魄</span>
              ) : (
                <span className="ml-2 text-base text-ink-soft">诗魄已尽</span>
              )}
            </p>
            <p className="mt-1 text-xs tracking-wider text-ink-soft">
              连击 ×{res.comboAfter} · 诗气 +{res.qiGain}
              {res.echoBonus ? ` · 回响 +${ECHO_SCORE_BONUS} 分` : ""}
            </p>
            {res.linkEarned && res.outcome === "next" ? (
              <p className="mt-0.5 text-xs tracking-wider text-pine">
                {res.concluding ? "连携已就绪！收束诗境答对仍加成得分" : "连携已就绪！下次正确造成 2 点伤害"}
              </p>
            ) : null}
            {res.concluding ? (
              <p className="mt-0.5 text-xs tracking-wider text-seal">
                {res.hpDealt ? "妖怪诗魄归零！" : "妖怪诗魄已尽"}尚余 {res.questionsLeft} 题，收束诗境
              </p>
            ) : null}
            {res.outcome === "win" ? (
              <p className="mt-0.5 text-xs tracking-wider text-pine">
                {res.hpDealt ? "妖怪诗魄归零！诗境收束完成" : "最后一题收束完成！"}
              </p>
            ) : null}
          </>
        ) : (
          <>
            <p className="title-ink text-2xl">
              答错
              {res.wardBlocked ? (
                <span className="ml-2 text-base text-pine">护卷挡下了这一击</span>
              ) : (
                <span className="ml-2 text-base text-seal">-1 血</span>
              )}
            </p>
            <p className="poem-line mt-1 text-sm leading-snug text-ink">正确是「{res.answerText}」</p>
            {res.context.map((line) => (
              <p key={line} className="poem-line text-xs leading-snug text-ink-soft">
                {line}
              </p>
            ))}
            <p className="mt-0.5 text-xs tracking-wider text-ink-soft">
              {res.comboBefore > 0 ? `连击 ×${res.comboBefore} 中断` : "连击重新开始"}
              {res.echoLost ? " · 回响散去了" : ""}
            </p>
            {res.outcome === "lose" ? <p className="mt-0.5 text-xs tracking-wider text-seal">血量见底……</p> : null}
          </>
        )}
        <div className="mt-3 flex justify-center">
          <PlaqueButton onClick={onContinue}>{res.outcome === "next" ? "收句" : "继续"}</PlaqueButton>
        </div>
      </ArtPanel>
    </section>
  );
}

/** 结算页：诗印、总分、最高连击、剩余血量、历史最佳与新纪录。 */
function ResultPanel({
  view,
  mapTo,
  onReplay,
}: {
  view: ResultView;
  mapTo: { dynastyId: string; chapterId: string };
  onReplay: () => void;
}) {
  const bestStars = Math.max(view.prevStars, view.stars);
  const bestScore = Math.max(view.prevScore, view.score);
  const bestCombo = Math.max(view.prevCombo, view.maxCombo);
  const scoreRecord = view.score > view.prevScore && view.score > 0;
  const starsRecord = view.stars > view.prevStars;
  return (
    <section className="pop-in absolute inset-x-2 bottom-[max(1rem,env(safe-area-inset-bottom))] z-20">
      <ArtPanel className="text-center">
        <p className="title-ink text-2xl">胜</p>
        <div className="mt-2 flex justify-center gap-2" aria-label={`诗印 ${view.stars} 枚`}>
          {[1, 2, 3].map((n) => (
            <span
              key={n}
              style={{ animationDelay: `${(n - 1) * 90}ms` }}
              className={`seal-pop grid h-9 w-9 place-items-center rounded-full border-2 font-display leading-none ${
                n <= view.stars ? "border-seal bg-seal text-paper" : "border-ink/20 text-ink/25"
              }`}
            >
              印
            </span>
          ))}
        </div>
        {starsRecord || view.firstClear ? (
          <p className="mt-1 text-[11px] tracking-wider text-seal">
            {starsRecord ? "诗印提升！" : ""}
            {starsRecord && view.firstClear ? " · " : ""}
            {view.firstClear ? "首次通关" : ""}
          </p>
        ) : null}
        <p className="mt-1 flex items-baseline justify-center gap-2">
          <span className="text-xs tracking-widest text-ink-soft">总分</span>
          <span className="title-ink text-4xl">{view.score}</span>
          {scoreRecord ? <span className="rounded bg-seal px-1.5 py-0.5 text-[10px] tracking-wider text-paper">新纪录</span> : null}
        </p>
        <p className="mt-1 text-xs tracking-wider text-ink-soft">
          最高连击 ×{view.maxCombo} · 剩余血量 {view.hpLeft}/{LEVEL_START_HP}
        </p>
        <p className="mt-0.5 text-[11px] tracking-wider text-ink/60">
          历史最佳 {bestStars} 印 · {bestScore} 分 · 连击 ×{bestCombo}
        </p>
        <div className="mt-3 flex justify-center gap-3">
          <Link to="/story/$dynastyId/$chapterId" params={mapTo} className="tap" aria-label="收下诗印，回到地图">
            <WidePlaque>收下诗印</WidePlaque>
          </Link>
          <button type="button" onClick={onReplay} className="tap">
            <WidePlaque>再战一次</WidePlaque>
          </button>
        </div>
      </ArtPanel>
    </section>
  );
}

/** 四字牌匾：比 PlaqueFace 更紧的内边距，四字不折行。 */
function WidePlaque({ children }: { children: ReactNode }) {
  return (
    <span className="relative inline-flex min-h-[3.5rem] min-w-[7.2rem] items-center justify-center">
      <img src="/ui/plaque.png" alt="" className="absolute inset-0 h-full w-full object-cover object-[center_42%]" />
      <span className="title-ink relative z-10 whitespace-nowrap px-4 pt-1.5 pb-2.5 text-base leading-none">{children}</span>
    </span>
  );
}

function Fighter({
  name,
  hp,
  frames,
  pose,
  hit,
  align,
  flip,
}: {
  name: string;
  hp: number;
  frames: readonly string[];
  pose: Pose;
  hit: boolean;
  align: "left" | "right";
  flip?: boolean;
}) {
  const shift = pose === "attack" ? "pose-lunge" : pose === "hurt" ? "pose-recoil" : "idle-bob";
  return (
    <div className={`w-[48%] ${align === "right" ? "text-right" : "text-left"}`}>
      <div className={`mb-1 ${align === "right" ? "flex flex-col items-end" : ""}`}>
        <p className="hud-title truncate text-paper">{name}</p>
        <HpPips value={hp} label="" />
      </div>
      <div className={`relative mx-auto flex h-40 items-end justify-center ${hit ? "hit-flash" : ""}`}>
        <span className="sprite-shadow" />
        <div className={flip ? "-scale-x-100" : ""}>
          <div className={shift}>
            <SpriteFrames
              frames={frames}
              fps={0}
              playing={false}
              className="relative z-10 h-40 w-auto max-w-full object-contain object-bottom drop-shadow-lg"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
