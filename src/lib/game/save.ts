import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { EMPTY_SAVE, type PlayerSave } from "./types";

const saveSchema = z.object({
  clearedLevels: z.array(z.string()),
  keysOwned: z.number(),
  achievements: z.array(z.string()),
  endlessBestStreak: z.number(),
  endlessBestScore: z.number(),
});

type SaveRow = {
  cleared_levels: string;
  keys_owned: number;
  achievements: string;
  endless_best_streak: number;
  endless_best_score: number;
};

function parseList(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function toSave(row: SaveRow | undefined): PlayerSave {
  if (!row) return { ...EMPTY_SAVE };
  return {
    clearedLevels: parseList(row.cleared_levels),
    keysOwned: Number(row.keys_owned) || 0,
    achievements: parseList(row.achievements),
    endlessBestStreak: Number(row.endless_best_streak) || 0,
    endlessBestScore: Number(row.endless_best_score) || 0,
  };
}

export const getSave = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<PlayerSave> => {
    const sql = await getSql();
    const rows = await sql<SaveRow>`
      select cleared_levels, keys_owned, achievements, endless_best_streak, endless_best_score
      from player_saves
      where user_id = ${context.userId}
    `;
    const existing = rows[0];
    if (existing) return toSave(existing);
    await sql`insert into player_saves (user_id) values (${context.userId})`;
    return { ...EMPTY_SAVE };
  });

export const writeSave = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(saveSchema)
  .handler(async ({ context, data }): Promise<PlayerSave> => {
    const sql = await getSql();
    await sql`
      insert into player_saves (
        user_id, cleared_levels, keys_owned, achievements,
        endless_best_streak, endless_best_score, updated_at
      ) values (
        ${context.userId},
        ${JSON.stringify(data.clearedLevels)},
        ${data.keysOwned},
        ${JSON.stringify(data.achievements)},
        ${data.endlessBestStreak},
        ${data.endlessBestScore},
        now()
      )
      on conflict (user_id) do update set
        cleared_levels = excluded.cleared_levels,
        keys_owned = excluded.keys_owned,
        achievements = excluded.achievements,
        endless_best_streak = excluded.endless_best_streak,
        endless_best_score = excluded.endless_best_score,
        updated_at = now()
    `;
    return data;
  });
