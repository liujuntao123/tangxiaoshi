/**
 * 关卡系统（ADR-0018）：平铺关卡 + 每关 10 题 + 道具奖励。
 *
 * - 关卡只有序号（第 1 关…第 50 关），没有难度维度；顺序解锁，过关即开下一关。
 * - 每关 10 道题来自 10 首不同的诗（一诗一题），另备 3 道补答题供「补答」道具换题。
 * - 出题序列由玩家 userId 派生：同一玩家的每关题目永远固定，不同玩家互不相同，
 *   因此玩家之间无法互相透题。
 * - 题目不重复：全库诗按玩家种子确定性洗牌后顺序切段，关卡之间占用的诗互不重叠。
 *
 * 本模块只依赖 `./types`，不引入内容库（bank.json），可被 `node --test` 直接加载；
 * 与真实题库的绑定（POEMS + userId）见 progress.ts 的 levelPlanFor。
 */
import {
  EMPTY_INVENTORY,
  isItemId,
  ITEM_IDS,
  type Inventory,
  type ItemId,
  type PlayerSave,
  type Poem,
  type Question,
  type Stars,
} from "./types.ts";

/** 关卡总数：一次完整远征的全部关卡。 */
export const LEVEL_COUNT = 50;
/** 每关正式题目数。 */
export const QUESTIONS_PER_LEVEL = 10;
/** 每关备用题数（被「补答」换掉的题目由此补位）。 */
export const SPARES_PER_LEVEL = 3;
/** 每关占用诗数 = 正式题 + 备用题（一诗一题）。 */
export const POEMS_PER_LEVEL = QUESTIONS_PER_LEVEL + SPARES_PER_LEVEL;
/** 过关线：答对 6 题过关。 */
export const LEVEL_PASS = 6;
/** 关卡星级口径：零答错三星，答错不超过 2 两星，其余一星。 */
export const LEVEL_STAR_MISTAKES = 2;

export type PlanPoem = Pick<Poem, "id" | "title" | "authorName" | "lines" | "background" | "questions">;

/** 关卡里的一道题：题目连同它所属的诗（来源展示与错题反馈用）。 */
export type PlanQuestion = { poem: PlanPoem; question: Question };

export type LevelPlan = {
  /** 1 起的关卡序号。 */
  level: number;
  /** 正式 10 题。 */
  questions: PlanQuestion[];
  /** 备用题（正常流程不会出场）。 */
  spares: PlanQuestion[];
};

/** 关卡道具定义：名称即用途，界面直接展示。 */
export const ITEM_DEFS: Record<ItemId, { name: string; desc: string }> = {
  reveal: { name: "排除", desc: "隐藏本题两个错误选项" },
  redo: { name: "补答", desc: "答错时换一道新题补位，本题不计" },
  double: { name: "双倍", desc: "接下来第一次答对，得分翻倍" },
};

/** mulberry32：小而够用的确定性随机（选卡/发奖共用）。 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a 32 位：把玩家 id 折叠成稳定种子。 */
export function hashString(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** 玩家出题种子：只由 userId 决定，跨设备、跨会话一致。 */
export function levelSeed(userId: string): number {
  return hashString(`level-plan#${userId}`);
}

/** 确定性洗牌：返回副本，不修改入参；同一 seed 永远得到同一顺序。 */
export function deterministicShuffle<T>(items: readonly T[], seed: number): T[] {
  const copy = [...items];
  const rng = mulberry32(seed);
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const a = copy[i];
    const b = copy[j];
    if (a === undefined || b === undefined) continue;
    copy[i] = b;
    copy[j] = a;
  }
  return copy;
}

/**
 * 玩家的全库诗顺序：同一玩家固定，不同玩家不同。
 * 关卡按 13 首一段顺序占用，保证关卡之间零重复。
 */
export function poemOrder<T extends PlanPoem>(poems: readonly T[], userId: string): T[] {
  return deterministicShuffle(poems, levelSeed(userId));
}

/** 一首诗抽一题：按关卡独立的随机流选择，诗内 5 题都可能出场。 */
function pickQuestion<T extends PlanPoem>(poem: T, rng: () => number): PlanQuestion {
  const pool = poem.questions.length > 0 ? poem.questions : undefined;
  if (!pool) throw new Error(`poem ${poem.id} has no questions`);
  const question = pool[Math.floor(rng() * pool.length) % pool.length];
  return { poem, question: question as Question };
}

/**
 * 生成某一关的完整出题计划（纯函数）：
 * 全库诗按玩家顺序切段，第 k 关占用第 [(k-1)*13, k*13) 首；
 * 前 10 首出正式题，后 3 首出备用题。
 */
export function buildLevelPlan(poems: readonly PlanPoem[], userId: string, level: number): LevelPlan {
  if (!Number.isInteger(level) || level < 1 || level > LEVEL_COUNT) {
    throw new Error(`level out of range: ${level}`);
  }
  const order = poemOrder(poems, userId);
  if (order.length === 0) throw new Error("poem bank is empty");
  const start = (level - 1) * POEMS_PER_LEVEL;
  const rng = mulberry32((levelSeed(userId) ^ Math.imul(level, 0x9e3779b9)) >>> 0);
  const take = (offset: number): PlanQuestion => {
    // 题库不足以铺满全部关卡时回绕复用（当前 2147 首 > 50 关 × 13 首，不会触发）。
    const poem = order[(start + offset) % order.length];
    return pickQuestion(poem as PlanPoem, rng);
  };
  const questions = Array.from({ length: QUESTIONS_PER_LEVEL }, (_, i) => take(i));
  const spares = Array.from({ length: SPARES_PER_LEVEL }, (_, i) => take(QUESTIONS_PER_LEVEL + i));
  return { level, questions, spares };
}

/** 关卡星级：过关前提下按答错数评级（三星要求零答错）。 */
export function starsForLevelRun(outcome: { won: boolean; mistakes: number }): Stars {
  if (!outcome.won) return 0;
  const mistakes = Number.isFinite(outcome.mistakes) ? Math.max(0, Math.trunc(outcome.mistakes)) : 0;
  if (mistakes <= 0) return 3;
  if (mistakes <= LEVEL_STAR_MISTAKES) return 2;
  return 1;
}

export function levelStars(save: PlayerSave, level: number): Stars {
  const value = save.levelStars[String(level)];
  return typeof value === "number" && value >= 0 && value <= 3 ? (value as Stars) : 0;
}

/** 关卡顺序解锁：第 1 关始终开放，其余需先过前一关。 */
export function isLevelUnlocked(save: PlayerSave, level: number): boolean {
  if (level < 1 || level > LEVEL_COUNT) return false;
  return level === 1 || levelStars(save, level - 1) > 0;
}

/** 全部关卡的已通关数与星星总数。 */
export function levelProgress(save: PlayerSave): { cleared: number; stars: number } {
  let cleared = 0;
  let stars = 0;
  for (let level = 1; level <= LEVEL_COUNT; level += 1) {
    const value = levelStars(save, level);
    if (value > 0) cleared += 1;
    stars += value;
  }
  return { cleared, stars };
}

/** 首页「继续闯关」目标：最早一个未通关关卡；全部通关返回 null（去关卡列表挑战满星）。 */
export function nextLevelTarget(save: PlayerSave): number | null {
  for (let level = 1; level <= LEVEL_COUNT; level += 1) {
    if (levelStars(save, level) === 0) return level;
  }
  return null;
}

/** 结算道具奖励：从三种道具里按种子抽取。 */
function drawItem(seed: number): ItemId {
  const id = ITEM_IDS[Math.floor(mulberry32(seed)() * ITEM_IDS.length) % ITEM_IDS.length];
  return isItemId(id) ? id : "reveal";
}

/**
 * 关卡结算：
 * - 过关才记成绩：星级只升不降，得分累加进总分；
 * - 每拿到一颗新的星星奖励 1 个道具（种子由 玩家+关卡+星档 决定，结果固定可复盘）。
 */
export function applyLevelResult(
  save: PlayerSave,
  userId: string,
  outcome: { level: number; won: boolean; mistakes: number; score: number },
): { save: PlayerSave; prevStars: Stars; stars: Stars; granted: ItemId[] } {
  const level = Math.trunc(outcome.level);
  const prevStars = levelStars(save, level);
  const stars = starsForLevelRun(outcome);
  if (!outcome.won || stars <= 0) {
    return { save, prevStars, stars: 0, granted: [] };
  }
  const granted: ItemId[] = [];
  for (let tier = prevStars + 1; tier <= stars; tier += 1) {
    granted.push(drawItem(hashString(`${userId}#${level}#${tier}`)));
  }
  const items: Inventory = { ...EMPTY_INVENTORY };
  for (const id of ITEM_IDS) items[id] = (save.items[id] ?? 0) + granted.filter((item) => item === id).length;
  const levelStarsNext = { ...save.levelStars, [String(level)]: stars };
  return {
    save: {
      ...save,
      levelStars: levelStarsNext,
      items,
      totalScore: save.totalScore + Math.max(0, Math.trunc(outcome.score)),
    },
    prevStars,
    stars,
    granted,
  };
}
