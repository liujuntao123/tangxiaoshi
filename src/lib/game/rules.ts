/**
 * 纯游戏规则：存档规范化、评级、得分、历史最佳合并与目标选择。
 *
 * 设计依据 docs/game-design.md §5.3 / §7 / §8。本模块只依赖 `./types` 的
 * 类型（类型导入在 node 下会被擦除），不引入题库/剧情内容，因此可以直接被
 * `node --test`（--experimental-strip-types）加载做纯函数测试。progress.ts
 * 在其上补充依赖关卡/章节内容的封装并统一对外导出。
 */
import type {
  ContinueTarget,
  LevelRecord,
  LevelRunResult,
  PlayerSave,
  Stars,
  TalismanDef,
} from "./types";

/** 玩家血量与妖怪诗魄上限（docs/game-design.md §4）。 */
export const LEVEL_START_HP = 3;
export const MONSTER_START_HP = 3;

/** 得分口径（docs/game-design.md §7.2）。 */
export const BASE_ANSWER_SCORE = 100;
export const COMBO_BONUS_STEP = 25;
/** 连击加成上限由实现控制在合理范围：最多 +100（第 5 连击起封顶）。 */
export const COMBO_BONUS_CAP = 100;
/** 连携正确额外加分。 */
export const LINK_BONUS = 100;

/** 无尽十连击成就阈值。 */
export const TEN_STREAK = 10;

/** 三枚诗签的定义；战斗界面按名称/符号/说明/剩余次数渲染。 */
export const TALISMANS: TalismanDef[] = [
  {
    id: "clarity",
    name: "明心",
    symbol: "明",
    description: "战斗中使用一次，隐藏两个错误选项",
    uses: 1,
  },
  {
    id: "ward",
    name: "护卷",
    symbol: "护",
    description: "第一次答错不扣血，但仍断连",
    uses: 1,
  },
  {
    id: "echo",
    name: "回响",
    symbol: "响",
    description: "第一次答对后，下一题正确获得额外分数与诗气",
    uses: 1,
  },
];

const TALISMAN_IDS = new Set<string>(TALISMANS.map((talisman) => talisman.id));

export const EMPTY_LEVEL_RECORD: LevelRecord = {
  bestStars: 0,
  bestScore: 0,
  bestCombo: 0,
  attempts: 0,
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function unique(items: string[]): string[] {
  return [...new Set(items)];
}

function nonNegativeInt(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}

function clampInt(value: unknown, min: number, max: number): number {
  const n = typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : min;
  return Math.min(Math.max(n, min), max);
}

function clampStars(value: unknown): Stars {
  return clampInt(value, 0, 3) as Stars;
}

/**
 * 把任意来源（旧存档、数据库行、网络数据）的对象整理成完整合法的 PlayerSave：
 * 缺失字段补默认值，非法字段回退默认值，不抛错、不修改入参。
 */
export function normalizeSave(input: unknown): PlayerSave {
  if (!isPlainObject(input)) {
    return {
      clearedLevels: [],
      keysOwned: 0,
      achievements: [],
      endlessBestStreak: 0,
      endlessBestScore: 0,
      levelRecords: {},
      totalScore: 0,
    };
  }
  const levelRecords: Record<string, LevelRecord> = {};
  const rawRecords = input.levelRecords;
  if (isPlainObject(rawRecords)) {
    for (const [levelId, raw] of Object.entries(rawRecords)) {
      if (!levelId) continue;
      const record = normalizeLevelRecord(raw);
      if (record) levelRecords[levelId] = record;
    }
  }
  return {
    clearedLevels: unique(stringList(input.clearedLevels)),
    keysOwned: nonNegativeInt(input.keysOwned),
    achievements: unique(stringList(input.achievements)),
    endlessBestStreak: nonNegativeInt(input.endlessBestStreak),
    endlessBestScore: nonNegativeInt(input.endlessBestScore),
    levelRecords,
    totalScore: nonNegativeInt(input.totalScore),
  };
}

/** 非法关卡记录返回 null（调用方丢弃该条目），字段非法逐项回退默认值。 */
export function normalizeLevelRecord(value: unknown): LevelRecord | null {
  if (!isPlainObject(value)) return null;
  return {
    bestStars: clampStars(value.bestStars),
    bestScore: nonNegativeInt(value.bestScore),
    bestCombo: nonNegativeInt(value.bestCombo),
    attempts: nonNegativeInt(value.attempts),
  };
}

/** 把战斗组件上报的本局表现整理成合法 LevelRunResult（越界钳制、非法回退）。 */
export function normalizeRunResult(run: LevelRunResult): LevelRunResult {
  const talisman = typeof run.talisman === "string" && TALISMAN_IDS.has(run.talisman) ? run.talisman : null;
  return {
    levelId: typeof run.levelId === "string" ? run.levelId : "",
    won: run.won === true,
    hpLeft: clampInt(run.hpLeft, 0, LEVEL_START_HP),
    maxCombo: nonNegativeInt(run.maxCombo),
    score: nonNegativeInt(run.score),
    mistakes: nonNegativeInt(run.mistakes),
    talisman,
  };
}

/**
 * 评级（docs/game-design.md §7.1）：
 * 1 星完成关卡；2 星胜利时至少剩 2 血或最高连击达 3；
 * 3 星全程未掉血并全题答对（护卷挡下也算答错，拿不到 3 星）。
 */
export function starsForRun(
  run: Pick<LevelRunResult, "won" | "hpLeft" | "maxCombo" | "mistakes">,
): Stars {
  if (!run.won) return 0;
  const hpLeft = clampInt(run.hpLeft, 0, LEVEL_START_HP);
  if (hpLeft >= LEVEL_START_HP && run.mistakes <= 0) return 3;
  if (hpLeft >= 2 || run.maxCombo >= 3) return 2;
  return 1;
}

/**
 * 单题得分：普通正确 100 分，每多 1 层连击额外 +25（封顶 +100），
 * 连携正确额外 +100。`combo` 为本题答对后的连击数（从 1 起）。
 */
export function scoreForAnswer(input: { combo: number; linked?: boolean }): number {
  const combo = Number.isFinite(input.combo) ? Math.trunc(input.combo) : 1;
  const step = Math.max(combo - 1, 0);
  const comboBonus = Math.min(step * COMBO_BONUS_STEP, COMBO_BONUS_CAP);
  return BASE_ANSWER_SCORE + comboBonus + (input.linked === true ? LINK_BONUS : 0);
}

/** 历史只保留最高星级/分数/连击，attempts 每完成一局 +1。 */
export function mergeLevelRecord(previous: LevelRecord | undefined, run: LevelRunResult): LevelRecord {
  const prev = previous ?? EMPTY_LEVEL_RECORD;
  const safe = normalizeRunResult(run);
  return {
    bestStars: Math.max(prev.bestStars, starsForRun(safe)) as Stars,
    bestScore: Math.max(prev.bestScore, safe.score),
    bestCombo: Math.max(prev.bestCombo, safe.maxCombo),
    attempts: prev.attempts + 1,
  };
}

/**
 * 记录一局成绩（胜利或失败都可调用）：合并关卡历史最佳并累加总分。
 * 不改动 clearedLevels / 钥匙 / 成就 —— 那些属于通关进程，见 applyLevelWinCore。
 */
export function applyLevelRun(save: PlayerSave, run: LevelRunResult): PlayerSave {
  const base = normalizeSave(save);
  const safe = normalizeRunResult(run);
  if (!safe.levelId) return base;
  return {
    ...base,
    levelRecords: {
      ...base.levelRecords,
      [safe.levelId]: mergeLevelRecord(base.levelRecords[safe.levelId], safe),
    },
    totalScore: base.totalScore + safe.score,
  };
}

/**
 * applyLevelWin 的兼容层：旧调用只传“是否满血”布尔值。
 * 满血 → 3 星条件成立；不满血无法还原真实血量/连击，保守记 1 星。
 * 阶段 B 的战斗结算应改为直接传 LevelRunResult。
 */
export function levelRunFromLegacy(levelId: string, runOrFullHp: LevelRunResult | boolean): LevelRunResult {
  if (typeof runOrFullHp !== "boolean") return normalizeRunResult(runOrFullHp);
  const fullHp = runOrFullHp;
  return normalizeRunResult({
    levelId,
    won: true,
    hpLeft: fullHp ? LEVEL_START_HP : 1,
    maxCombo: 0,
    score: 0,
    mistakes: fullHp ? 0 : 1,
  });
}

/** applyLevelWinCore 需要的关卡/章节事实，由 progress.ts 用内容数据填充。 */
export type LevelWinWorld = {
  isBoss: boolean;
  /** 本章全部关卡（含 boss），用于按通关进度重算钥匙数。 */
  chapterLevels: { id: string; boss: boolean }[];
  /** boss 胜利时救出诗人的成就 id；非 boss 为 null。 */
  poetAchievementId: string | null;
  /** 本次胜利使朝代集齐时的成就 id；否则为 null。 */
  dynastyAchievementId: string | null;
};

/**
 * 通关写入：记录成绩 + 计入通关 + 钥匙/成就。钥匙按通关的非 boss 关卡数重算，
 * 重战不重复增加；成就只在本次为胜利时授予。
 */
export function applyLevelWinCore(
  save: PlayerSave,
  levelId: string,
  run: LevelRunResult,
  world: LevelWinWorld,
): PlayerSave {
  const base = applyLevelRun(save, run);
  const safe = normalizeRunResult(run);
  const clearedLevels =
    safe.won && !base.clearedLevels.includes(levelId)
      ? [...base.clearedLevels, levelId]
      : base.clearedLevels;
  const achievements = new Set(base.achievements);
  if (safe.won && safe.hpLeft >= LEVEL_START_HP && safe.mistakes <= 0) {
    achievements.add("no-damage");
  }
  if (safe.won && world.isBoss) {
    if (world.poetAchievementId) achievements.add(world.poetAchievementId);
    if (world.dynastyAchievementId) achievements.add(world.dynastyAchievementId);
  }
  const keysOwned = world.chapterLevels.filter(
    (level) => !level.boss && clearedLevels.includes(level.id),
  ).length;
  return { ...base, clearedLevels, keysOwned, achievements: [...achievements] };
}

/** 无尽一局结束：连对刷新双最佳，达到阈值给“十连击”成就。 */
export function applyEndlessRun(save: PlayerSave, score: number): PlayerSave {
  const base = normalizeSave(save);
  const streak = typeof score === "number" && Number.isFinite(score) ? Math.max(0, Math.trunc(score)) : 0;
  const achievements = new Set(base.achievements);
  if (streak >= TEN_STREAK) achievements.add("ten-streak");
  return {
    ...base,
    achievements: [...achievements],
    endlessBestScore: Math.max(base.endlessBestScore, streak),
    endlessBestStreak: Math.max(base.endlessBestStreak, streak),
  };
}

/** 继续历险目标的可测核心：levels 按游玩顺序排列。 */
export type LevelProgressNode = {
  id: string;
  unlocked: boolean;
  cleared: boolean;
};

/**
 * 首页“继续历险”（docs/game-design.md §8）：最早一个已解锁且未通关的关卡；
 * 全部通关时定位到最近通关关卡并改为“再战提分”；无关卡返回 null。
 */
export function pickContinueTarget(levels: readonly LevelProgressNode[]): ContinueTarget | null {
  const next = levels.find((level) => level.unlocked && !level.cleared);
  if (next) return { levelId: next.id, replay: false };
  for (let i = levels.length - 1; i >= 0; i -= 1) {
    const level = levels[i];
    if (level && level.cleared) return { levelId: level.id, replay: true };
  }
  return null;
}

/** 全部关卡的诗印总数（章节地图/成就页展示用）。 */
export function totalStars(save: PlayerSave): number {
  return Object.values(normalizeSave(save).levelRecords).reduce(
    (sum, record) => sum + record.bestStars,
    0,
  );
}
