import { useNavigate } from "@tanstack/react-router";
import { KEYS_TO_BOSS, LEVELS, MAP_START } from "@/lib/game/content";
import { isLevelUnlocked } from "@/lib/game/progress";
import { useSave } from "@/lib/game/save-context";
import { sfxTap } from "@/lib/game/sfx";
import { walkDir, type WalkDir } from "@/lib/game/sprites";
import { useEffect, useMemo, useRef, useState } from "react";
import { Stage, StageHud } from "./stage";

const POS_KEY = "tx-map-pos";

type Pos = { x: number; y: number };

function readPos(): Pos {
  try {
    const raw = sessionStorage.getItem(POS_KEY);
    if (raw) return JSON.parse(raw) as Pos;
  } catch {
    /* ignore */
  }
  return MAP_START;
}

function writePos(pos: Pos) {
  sessionStorage.setItem(POS_KEY, JSON.stringify(pos));
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function StoryMap() {
  const { save } = useSave();
  const navigate = useNavigate();
  const [pos, setPos] = useState<Pos>(MAP_START);
  const [walking, setWalking] = useState(false);
  const [dir, setDir] = useState<WalkDir>("down");
  const posRef = useRef(pos);
  const busy = useRef(false);

  useEffect(() => {
    const saved = readPos();
    setPos(saved);
    posRef.current = saved;
  }, []);

  const points = useMemo(() => [MAP_START, ...LEVELS.map((level) => level.map)], []);
  const path = points.map((p) => `${p.x},${p.y}`).join(" ");

  async function goToLevel(levelId: string) {
    if (busy.current) return;
    const level = LEVELS.find((item) => item.id === levelId);
    if (!level || !isLevelUnlocked(levelId, save)) return;
    busy.current = true;
    sfxTap();

    const fromIndex = nearestIndex(posRef.current, points);
    const toIndex = LEVELS.findIndex((item) => item.id === levelId) + 1;
    const slice =
      fromIndex <= toIndex
        ? points.slice(fromIndex + 1, toIndex + 1)
        : points.slice(toIndex, fromIndex).reverse();

    const skipMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!skipMotion && slice.length > 0) {
      setWalking(true);
      for (const next of slice) {
        setDir(walkDir(posRef.current, next));
        posRef.current = next;
        setPos(next);
        writePos(next);
        await wait(520);
      }
      setWalking(false);
      await wait(140);
    } else {
      posRef.current = level.map;
      setPos(level.map);
      writePos(level.map);
    }

    await navigate({ to: "/play/$levelId", params: { levelId } });
    busy.current = false;
  }

  return (
    <Stage bg="/art/map.jpg">
      <StageHud title="李白章" backTo="/" />
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        <polyline
          points={path}
          fill="none"
          stroke="rgba(243,235,224,0.7)"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeDasharray="2.8 2.2"
        />
      </svg>

      {LEVELS.map((level) => {
        const unlocked = isLevelUnlocked(level.id, save);
        const cleared = save.clearedLevels.includes(level.id);
        return (
          <button
            key={level.id}
            type="button"
            disabled={!unlocked || walking}
            onClick={() => void goToLevel(level.id)}
            style={{ left: `${level.map.x}%`, top: `${level.map.y}%` }}
            className="absolute z-10 w-20 -translate-x-1/2 -translate-y-[108%] text-center"
          >
            <img
              src={level.monsterArt}
              alt=""
              className={`mx-auto h-11 w-11 object-contain drop-shadow ${
                unlocked ? "" : "opacity-45 grayscale"
              }`}
            />
            <span
              className={`paper-glow mt-0.5 inline-block font-display text-[11px] leading-tight tracking-wide text-paper ${
                unlocked ? "" : "opacity-50"
              }`}
            >
              {cleared ? "通关 · " : unlocked ? "" : "锁 · "}
              {level.place}
            </span>
          </button>
        );
      })}

      <div
        className="absolute z-20 w-11"
        style={{
          left: `${pos.x}%`,
          top: `${pos.y}%`,
          transform: "translate(-50%, -90%)",
          transition: walking ? "left 0.5s linear, top 0.5s linear" : "none",
        }}
      >
        <span className="sprite-shadow" />
        <div className={dir === "left" ? "-scale-x-100" : ""}>
          <img
            src="/sprites/hero.png"
            alt="唐小诗"
            className={`relative z-10 h-12 w-10 object-contain drop-shadow-lg ${walking ? "idle-bob" : ""}`}
          />
        </div>
      </div>

      <p className="paper-glow absolute inset-x-0 bottom-4 z-20 px-4 text-center text-xs text-paper">
        点地点，唐小诗会走过去。集齐 {KEYS_TO_BOSS} 把钥匙进魔王殿。
      </p>
    </Stage>
  );
}

function nearestIndex(pos: Pos, points: Pos[]): number {
  let best = 0;
  let dist = Infinity;
  points.forEach((point, index) => {
    const d = (point.x - pos.x) ** 2 + (point.y - pos.y) ** 2;
    if (d < dist) {
      dist = d;
      best = index;
    }
  });
  return best;
}
