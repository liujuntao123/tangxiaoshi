import { Link } from "@tanstack/react-router";
import { GAME_BACKGROUNDS } from "@/lib/game/content/meta";
import { LEVEL_COUNT, LEVEL_PASS, QUESTIONS_PER_LEVEL, levelProgress, nextLevelTarget } from "@/lib/game/levels";
import { useSave } from "@/lib/game/save-context";
import { PlaqueFace } from "./choice-slip";
import { Stage, StageHud } from "./stage";

/** 首页数据格：图标 + 数字 + 标签，借助游戏 UI 而不是纯文字堆砌。 */
function StatCell({ icon, value, suffix, label }: { icon: string; value: number; suffix?: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <img src={icon} alt="" className="h-7 w-7 object-contain drop-shadow-md" />
      <p className="hud-title text-paper">
        {value}
        {suffix ? <span className="text-sm text-paper/75">{suffix}</span> : null}
      </p>
      <p className="paper-glow text-[10.5px] tracking-widest text-paper/80">{label}</p>
    </div>
  );
}

/**
 * 首页：游戏标题 + 关卡进度 + 唯一主按钮「继续闯关」。
 * 底部次级导航（文集/诗库/墨潮试炼/诗册）。
 */
export function HomeScreen() {
  const { save } = useSave();
  const progress = levelProgress(save);
  const nextLevel = nextLevelTarget(save);
  const allCleared = nextLevel === null;

  const mainLabel = allCleared ? "挑战满星" : "继续闯关";
  const mainTo = allCleared ? "/levels" : "/levels/$levelId";
  const mainParams = allCleared ? undefined : { levelId: String(nextLevel) };

  return (
    <Stage bg={GAME_BACKGROUNDS.home}>
      <StageHud />

      <div className="absolute inset-x-0 top-[7%] z-10 flex flex-col items-center gap-1">
        <p className="title-art paper-glow text-center text-[2.5rem] leading-tight text-paper">唐小诗环游记</p>
        <p className="paper-glow text-center text-[11px] tracking-[0.42em] text-paper/85">
          探索中国古诗词之美
        </p>
      </div>

      {/* 数据格：卷轴=已通关，星=关卡星星，铜钱=环游总分 */}
      <div className="absolute inset-x-0 top-[17.5%] z-10 flex justify-center px-4">
        <div className="scenery-plate grid w-full max-w-sm grid-cols-3 gap-1 px-3 py-2.5">
          <StatCell icon="/ui/icon-scroll.png" value={progress.cleared} suffix={`/${LEVEL_COUNT}`} label="已通关" />
          <StatCell icon="/ui/icon-star.png" value={progress.stars} label="星星" />
          <StatCell icon="/ui/icon-coin.png" value={save.totalScore} label="总分" />
        </div>
      </div>

      {/* 关卡进度条 */}
      <div className="absolute inset-x-0 top-[28%] z-10 flex flex-col items-center gap-2 px-6">
        <LevelProgressBar cleared={progress.cleared} />
        <p className="caption-pill">
          {allCleared ? "50 关全部通关！" : `下一关 · 第 ${nextLevel} 关`}
        </p>
      </div>

      <div className="absolute inset-x-0 bottom-[27%] z-10 flex justify-center">
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
        <Link to={mainTo} params={mainParams} className="tap tap-deep" aria-label={mainLabel}>
          <PlaqueFace className="scale-110">{mainLabel}</PlaqueFace>
        </Link>
        <p className="paper-glow text-center text-[11px] tracking-widest text-paper/80">
          {`每关 ${QUESTIONS_PER_LEVEL} 题 · 答对 ${LEVEL_PASS} 题过关`}
        </p>
        <Link
          to="/levels"
          className="tap paper-glow mt-0.5 text-[11px] tracking-widest text-paper/80 underline underline-offset-4"
        >
          全部关卡
        </Link>
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
          <span className="font-display text-[13px] tracking-[0.18em] text-paper paper-glow">墨潮试炼</span>
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
      className="scenery-plate flex w-full max-w-sm items-center gap-1 rounded-full px-3 py-2"
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
              done ? "bg-seal" : current ? "jdot-current bg-paper/70" : "bg-paper/20"
            }`}
          />
        );
      })}
    </div>
  );
}
