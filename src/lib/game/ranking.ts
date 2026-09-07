import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import {
  ENDLESS_BOARD_SIZE,
  ENDLESS_NAME_FALLBACK,
  normalizeEndlessBoard,
  type EndlessBoardData,
} from "./leaderboard";

/**
 * 无尽排行榜（ADR-0019）。
 *
 * 榜单直接由 `player_saves` 的无尽双最佳派生：不建新表、不加存档字段、
 * 不加写路径——榜单永远是个人纪录的全局视图，两者永远不会分叉。
 * 只返回展示名与成绩（绝不泄漏 userId / 邮箱），只看留过纪录的玩家，
 * 双榜各取前 ENDLESS_BOARD_SIZE 名；名次为竞赛排名（并列同名次）。
 */

type BoardRow = {
  name: string | null;
  best_score: number;
  best_streak: number;
  is_self: boolean;
};

type BoardEntryInput = {
  name: unknown;
  bestScore: unknown;
  bestStreak: unknown;
  isSelf: unknown;
};

function toEntries(rows: BoardRow[]): BoardEntryInput[] {
  return rows.map((row) => ({
    name: row.name,
    bestScore: Number(row.best_score),
    bestStreak: Number(row.best_streak),
    isSelf: row.is_self === true,
  }));
}

export const getEndlessBoard = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<EndlessBoardData> => {
    const sql = await getSql();
    const uid = context.userId;

    // 双榜：同一批留过纪录的玩家，分别按得分 / 连对为主指标排序。
    // 展示名 = 账号名（注册时取邮箱前缀），缺行/空名回退兜底名。
    const scoreRows = await sql.query<BoardRow>(
      `select coalesce(nullif(u.name, ''), $1) as name,
              ps.endless_best_score as best_score,
              ps.endless_best_streak as best_streak,
              (ps.user_id = $2) as is_self
       from player_saves ps
       left join "user" u on u.id = ps.user_id
       where ps.endless_best_score > 0 or ps.endless_best_streak > 0
       order by ps.endless_best_score desc, ps.endless_best_streak desc,
                ps.updated_at asc, ps.user_id asc
       limit $3`,
      [ENDLESS_NAME_FALLBACK, uid, ENDLESS_BOARD_SIZE],
    );
    const streakRows = await sql.query<BoardRow>(
      `select coalesce(nullif(u.name, ''), $1) as name,
              ps.endless_best_score as best_score,
              ps.endless_best_streak as best_streak,
              (ps.user_id = $2) as is_self
       from player_saves ps
       left join "user" u on u.id = ps.user_id
       where ps.endless_best_score > 0 or ps.endless_best_streak > 0
       order by ps.endless_best_streak desc, ps.endless_best_score desc,
                ps.updated_at asc, ps.user_id asc
       limit $3`,
      [ENDLESS_NAME_FALLBACK, uid, ENDLESS_BOARD_SIZE],
    );

    const countRows = await sql<{ on_board: number }>`
      select count(*)::int as on_board
      from player_saves
      where endless_best_score > 0 or endless_best_streak > 0
    `;

    // 自己的名次：主指标上严格更优的人数 + 1（并列同名次）。
    // 以库里的双最佳为准（与榜单同源），没有纪录则两榜都算未上榜。
    const mineRows = await sql<{ score: number; streak: number }>`
      select endless_best_score as score, endless_best_streak as streak
      from player_saves
      where user_id = ${uid}
    `;
    const myScore = Number(mineRows[0]?.score) || 0;
    const myStreak = Number(mineRows[0]?.streak) || 0;
    const rankRows = await sql<{ score_rank: number | null; streak_rank: number | null }>`
      select
        case when ${myScore} > 0 then
          (select count(*)::int from player_saves where endless_best_score > ${myScore}) + 1
          else null end as score_rank,
        case when ${myStreak} > 0 then
          (select count(*)::int from player_saves where endless_best_streak > ${myStreak}) + 1
          else null end as streak_rank
    `;

    // 出库即规范化：snake_case 行整理成榜单契约，脏值在渲染前就被钳掉。
    return normalizeEndlessBoard({
      scoreBoard: toEntries(scoreRows),
      streakBoard: toEntries(streakRows),
      playerCount: Number(countRows[0]?.on_board) || 0,
      myScoreRank: rankRows[0]?.score_rank ?? null,
      myStreakRank: rankRows[0]?.streak_rank ?? null,
    });
  });
