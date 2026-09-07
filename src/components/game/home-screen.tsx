import { Link } from "@tanstack/react-router";
import { GAME_BACKGROUNDS } from "@/lib/game/content/meta";
import { LEVEL_COUNT, LEVEL_PASS, QUESTIONS_PER_LEVEL, levelProgress, nextLevelTarget } from "@/lib/game/levels";
import { useSave } from "@/lib/game/save-context";
import { PlaqueFace } from "./choice-slip";
import { Stage, StageHud } from "./stage";

/** 首页数据格：图标 + 数字 + 标签，纸座上的碑刻三格，列间细分隔线。 */
function StatCell({ icon, value, suffix, label }: { icon: string; value: number; suffix?: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <img src={icon} alt="" className="h-7 w-7 object-contain drop-shadow-md" />
      <p className="title-ink text-lg leading-tight">
        {value}
        {suffix ? <span className="text-sm text-ink-soft/80">{suffix}</span> : null}
      </p>
      <p className="text-[10.5px] tracking-widest text-ink-soft">{label}</p>
    </div>
  );
}

/**
 * 首页：游戏标题 + 关卡进度 + 唯一主按钮「继续闯关」。
 * 底部次级导航（文集/诗库/无尽模式/诗册）。
 */
export function HomeScreen() {
  const { save } = useSave();
  const progress = levelProgress(save);
  const nextLevel = nextLevelTarget(save);
  const allCleared = nextLevel === null;

  const mainLabel = allCleared ? "挑战满星" : "继续闯关";
  // 主按钮统一进关卡列表：列表里自带「可挑战」指向与星级目标，不再直达单关
  const mainTo = "/levels";

  return (
    <Stage bg={GAME_BACKGROUNDS.home}>
      <StageHud />

      <div className="absolute inset-x-0 top-[6%] z-10 flex flex-col items-center gap-1">
        <p className="title-art paper-glow text-center text-[2.5rem] leading-tight text-paper">唐小诗环游记</p>
        <p className="paper-glow text-center text-[11px] tracking-[0.42em] text-paper/85">
          探索中国古诗词之美
        </p>
      </div>

      {/* 远征牌：数据三格 + 墨线 + 下一关进度，归入同一座纸面读作一块「战报」；
          位置压在副标题之下，airy 纸底透出庭院场景 */}
      <div className="absolute inset-x-0 top-[19.5%] z-10 flex justify-center px-4">
        <div className="paper-plate paper-plate-ink paper-plate-airy w-full max-w-sm px-3 py-2.5">
          <div className="stat-grid">
            <StatCell icon="/ui/icon-scroll.png" value={progress.cleared} suffix={`/${LEVEL_COUNT}`} label="已通关" />
            <StatCell icon="/ui/icon-star.png" value={progress.stars} label="星星" />
            <StatCell icon="/ui/icon-coin.png" value={save.totalScore} label="总分" />
          </div>
          <div className="ink-divider my-2" aria-hidden>
            <span className="font-display text-[9px]">◈</span>
          </div>
          <p className="mb-1.5 text-center text-[10.5px] tracking-[0.3em] text-ink-soft">
            {allCleared ? "50 关全部通关！" : `下一关 · 第 ${nextLevel} 关`}
          </p>
          <LevelProgressBar cleared={progress.cleared} />
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-[26%] z-10 flex justify-center">
        <div className="relative flex h-40 w-32 items-end justify-center">
          <span className="sprite-shadow" />
          <img
            src="/sprites/hero.png"
            alt="唐小诗"
            onError={(e) => {
              e.currentTarget.style.visibility = "hidden";
            }}
            className="idle-bob relative z-10 h-40 w-auto object-contain object-bottom drop-shadow-lg"
          />
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-[15%] z-20 flex flex-col items-center gap-1 px-4">
        <Link to={mainTo} className="tap tap-deep" aria-label={mainLabel}>
          <PlaqueFace className="scale-110">{mainLabel}</PlaqueFace>
        </Link>
        <p className="paper-glow text-center text-[11px] tracking-widest text-paper/80">
          {`每关 ${QUESTIONS_PER_LEVEL} 题 · 答对 ${LEVEL_PASS} 题过关`}
        </p>
      </div>

      <nav className="dock-fade absolute inset-x-0 bottom-0 z-20 grid grid-cols-4 px-2 pb-[max(1rem,env(safe-area-inset-bottom))] pt-10 opacity-85">
        <Link to="/library" className="tap flex flex-col items-center gap-1 py-2">
          <img src="/ui/icon-story.png" alt="" className="h-8 w-8 object-contain drop-shadow-md" />
          <span className="font-display text-[13px] tracking-[0.18em] text-paper paper-glow">文集</span>
        </Link>
        <Link to="/practice" className="tap flex flex-col items-center gap-1 py-2">
          <img src="/ui/icon-practice.png" alt="" className="h-8 w-8 object-contain drop-shadow-md" />
          <span className="font-display text-[13px] tracking-[0.18em] text-paper paper-glow">诗库</span>
        </Link>
        <Link to="/endless" className="tap flex flex-col items-center gap-1 py-2">
          <img src="/ui/icon-endless.png" alt="" className="h-8 w-8 object-contain drop-shadow-md" />
          <span className="font-display text-[13px] tracking-[0.18em] text-paper paper-glow">无尽模式</span>
        </Link>
        <Link to="/achievements" className="tap flex flex-col items-center gap-1 py-2">
          <img src="/ui/icon-achieve.png" alt="" className="h-8 w-8 object-contain drop-shadow-md" />
          <span className="font-display text-[13px] tracking-[0.18em] text-paper paper-glow">诗册</span>
        </Link>
      </nav>
    </Stage>
  );
}

/** 50 段进度条：已通关亮起，当前关呼吸，未至关沉墨。 */
function LevelProgressBar({ cleared }: { cleared: number }) {
  return (
    <div
      className="flex w-full items-center gap-[2px]"
      aria-label={`已通关 ${cleared} 关`}
    >
      {Array.from({ length: LEVEL_COUNT }, (_, i) => {
        const level = i + 1;
        const done = level <= cleared;
        const current = level === cleared + 1;
        return (
          <span
            key={level}
            className={`h-1.5 flex-1 rounded-full ${
              done
                ? "bg-seal shadow-[0_0_4px_rgb(143_61_50/45%)]"
                : current
                  ? "pip-current"
                  : "bg-ink/15"
            }`}
          />
        );
      })}
    </div>
  );
}
