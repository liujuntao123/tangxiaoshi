import { Link, useNavigate } from "@tanstack/react-router";
import { chapterOfLevel, levelById, poemById, poetBust, shuffleQuestions } from "@/lib/game/content";
import { preloadImages } from "@/lib/game/preload";
import { applyLevelWin } from "@/lib/game/progress";
import { useSave } from "@/lib/game/save-context";
import { sfxHit, sfxHurt, sfxTap, sfxWin } from "@/lib/game/sfx";
import { bustOf, FX_BOLT, FX_IMPACT, HERO_ATTACK, HERO_HURT, HERO_IDLE, poseFrames } from "@/lib/game/sprites";
import type { DialogueLine, Question } from "@/lib/game/types";
import { useEffect, useMemo, useState } from "react";
import { ChoiceSlip, PlaqueButton, PlaqueFace } from "./choice-slip";
import { HpPips } from "./hp-pips";
import { SpeechBox } from "./speech-box";
import { SpriteFrames } from "./sprite-frames";
import { ArtPanel, Stage, StageHud } from "./stage";

type Phase = "intro" | "battle" | "outro" | "lose";
type Pose = "idle" | "attack" | "hurt";
type Bolt = { id: number; dir: "right" | "left" };

export function PlayLevel({ levelId }: { levelId: string }) {
  const level = levelById(levelId);
  const chapter = chapterOfLevel(level);
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

  const lines: DialogueLine[] = phase === "outro" ? level.outro : level.intro;
  const question: Question | undefined = deck[qIndex % deck.length];
  const currentLine = lines[lineIndex];
  const lastDialogue = lineIndex >= lines.length - 1;

  const speakerArt =
    currentLine?.speaker === "tang"
      ? "/sprites/hero-bust.png"
      : currentLine?.name === chapter.poetName
        ? poetBust(chapter.poetId)
        : bustOf(level.monsterArt);

  async function finishWin() {
    if (saving) return;
    setSaving(true);
    try {
      await patchSave((current) => applyLevelWin(current, level.id, playerHp === 3));
      await navigate({
        to: "/story/$dynastyId/$chapterId",
        params: { dynastyId: chapter.dynastyId, chapterId: chapter.poetId },
      });
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
  // 答题时角色抬高，给底部选项留空，避免木牍盖住立绘
  const ground = phase === "battle" ? "bottom-[46%]" : "bottom-[24%]";

  return (
    <Stage bg={level.sceneBg} shake={shake}>
      <StageHud title={`${chapter.poetName} · ${level.place}`} backTo={`/story/${chapter.dynastyId}/${chapter.poetId}`} />

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

      {phase === "battle" && question ? (
        <section className="pop-in absolute inset-x-0 bottom-0 z-20 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
          <p className="title-art paper-glow mb-0.5 px-3 text-center text-[clamp(0.95rem,4.2vw,1.2rem)] leading-snug text-paper">
            {question.prompt}
          </p>
          <div className="flex flex-col gap-0">
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
          <ArtPanel className="text-center">
            <p className="title-ink text-3xl">本关失败</p>
            <p className="mt-1 text-sm text-ink-soft">可立刻重试，进度还在。</p>
            <div className="mt-4 flex justify-center gap-3">
              <PlaqueButton onClick={retry}>重试</PlaqueButton>
              <Link
                to="/story/$dynastyId/$chapterId"
                params={{ dynastyId: chapter.dynastyId, chapterId: chapter.poetId }}
                className="tap"
              >
                <PlaqueFace>回地图</PlaqueFace>
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
  const shift = pose === "attack" ? "translate-x-2" : pose === "hurt" ? "-translate-x-2" : "idle-bob";
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
