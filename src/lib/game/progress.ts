import { KEYS_TO_BOSS, LEVELS } from "./content";
import type { PlayerSave } from "./types";

export function isLevelUnlocked(levelId: string, save: PlayerSave): boolean {
  const level = LEVELS.find((item) => item.id === levelId);
  if (!level) return false;
  if (level.order === 1) return true;
  if (level.id === "lv6") return save.keysOwned >= KEYS_TO_BOSS;
  const previous = LEVELS.find((item) => item.order === level.order - 1);
  return previous ? save.clearedLevels.includes(previous.id) : false;
}

export function applyLevelWin(save: PlayerSave, levelId: string, fullHp: boolean): PlayerSave {
  const clearedLevels = save.clearedLevels.includes(levelId)
    ? save.clearedLevels
    : [...save.clearedLevels, levelId];
  const keysOwned = Math.min(
    KEYS_TO_BOSS,
    LEVELS.filter((level) => level.id !== "lv6" && clearedLevels.includes(level.id)).length,
  );
  const achievements = new Set(save.achievements);
  if (levelId === "lv6") achievements.add("poet-libai");
  if (fullHp) achievements.add("no-damage");
  return {
    ...save,
    clearedLevels,
    keysOwned,
    achievements: [...achievements],
  };
}

export function applyEndlessRun(save: PlayerSave, score: number): PlayerSave {
  const achievements = new Set(save.achievements);
  if (score >= 10) achievements.add("ten-streak");
  return {
    ...save,
    achievements: [...achievements],
    endlessBestScore: Math.max(save.endlessBestScore, score),
    endlessBestStreak: Math.max(save.endlessBestStreak, score),
  };
}

export function unlockedPoemIds(save: PlayerSave): string[] {
  return LEVELS.filter((level) => save.clearedLevels.includes(level.id)).map((level) => level.poemId);
}
