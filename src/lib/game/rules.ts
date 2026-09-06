/**
 * 纯游戏规则：存档规范化、评级、得分、历史最佳合并与目标选择。
 *
 * 设计依据 docs/game-design.md §5.3 / §7 / §8，落地口径见 docs/adr/0015-poem-card-gameplay.md。
 * 本模块只依赖 `./types` 的类型（类型导入在 node 下会被擦除），不引入内容库，
 * 因此可以直接被 `node --test`（--experimental-strip-types）加载做纯函数测试。
 * progress.ts 在其上补充依赖诗卡内容的封装并统一对外导出。
 */
// 注意：本模块会被 node --test 直接加载，运行时值导入必须带 .ts 扩展名；
// 纯类型导入会被擦除，写法随意。
import type { Inventory, PlayerSave, Poem, PoemRecord, PoemRunResult, Question, Stars } from "./types";
import { EMPTY_INVENTORY, ITEM_IDS, isItemId } from "./types.ts";

/** 得分口径（docs/game-design.md §7.2）。 */
export const BASE_ANSWER_SCORE = 100;
export const COMBO_BONUS_STEP = 25;
/** 连击加成上限由实现控制在合理范围：最多 +100（第 5 连击起封顶）。 */
export const COMBO_BONUS_CAP = 100;
/** 连携正确额外加分。 */
export const LINK_BONUS = 100;

export const EMPTY_POEM_RECORD: PoemRecord = {
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
      clearedPoems: [],
      achievements: [],
      endlessBestStreak: 0,
      endlessBestScore: 0,
      metAuthors: [],
      poemRecords: {},
      totalScore: 0,
      levelStars: {},
      items: { ...EMPTY_INVENTORY },
    };
  }
  const poemRecords: Record<string, PoemRecord> = {};
  const rawRecords = input.poemRecords;
  if (isPlainObject(rawRecords)) {
    for (const [poemId, raw] of Object.entries(rawRecords)) {
      if (!poemId) continue;
      const record = normalizePoemRecord(raw);
      if (record) poemRecords[poemId] = record;
    }
  }
  return {
    clearedPoems: unique(stringList(input.clearedPoems)),
    achievements: unique(stringList(input.achievements)),
    endlessBestStreak: nonNegativeInt(input.endlessBestStreak),
    endlessBestScore: nonNegativeInt(input.endlessBestScore),
    metAuthors: unique(stringList(input.metAuthors)),
    poemRecords,
    totalScore: nonNegativeInt(input.totalScore),
    levelStars: normalizeLevelStars(input.levelStars),
    items: normalizeInventory(input.items),
  };
}

/** 关卡星级表：非法条目丢弃，星级钳制到 0–3。 */
export function normalizeLevelStars(value: unknown): Record<string, Stars> {
  if (!isPlainObject(value)) return {};
  const stars: Record<string, Stars> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (!/^\d+$/.test(key) || key === "0") continue;
    stars[key] = clampStars(raw);
  }
  return stars;
}

/** 道具库存：未知道具丢弃，数量钳制到非负整数。 */
export function normalizeInventory(value: unknown): Inventory {
  const items: Inventory = { ...EMPTY_INVENTORY };
  if (!isPlainObject(value)) return items;
  for (const id of ITEM_IDS) {
    if (isItemId(id)) items[id] = nonNegativeInt(value[id]);
  }
  return items;
}

/** 非法诗卡记录返回 null（调用方丢弃该条目），字段非法逐项回退默认值。 */
export function normalizePoemRecord(value: unknown): PoemRecord | null {
  if (!isPlainObject(value)) return null;
  return {
    bestStars: clampStars(value.bestStars),
    bestScore: nonNegativeInt(value.bestScore),
    bestCombo: nonNegativeInt(value.bestCombo),
    attempts: nonNegativeInt(value.attempts),
  };
}

/** 把答题组件上报的本轮表现整理成合法 PoemRunResult（越界钳制、非法回退）。 */
export function normalizeRunResult(run: PoemRunResult): PoemRunResult {
  const chancesTotal = clampInt(run.chancesTotal, 1, 99);
  return {
    poemId: typeof run.poemId === "string" ? run.poemId : "",
    won: run.won === true,
    chancesTotal,
    chancesLeft: clampInt(run.chancesLeft, 0, chancesTotal),
    maxCombo: nonNegativeInt(run.maxCombo),
    score: nonNegativeInt(run.score),
    mistakes: nonNegativeInt(run.mistakes),
  };
}

/**
 * 评级（docs/game-design.md §7.1，落到诗卡，ADR-0015）：
 * 1 印完成诗卡；2 印灯笼至少剩 2 盏或最高连击达 3；
 * 3 印全程未灭灯笼并全题答对（护卷挡下也算答错，拿不到 3 印）。
 */
export function starsForRun(
  run: Pick<PoemRunResult, "won" | "chancesLeft" | "chancesTotal" | "maxCombo" | "mistakes">,
): Stars {
  if (!run.won) return 0;
  const chancesTotal = clampInt(run.chancesTotal, 1, 99);
  const chancesLeft = clampInt(run.chancesLeft, 0, chancesTotal);
  if (chancesLeft >= chancesTotal && run.mistakes <= 0) return 3;
  if (chancesLeft >= 2 || run.maxCombo >= 3) return 2;
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

/** 历史只保留最高诗印/分数/连击，attempts 每完成一轮 +1。 */
export function mergePoemRecord(previous: PoemRecord | undefined, run: PoemRunResult): PoemRecord {
  const prev = previous ?? EMPTY_POEM_RECORD;
  const safe = normalizeRunResult(run);
  return {
    bestStars: Math.max(prev.bestStars, starsForRun(safe)) as Stars,
    bestScore: Math.max(prev.bestScore, safe.score),
    bestCombo: Math.max(prev.bestCombo, safe.maxCombo),
    attempts: prev.attempts + 1,
  };
}

/**
 * 记录一轮成绩（胜利或失败都可调用）：合并诗卡历史最佳并累加总分。
 * 不改动 clearedPoems / 成就 —— 那些属于通关进程，见 applyPoemWin。
 */
export function applyPoemRun(save: PlayerSave, run: PoemRunResult): PlayerSave {
  const base = normalizeSave(save);
  const safe = normalizeRunResult(run);
  if (!safe.poemId) return base;
  return {
    ...base,
    poemRecords: {
      ...base.poemRecords,
      [safe.poemId]: mergePoemRecord(base.poemRecords[safe.poemId], safe),
    },
    totalScore: base.totalScore + safe.score,
  };
}

/** 无尽一局结束：连对与得分分别刷新双最佳（只记纪录，不发成就）。 */
export function applyEndlessRun(save: PlayerSave, score: number, streak: number): PlayerSave {
  const base = normalizeSave(save);
  return {
    ...base,
    endlessBestScore: Math.max(base.endlessBestScore, nonNegativeInt(score)),
    endlessBestStreak: Math.max(base.endlessBestStreak, nonNegativeInt(streak)),
  };
}

/** 全部诗卡的诗印总数（首页/成就页展示用）。 */
export function totalStars(save: PlayerSave): number {
  return Object.values(normalizeSave(save).poemRecords).reduce(
    (sum, record) => sum + record.bestStars,
    0,
  );
}

/**
 * 答错时给出正确答案所在诗句及其相邻一句，最多两行，不写长解析。
 * （错题反馈口径；答题、关卡与无尽共用，避免各处复制。）
 */
export function poemContextFor(poem: Pick<Poem, "lines">, question: Question): string[] {
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
