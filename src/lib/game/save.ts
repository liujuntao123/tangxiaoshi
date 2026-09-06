import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { EMPTY_SAVE, type PlayerSave } from "./types";

const saveSchema = z.object({
  clearedPoems: z.array(z.string()),
  achievements: z.array(z.string()),
  endlessBestStreak: z.number(),
  endlessBestScore: z.number(),
  metAuthors: z.array(z.string()),
});

type SaveRow = {
  cleared_poems: string;
  achievements: string;
  endless_best_streak: number;
  endless_best_score: number;
  met_authors: string;
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

function toSave(row: SaveRow): PlayerSave {
  return {
    clearedPoems: parseList(row.cleared_poems),
    achievements: parseList(row.achievements),
    endlessBestStreak: Number(row.endless_best_streak) || 0,
    endlessBestScore: Number(row.endless_best_score) || 0,
    metAuthors: parseList(row.met_authors),
  };
}

export const getSave = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<PlayerSave> => {
    const sql = await getSql();
    const rows = await sql<SaveRow>`
      select cleared_poems, achievements, endless_best_streak, endless_best_score, met_authors
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
        user_id, cleared_poems, achievements,
        endless_best_streak, endless_best_score, met_authors, updated_at
      ) values (
        ${context.userId},
        ${JSON.stringify(data.clearedPoems)},
        ${JSON.stringify(data.achievements)},
        ${data.endlessBestStreak},
        ${data.endlessBestScore},
        ${JSON.stringify(data.metAuthors)},
        now()
      )
      on conflict (user_id) do update set
        cleared_poems = excluded.cleared_poems,
        achievements = excluded.achievements,
        endless_best_streak = excluded.endless_best_streak,
        endless_best_score = excluded.endless_best_score,
        met_authors = excluded.met_authors,
        updated_at = now()
    `;
    return data;
  });
