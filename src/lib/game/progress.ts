import { ACHIEVEMENTS, achievementProgress, POEMS } from "./content";
import type { PlayerSave } from "./types";

function unique(items: string[]): string[] {
  return [...new Set(items)];
}

/** 一张诗卡答完且及格 = 通关该诗卡。成就按全通制即时补发（只增不减，ADR-0013）。 */
export function applyPoemWin(save: PlayerSave, poemId: string): PlayerSave {
  const clearedPoems = unique(
    save.clearedPoems.includes(poemId) ? save.clearedPoems : [...save.clearedPoems, poemId],
  );
  const next: PlayerSave = { ...save, clearedPoems };
  return { ...next, achievements: earnedAchievements(next) };
}

/** 全通制：作者/文集/朝代成就在其覆盖的诗卡全部通关时达成。 */
export function earnedAchievements(save: PlayerSave): string[] {
  const earned = new Set(save.achievements);
  for (const def of ACHIEVEMENTS) {
    if (achievementProgress(def, save).done) earned.add(def.id);
  }
  return [...earned];
}

/** 首次进入作者页 → 记录已遇该作者（引导语只出一次）。 */
export function markAuthorMet(save: PlayerSave, authorId: string): PlayerSave {
  if (save.metAuthors.includes(authorId)) return save;
  return { ...save, metAuthors: [...save.metAuthors, authorId] };
}

export function applyEndlessRun(save: PlayerSave, score: number, streak: number): PlayerSave {
  return {
    ...save,
    endlessBestScore: Math.max(save.endlessBestScore, score),
    endlessBestStreak: Math.max(save.endlessBestStreak, streak),
  };
}

export function clearedCount(save: PlayerSave): { have: number; total: number } {
  return { have: save.clearedPoems.length, total: POEMS.length };
}
