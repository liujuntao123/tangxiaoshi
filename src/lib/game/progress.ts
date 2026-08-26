import { ACHIEVEMENTS, CHAPTERS, DYNASTIES, LEGACY_LEVEL_IDS, LEVELS, chapterById, chapterOfLevel, levelById } from "./content";
import type { Chapter, PlayerSave } from "./types";

function unique(items: string[]): string[] {
  return [...new Set(items)];
}

export function migrateSave(save: PlayerSave): PlayerSave {
  const clearedLevels = unique(save.clearedLevels.map((id) => LEGACY_LEVEL_IDS[id] ?? id));
  const achievements = unique(
    save.achievements.map((id) => (id === "poet-libai" ? "poet-libai" : id)),
  );
  return { ...save, clearedLevels, achievements };
}

export function keysInChapter(chapter: Chapter, save: PlayerSave): number {
  return chapter.levels.filter((level) => !level.boss && save.clearedLevels.includes(level.id)).length;
}

export function isChapterUnlocked(chapterId: string, save: PlayerSave): boolean {
  const chapter = CHAPTERS.find((item) => item.id === chapterId);
  if (!chapter) return false;
  if (!isDynastyUnlocked(chapter.dynastyId, save)) return false;
  const siblings = CHAPTERS.filter((item) => item.dynastyId === chapter.dynastyId);
  const index = siblings.findIndex((item) => item.id === chapterId);
  if (index <= 0) return true;
  const previous = siblings[index - 1];
  return previous ? isChapterCleared(previous.id, save) : true;
}

export function isChapterCleared(chapterId: string, save: PlayerSave): boolean {
  const chapter = CHAPTERS.find((item) => item.id === chapterId);
  if (!chapter) return false;
  const boss = chapter.levels.find((level) => level.boss) ?? chapter.levels[chapter.levels.length - 1];
  return boss ? save.clearedLevels.includes(boss.id) : false;
}

export function isDynastyUnlocked(dynastyId: string, save: PlayerSave): boolean {
  const index = DYNASTIES.findIndex((item) => item.id === dynastyId);
  if (index <= 0) return true;
  const previous = DYNASTIES[index - 1];
  if (!previous) return true;
  const chapters = CHAPTERS.filter((item) => item.dynastyId === previous.id);
  return chapters.some((chapter) => isChapterCleared(chapter.id, save));
}

export function isLevelUnlocked(levelId: string, save: PlayerSave): boolean {
  const id = LEGACY_LEVEL_IDS[levelId] ?? levelId;
  const level = LEVELS.find((item) => item.id === id);
  if (!level) return false;
  const chapter = chapterOfLevel(level);
  if (!isChapterUnlocked(chapter.id, save)) return false;
  if (level.boss) return keysInChapter(chapter, save) >= chapter.keysToBoss;
  if (level.order === 1) return true;
  const previous = chapter.levels.find((item) => item.order === level.order - 1);
  return previous ? save.clearedLevels.includes(previous.id) : false;
}

export function rescuedPoetIds(save: PlayerSave): string[] {
  return CHAPTERS.filter((chapter) => isChapterCleared(chapter.id, save)).map((chapter) => chapter.poetId);
}

export function applyLevelWin(save: PlayerSave, levelId: string, fullHp: boolean): PlayerSave {
  const level = levelById(levelId);
  const chapter = chapterOfLevel(level);
  const clearedLevels = unique(
    save.clearedLevels.includes(level.id) ? save.clearedLevels : [...save.clearedLevels, level.id],
  );
  const next: PlayerSave = { ...save, clearedLevels };
  const achievements = new Set(save.achievements);
  if (fullHp) achievements.add("no-damage");
  if (level.boss) {
    achievements.add(`poet-${chapter.poetId}`);
    const dynastyDone = CHAPTERS.filter((item) => item.dynastyId === chapter.dynastyId).every((item) =>
      isChapterCleared(item.id, next),
    );
    if (dynastyDone) achievements.add(`dynasty-${chapter.dynastyId}`);
  }
  const keysOwned = keysInChapter(chapter, next);
  return { ...next, keysOwned, achievements: [...achievements] };
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

export function rescuedCount(save: PlayerSave): { have: number; total: number } {
  return { have: rescuedPoetIds(save).length, total: CHAPTERS.length };
}

export { chapterById, ACHIEVEMENTS };
