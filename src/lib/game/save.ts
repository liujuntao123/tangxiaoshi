import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { migrateSave, normalizeSave } from "./progress";
import { EMPTY_SAVE, type PlayerSave } from "./types";

// levelRecords 的条目级校验交给 normalizeSave（非法条目回退/丢弃，
// 不会因为个别脏数据丢掉整份记录），validator 只保证整体结构可用。
const saveSchema = z.object({
  clearedLevels: z.array(z.string()),
  keysOwned: z.number(),
  achievements: z.array(z.string()),
  endlessBestStreak: z.number(),
  endlessBestScore: z.number(),
  levelRecords: z.record(z.string(), z.unknown()).catch({}),
  totalScore: z.number().catch(0),
});

type SaveRow = {
  cleared_levels: string;
  keys_owned: number;
  achievements: string;
  endless_best_streak: number;
  endless_best_score: number;
  level_records: string;
  total_score: number;
};

function parseList(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function parseRecords(value: string | undefined): Record<string, unknown> {
  if (!value) return {};
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as Record<string, unknown>;
  } catch {
    return {};
  }
}

function toSave(row: SaveRow | undefined): PlayerSave {
  if (!row) return normalizeSave(EMPTY_SAVE);
  return normalizeSave({
    clearedLevels: parseList(row.cleared_levels),
    keysOwned: Number(row.keys_owned) || 0,
    achievements: parseList(row.achievements),
    endlessBestStreak: Number(row.endless_best_streak) || 0,
    endlessBestScore: Number(row.endless_best_score) || 0,
    levelRecords: parseRecords(row.level_records),
    totalScore: Number(row.total_score) || 0,
  });
}

export const getSave = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<PlayerSave> => {
    const sql = await getSql();
    const rows = await sql<SaveRow>`
      select cleared_levels, keys_owned, achievements,
             endless_best_streak, endless_best_score,
             level_records, total_score
      from player_saves
      where user_id = ${context.userId}
    `;
    const existing = rows[0];
    if (existing) return migrateSave(toSave(existing));
    await sql`insert into player_saves (user_id) values (${context.userId})`;
    return normalizeSave(EMPTY_SAVE);
  });

export const writeSave = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(saveSchema)
  .handler(async ({ context, data }): Promise<PlayerSave> => {
    // 入库前统一规范化，库里永远只存合法形状，读取端无需再兜底。
    const save = normalizeSave(data);
    const sql = await getSql();
    await sql`
      insert into player_saves (
        user_id, cleared_levels, keys_owned, achievements,
        endless_best_streak, endless_best_score, level_records, total_score, updated_at
      ) values (
        ${context.userId},
        ${JSON.stringify(save.clearedLevels)},
        ${save.keysOwned},
        ${JSON.stringify(save.achievements)},
        ${save.endlessBestStreak},
        ${save.endlessBestScore},
        ${JSON.stringify(save.levelRecords)},
        ${save.totalScore},
        now()
      )
      on conflict (user_id) do update set
        cleared_levels = excluded.cleared_levels,
        keys_owned = excluded.keys_owned,
        achievements = excluded.achievements,
        endless_best_streak = excluded.endless_best_streak,
        endless_best_score = excluded.endless_best_score,
        level_records = excluded.level_records,
        total_score = excluded.total_score,
        updated_at = now()
    `;
    return save;
  });
