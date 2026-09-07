/**
 * 无尽排行榜（ADR-0019）的纯数据契约与兜底规范化。
 *
 * 榜单是 `player_saves` 里无尽双最佳（endless_best_score / endless_best_streak）
 * 的全局视图：不建新表、不加存档字段（见 src/lib/game/ranking.ts 的查询）。
 * 服务端查询结果与客户端渲染前都经过 normalizeEndlessBoard——脏行丢弃、
 * 数值钳制、名次按榜单指标重算，任何脏数据都不会把榜单渲染崩。
 *
 * 本模块不引入服务端依赖，可被 node --test 直接加载测试。
 */

/** 榜单长度：只展示前 20 名，其余玩家看自己的名次。 */
export const ENDLESS_BOARD_SIZE = 20;

/** 名字兜底：账号缺行（如本地开发用户）或名为空时使用。 */
export const ENDLESS_NAME_FALLBACK = "无名小诗";

/** 展示名截断长度，避免超长邮箱前缀把榜单行撑破。 */
export const ENDLESS_NAME_MAX = 12;

/** 榜单指标：连对榜（主榜，与无尽「本局连对」主口径一致）/ 得分榜。 */
export type LeaderboardMetric = "streak" | "score";

/** 榜单中的一行：只有展示所需的字段，绝不携带 userId / 邮箱。 */
export type LeaderboardEntry = {
  /** 名次从 1 起；并列同名次（1,2,2,4 竞赛排名），由榜单指标相等判定。 */
  rank: number;
  name: string;
  bestScore: number;
  bestStreak: number;
  /** 是否是当前玩家自己（服务端按 userId 比对，客户端只拿到布尔）。 */
  isSelf: boolean;
};

/** 无尽排行榜的完整数据：双榜 + 榜上人数 + 自己在两榜的名次。 */
export type EndlessBoardData = {
  /** 连对榜（前 ENDLESS_BOARD_SIZE 名）。 */
  streakBoard: LeaderboardEntry[];
  /** 得分榜（前 ENDLESS_BOARD_SIZE 名）。 */
  scoreBoard: LeaderboardEntry[];
  /** 留过无尽纪录（连对或得分 > 0）的玩家总数。 */
  playerCount: number;
  /** 自己在连对榜的名次；null = 还没有连对纪录。 */
  myStreakRank: number | null;
  /** 自己在得分榜的名次；null = 还没有得分纪录。 */
  myScoreRank: number | null;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function intOrZero(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.trunc(value))
    : 0;
}

/** 名次只认正整数，其余（0 / 负数 / 非法）一律回退 null（未上榜）。 */
function rankOrNull(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const rank = Math.trunc(value);
  return rank > 0 ? rank : null;
}

function nameOrFallback(value: unknown): string {
  const name = typeof value === "string" ? value.trim() : "";
  return (name || ENDLESS_NAME_FALLBACK).slice(0, ENDLESS_NAME_MAX);
}

/**
 * 规范化单张榜单：截断到前 ENDLESS_BOARD_SIZE 名、非法行丢弃、
 * 名次按榜单指标重算（并列同名次，竞赛排名 1,2,2,4）。
 * 服务端已按指标排序，这里只依据相邻行的指标值是否相等恢复名次。
 */
function normalizeBoardList(value: unknown, metric: LeaderboardMetric): LeaderboardEntry[] {
  if (!Array.isArray(value)) return [];
  const out: LeaderboardEntry[] = [];
  for (const raw of value.slice(0, ENDLESS_BOARD_SIZE)) {
    if (!isPlainObject(raw)) continue;
    const bestScore = intOrZero(raw.bestScore);
    const bestStreak = intOrZero(raw.bestStreak);
    const metricValue = metric === "score" ? bestScore : bestStreak;
    const prev = out[out.length - 1];
    const prevMetric = prev ? (metric === "score" ? prev.bestScore : prev.bestStreak) : -1;
    // 与上一行指标值相等 -> 并列上一行的名次；否则名次 = 当前行序号 + 1。
    const rank = prev && prevMetric === metricValue ? prev.rank : out.length + 1;
    out.push({
      rank,
      name: nameOrFallback(raw.name),
      bestScore,
      bestStreak,
      isSelf: raw.isSelf === true,
    });
  }
  return out;
}

/**
 * 把服务端返回（或任何来源）的对象整理成完整合法的 EndlessBoardData：
 * 缺失字段补默认值，非法字段回退/丢弃，不抛错、不修改入参。
 */
export function normalizeEndlessBoard(input: unknown): EndlessBoardData {
  if (!isPlainObject(input)) {
    return {
      streakBoard: [],
      scoreBoard: [],
      playerCount: 0,
      myStreakRank: null,
      myScoreRank: null,
    };
  }
  return {
    streakBoard: normalizeBoardList(input.streakBoard, "streak"),
    scoreBoard: normalizeBoardList(input.scoreBoard, "score"),
    playerCount: intOrZero(input.playerCount),
    myStreakRank: rankOrNull(input.myStreakRank),
    myScoreRank: rankOrNull(input.myScoreRank),
  };
}
