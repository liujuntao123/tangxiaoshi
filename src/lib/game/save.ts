import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { normalizeSave } from "./rules";
import { EMPTY_SAVE, type PlayerSave } from "./types";

// poemRecords / levelStars / items 的条目级校验交给 normalizeSave（非法条目回退/丢弃，
// 不会因为个别脏数据丢掉整份记录），validator 只保证整体结构可用。
const saveSchema = z.object({
  clearedPoems: z.array(z.string()),
  achievements: z.array(z.string()),
  endlessBestStreak: z.number(),
  endlessBestScore: z.number(),
  metAuthors: z.array(z.string()),
  poemRecords: z.record(z.string(), z.unknown()).catch({}),
  totalScore: z.number().catch(0),
  levelStars: z.record(z.string(), z.unknown()).catch({}),
  items: z.record(z.string(), z.unknown()).catch({}),
});

type SaveRow = {
  cleared_poems: string;
  achievements: string;
  endless_best_streak: number;
  endless_best_score: number;
  met_authors: string;
  poem_records: string;
  total_score: number;
  level_stars: string;
  items: string;
};

function parseList(value: string | undefined): string[] {
  if (!value) return [];
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

function toSave(row: SaveRow): PlayerSave {
  return normalizeSave({
    clearedPoems: parseList(row.cleared_poems),
    achievements: parseList(row.achievements),
    endlessBestStreak: Number(row.endless_best_streak) || 0,
    endlessBestScore: Number(row.endless_best_score) || 0,
    metAuthors: parseList(row.met_authors),
    poemRecords: parseRecords(row.poem_records),
    totalScore: Number(row.total_score) || 0,
    levelStars: parseRecords(row.level_stars),
    items: parseRecords(row.items),
  });
}

export const getSave = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<PlayerSave> => {
    const sql = await getSql();
    const rows = await sql<SaveRow>`
      select cleared_poems, achievements, endless_best_streak, endless_best_score,
             met_authors, poem_records, total_score, level_stars, items
      from player_saves
      where user_id = ${context.userId}
    `;
    const existing = rows[0];
    if (existing) return toSave(existing);
    await sql`insert into player_saves (user_id) values (${context.userId})`;
    return normalizeSave({ ...EMPTY_SAVE });
  });

export const writeSave = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(saveSchema)
  .handler(async ({ context, data }): Promise<PlayerSave> => {
    const sql = await getSql();
    // 入库前统一规范化，库里只存合法形状；返回值也以规范化结果为准。
    const safe = normalizeSave(data);
    await sql`
      insert into player_saves (
        user_id, cleared_poems, achievements,
        endless_best_streak, endless_best_score, met_authors,
        poem_records, total_score, level_stars, items, updated_at
      ) values (
        ${context.userId},
        ${JSON.stringify(safe.clearedPoems)},
        ${JSON.stringify(safe.achievements)},
        ${safe.endlessBestStreak},
        ${safe.endlessBestScore},
        ${JSON.stringify(safe.metAuthors)},
        ${JSON.stringify(safe.poemRecords)},
        ${safe.totalScore},
        ${JSON.stringify(safe.levelStars)},
        ${JSON.stringify(safe.items)},
        now()
      )
      on conflict (user_id) do update set
        cleared_poems = excluded.cleared_poems,
        achievements = excluded.achievements,
        endless_best_streak = excluded.endless_best_streak,
        endless_best_score = excluded.endless_best_score,
        met_authors = excluded.met_authors,
        poem_records = excluded.poem_records,
        total_score = excluded.total_score,
        level_stars = excluded.level_stars,
        items = excluded.items,
        updated_at = now()
    `;
    return safe;
  });
