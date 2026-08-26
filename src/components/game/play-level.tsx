import { Link, useNavigate } from "@tanstack/react-router";
import { levelById, poemById, shuffleQuestions } from "@/lib/game/content";
import { applyLevelWin } from "@/lib/game/progress";
import { useSave } from "@/lib/game/save-context";
import { sfxHit, sfxHurt, sfxTap, sfxWin } from "@/lib/game/sfx";
import { bustOf, FX_BOLT, FX_IMPACT, HERO_ATTACK, HERO_HURT, HERO_IDLE, poseFrames } from "@/lib/game/sprites";
import type { DialogueLine, Question } from "@/lib/game/types";
import { useEffect, useMemo, useState } from "react";
import { ChoiceSlip } from "./choice-slip";
import { HpPips } from "./hp-pips";
import { SpriteFrames } from "./sprite-frames";
import { ArtPanel, Stage, StageHud } from "./stage";

type Phase = "intro" | "battle" | "outro" | "lose";
type Pose = "idle" | "attack" | "hurt";
type Bolt = { id: number; dir: "right" | "left" };

export function PlayLevel({ levelId }: { levelId: string }) {
  const level = levelById(levelId);
  const poem = poemById(level.poemId);
  const { patchSave } = useSave();
  const navigate = useNavigate();
  const deck = useMemo(() => shuffleQuestions(poem), [poem]);
  const [phase, setPhase] = useState<Phase>("intro");
  const [lineIndex, setLineIndex] = useState(0);
  const [qIndex, setQIndex] = useState(0);
  const [playerHp, setPlayerHp] = useState(3);
  const [monsterHp, setMonsterHp] = useState(3);
  const [picked, setPicked] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [shake, setShake] = useState(false);
  const [heroPose, setHeroPose] = useState<Pose>("idle");
  const [bossPose, setBossPose] = useState<Pose>("idle");
  const [bolts, setBolts] = useState<Bolt[]>([]);
  const [impact, setImpact] = useState<"hero" | "boss" | null>(null);
  const [floatText, setFloatText] = useState<{ side: "hero" | "boss"; text: string } | null>(null);

  const lines: DialogueLine[] = phase === "outro" ? level.outro : level.intro;
  const question: Question | undefined = deck[qIndex % deck.length];
  const currentLine = lines[lineIndex];
  const lastDialogue = lineIndex >= lines.length - 1;

  const speakerArt =
    currentLine?.speaker === "tang"
      ? "/sprites/hero-bust.png"
      : currentLine?.name === "李白"
        ? "/sprites/libai-bust.png"
        : bustOf(level.monsterArt);

  async function finishWin() {
    if (saving) return;
    setSaving(true);
    try {
      await patchSave((current) => applyLevelWin(current, level.id, playerHp === 3));
      await navigate({ to: "/story" });
    } catch {
      setSaving(false);
    }
  }

  function retry() {
    setPhase("intro");
    setLineIndex(0);
    setQIndex(0);
    setPlayerHp(3);
    setMonsterHp(3);
    setPicked(null);
    setSaving(false);
    setBolts([]);
    setHeroPose("idle");
    setBossPose("idle");
    setImpact(null);
  }

  function choose(choiceIndex: number) {
    if (picked !== null || !question) return;
    setPicked(choiceIndex);
    const correct = choiceIndex === question.answerIndex;
    const bolt: Bolt = { id: Date.now() + Math.random(), dir: correct ? "right" : "left" };
    setBolts((list) => [...list, bolt]);
    if (correct) {
      setHeroPose("attack");
      sfxHit();
    } else {
      setBossPose("attack");
      sfxHurt();
    }
    window.setTimeout(() => {
      setBolts((list) => list.filter((item) => item.id !== bolt.id));
      setImpact(correct ? "boss" : "hero");
      setHeroPose(correct ? "idle" : "hurt");
      setBossPose(correct ? "hurt" : "idle");
      setFloatText({ side: correct ? "boss" : "hero", text: "-1" });
      setShake(true);
      window.setTimeout(() => setShake(false), 380);
      const nextMonster = correct ? monsterHp - 1 : monsterHp;
      const nextPlayer = correct ? playerHp : playerHp - 1;
      window.setTimeout(() => {
        setImpact(null);
        setFloatText(null);
        setHeroPose("idle");
        setBossPose("idle");
        if (nextMonster <= 0) {
          setMonsterHp(0);
          sfxWin();
          setPhase("outro");
          setLineIndex(0);
          setPicked(null);
          return;
        }
        if (nextPlayer <= 0) {
          setPlayerHp(0);
          setPhase("lose");
          setPicked(null);
          return;
        }
        setMonsterHp(nextMonster);
        setPlayerHp(nextPlayer);
        setQIndex((n) => n + 1);
        setPicked(null);
      }, 420);
    }, 560);
  }

  const heroFrames = poseFrames(heroPose, HERO_IDLE, HERO_ATTACK, HERO_HURT);
  const bossFrames = poseFrames(bossPose, level.monsterIdle, level.monsterAttack, level.monsterHurt);
  const ground = phase === "battle" ? "bottom-[38%]" : "bottom-[24%]";

  return (
    <Stage bg={level.sceneBg} shake={shake}>
      <StageHud title={level.place} backTo="/story" />

      <div className={`absolute inset-x-0 z-10 flex items-end justify-between px-1 ${ground}`}>
        <Fighter
          name="唐小诗"
          hp={playerHp}
          frames={heroFrames}
          pose={heroPose}
          hit={heroPose === "hurt"}
          align="left"
        />
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
        <div key={bolt.id} className="pointer-events-none absolute bottom-[50%] z-20 h-16 w-full">
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
          className={`pointer-events-none absolute bottom-[44%] z-20 ${impact === "boss" ? "right-[8%]" : "left-[8%]"}`}
        >
          <SpriteFrames frames={FX_IMPACT} fps={12} className="h-24 w-24 object-contain" />
        </div>
      ) : null}

      {floatText ? (
        <p
          className={`glyph-burst pointer-events-none absolute bottom-[54%] z-30 font-display text-3xl text-seal ${
            floatText.side === "boss" ? "right-[18%]" : "left-[18%]"
          }`}
        >
          {floatText.text}
        </p>
      ) : null}

      {phase === "battle" && question ? (
        <section className="pop-in absolute inset-x-0 bottom-0 z-20 px-2 pb-[max(0.6rem,env(safe-area-inset-bottom))] pt-8">
          <p className="title-art paper-glow mb-1 px-3 text-center text-xl leading-snug text-paper">
            {question.prompt}
          </p>
          <div>
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
                  onClick={() => choose(index)}
                />
              );
            })}
          </div>
        </section>
      ) : null}

      {(phase === "intro" || phase === "outro") && currentLine ? (
        <SpeechBox
          art={speakerArt}
          line={currentLine}
          hint={
            phase === "intro"
              ? lastDialogue
                ? "开战"
                : "点一下继续"
              : lastDialogue
                ? saving
                  ? "正在记下钥匙"
                  : "收下钥匙"
                : "继续"
          }
          showKey={phase === "outro" && lastDialogue}
          disabled={saving}
          onNext={() => {
            sfxTap();
            if (phase === "intro") {
              if (lastDialogue) setPhase("battle");
              else setLineIndex(lineIndex + 1);
              return;
            }
            if (lastDialogue) void finishWin();
            else setLineIndex(lineIndex + 1);
          }}
        />
      ) : null}

      {phase === "lose" ? (
        <div className="pop-in absolute inset-x-2 bottom-4 z-20">
          <ArtPanel className="px-6 py-8 text-center">
            <p className="title-ink text-3xl">本关失败</p>
            <p className="mt-1 text-sm text-ink-soft">可立刻重试，进度还在。</p>
            <div className="mt-4 flex justify-center gap-8">
              <button type="button" onClick={retry} className="title-ink text-2xl">
                重试
              </button>
              <Link to="/story" className="title-ink text-2xl opacity-60">
                回地图
              </Link>
            </div>
          </ArtPanel>
        </div>
      ) : null}
    </Stage>
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
  const motion = pose === "attack" ? "pose-lunge" : pose === "hurt" ? "pose-recoil" : "idle-bob";
  return (
    <div className={`w-[48%] ${align === "right" ? "text-right" : "text-left"}`}>
      <div className={`mb-1 ${align === "right" ? "flex flex-col items-end" : ""}`}>
        <p className="hud-title text-paper">{name}</p>
        <HpPips value={hp} label="" />
      </div>
      <div className={`relative mx-auto flex h-48 items-end justify-center ${hit ? "hit-flash" : ""}`}>
        <span className="sprite-shadow" />
        <div className={flip ? "-scale-x-100" : ""}>
          <div className={motion}>
            <SpriteFrames
              frames={frames}
              fps={pose === "idle" ? 0 : 8}
              playing={pose !== "idle"}
              className="relative z-10 h-48 w-auto max-w-full object-contain object-bottom drop-shadow-lg"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function SpeechBox({
  art,
  line,
  hint,
  showKey,
  disabled,
  onNext,
}: {
  art: string;
  line: DialogueLine;
  hint: string;
  showKey?: boolean;
  disabled?: boolean;
  onNext: () => void;
}) {
  const [shown, setShown] = useState("");
  const done = shown.length >= line.text.length;

  useEffect(() => {
    setShown("");
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setShown(line.text.slice(0, i));
      if (i >= line.text.length) window.clearInterval(id);
    }, 28);
    return () => window.clearInterval(id);
  }, [line.text]);

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (!done) {
          setShown(line.text);
          return;
        }
        onNext();
      }}
      className="pop-in absolute inset-x-2 bottom-[max(0.6rem,env(safe-area-inset-bottom))] z-20 h-[168px] text-left"
    >
      <img src="/ui/speech-panel.png" alt="" className="absolute inset-0 h-full w-full object-fill" />
      <div className="relative z-10 flex h-full items-end gap-3 px-5 pb-4 pt-6">
        <img src={art} alt="" className="h-[7.5rem] w-[4.4rem] shrink-0 object-contain object-bottom" />
        <div className="min-w-0 flex-1 pb-1">
          {line.name ? (
            <p className="title-ink text-lg">{line.name}</p>
          ) : (
            <p className="text-[11px] tracking-widest text-ink-soft">旁白</p>
          )}
          <p className="poem-line mt-1 min-h-12 text-sm leading-relaxed text-ink">
            {shown}
            {!done ? <span className="caret">▌</span> : null}
          </p>
          <div className="mt-1 flex items-center justify-end gap-2">
            {showKey ? <img src="/sprites/key.png" alt="" className="h-6 w-6 object-contain idle-bob" /> : null}
            <p className="text-[11px] tracking-widest text-ink/45">{hint}</p>
          </div>
        </div>
      </div>
    </button>
  );
}
