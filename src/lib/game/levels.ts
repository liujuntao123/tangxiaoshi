/**
 * 关卡系统（ADR-0018 平铺关卡 + ADR-0020 学段难度）：每关 10 题 + 道具奖励。
 *
 * - 关卡序号 1..50，每 10 关一个学段难度档（小学·低 → 小学·中 → 小学·高 → 初中 → 高中）；
 *   顺序解锁，过关即开下一关。
 * - 每档关卡只从该档诗里出题，档内按篇幅由短到长排布，逐关递增；
 *   某档诗不足铺满 10 关时，由相邻档按篇幅就近补足，且一首诗只会进入一个档。
 * - 每关 10 道题来自 10 首不同的诗（一诗一题），另备 3 道补答题供「补答」道具换题。
 * - 出题序列由玩家 userId 派生：同一玩家的每关题目永远固定，不同玩家互不相同，
 *   因此玩家之间无法互相透题（档内每 2 关一段做玩家专属洗牌，难度带全服一致）。
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
/** 学段难度档数（ADR-0020）：1 小学·低 → 5 高中，每档连占 LEVELS_PER_TIER 关。 */
export const TIER_COUNT = 5;
/** 每档关卡数 = LEVEL_COUNT / TIER_COUNT。 */
export const LEVELS_PER_TIER = LEVEL_COUNT / TIER_COUNT;
/** 学段难度标签（1 起，与 bank 诗卡 difficulty 字段一致的口径，见 docs/content-rules.md）。 */
export const TIER_LABELS = ["小学·低", "小学·中", "小学·高", "初中", "高中"] as const;
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

/** 学段难度档：1..TIER_COUNT。 */
export type Tier = 1 | 2 | 3 | 4 | 5;

/** 关卡 → 学段难度档：第 1–10 关 T1，11–20 关 T2……41–50 关 T5。 */
export function tierForLevel(level: number): Tier {
  const tier = Math.ceil(level / LEVELS_PER_TIER);
  return Math.min(TIER_COUNT, Math.max(1, tier)) as Tier;
}

/** 学段难度标签：越界返回空串（调用方直接拼接即可，无需判空）。 */
export function tierLabel(tier: number): string {
  return TIER_LABELS[tier - 1] ?? "";
}

export type PlanPoem = Pick<
  Poem,
  "id" | "title" | "authorName" | "lines" | "text" | "background" | "questions" | "difficulty"
>;

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

/** 每档关卡需要的诗数：10 关 × 每关 13 首。 */
const POEMS_PER_TIER = LEVELS_PER_TIER * POEMS_PER_LEVEL;

/** 档内排序键：篇幅升序（短诗在前），同长按 id 稳定。 */
function byLengthThenId<T extends PlanPoem>(a: T, b: T): number {
  return a.text.length - b.text.length || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

function tierOfPoem(poem: PlanPoem): Tier {
  const difficulty = Number(poem.difficulty);
  const tier = Number.isFinite(difficulty) ? Math.round(difficulty) : Math.ceil(TIER_COUNT / 2);
  return Math.min(TIER_COUNT, Math.max(1, tier)) as Tier;
}

/**
 * 全部诗按学段难度分档（ADR-0020）：每档关卡只用自己的档。
 * - 档内按篇幅升序铺位，玩家在档内也是先易后难；
 * - 本档不足铺满 10 关时，按 +1、-1、+2、-2… 就近补足，补足占用的诗登记为已用，
 *   保证同一首诗只进入一个档（关卡之间零重复的全局前提）；
 * - 极端小题库下某档可能为空，此时回落到全库统一顺序的兜底段（不再保证档位语义）。
 */
export function buildTierBands<T extends PlanPoem>(poems: readonly T[]): T[][] {
  const byTier: T[][] = Array.from({ length: TIER_COUNT + 1 }, () => []);
  for (const poem of poems) byTier[tierOfPoem(poem)].push(poem);
  for (const tier of byTier) tier.sort(byLengthThenId);

  const used = new Set<string>();
  const bands: T[][] = Array.from({ length: TIER_COUNT + 1 }, () => []);
  for (let tier = 1; tier <= TIER_COUNT; tier += 1) {
    const own = byTier[tier].filter((poem) => !used.has(poem.id));
    const band = own.slice(0, POEMS_PER_TIER);
    if (band.length < POEMS_PER_TIER) {
      for (let step = 1; step < TIER_COUNT && band.length < POEMS_PER_TIER; step += 1) {
        for (const neighbor of [tier + step, tier - step]) {
          if (neighbor < 1 || neighbor > TIER_COUNT) continue;
          for (const poem of byTier[neighbor]) {
            if (band.length >= POEMS_PER_TIER) break;
            if (used.has(poem.id)) continue;
            band.push(poem);
          }
          if (band.length >= POEMS_PER_TIER) break;
        }
      }
      band.sort(byLengthThenId);
    }
    for (const poem of band) used.add(poem.id);
    bands[tier] = band;
  }

  if (bands.slice(1).some((band) => band.length === 0)) {
    const global = [...poems].sort(byLengthThenId);
    for (let tier = 1; tier <= TIER_COUNT; tier += 1) {
      if (bands[tier].length === 0) {
        bands[tier] = global.slice((tier - 1) * POEMS_PER_TIER, tier * POEMS_PER_TIER);
        if (bands[tier].length === 0) bands[tier] = global;
      }
    }
  }
  return bands;
}

/**
 * 档内关卡顺序：每 2 关一段做玩家专属洗牌。
 * 段间保持篇幅升序 → 每一关的难度带全服一致（循序渐进可见）；
 * 段内顺序因人而异 → 不同玩家同一关拿到的诗互不相同（防透题）。
 */
export function bandOrder<T extends PlanPoem>(band: readonly T[], userId: string): T[] {
  const chunkSize = POEMS_PER_LEVEL * 2;
  const out: T[] = [];
  for (let start = 0; start < band.length; start += chunkSize) {
    out.push(
      ...deterministicShuffle(
        band.slice(start, start + chunkSize),
        hashString(`${userId}#band#${start}`),
      ),
    );
  }
  return out;
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
 * 只用本关学段档的诗；档内顺序见 bandOrder，第 k 关（档内）占用第 [(k-1)*13, k*13) 首；
 * 前 10 首出正式题，后 3 首出备用题。
 */
export function buildLevelPlan(poems: readonly PlanPoem[], userId: string, level: number): LevelPlan {
  if (!Number.isInteger(level) || level < 1 || level > LEVEL_COUNT) {
    throw new Error(`level out of range: ${level}`);
  }
  const band = buildTierBands(poems)[tierForLevel(level)] ?? [];
  if (band.length === 0) throw new Error("poem bank is empty");
  const order = bandOrder(band, userId);
  // 档内偏移：第 11 关是 T2 的第 1 关，从本档第 0 首开始
  const start = ((level - 1) % LEVELS_PER_TIER) * POEMS_PER_LEVEL;
  const rng = mulberry32((levelSeed(userId) ^ Math.imul(level, 0x9e3779b9)) >>> 0);
  const take = (offset: number): PlanQuestion => {
    // 档内诗不足以铺满本档全部关卡时回绕复用（当前每档 band ≥ 130 首，不会触发）
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
