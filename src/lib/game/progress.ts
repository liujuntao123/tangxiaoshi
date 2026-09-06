import { ACHIEVEMENTS, CHAPTERS, DYNASTIES, LEGACY_LEVEL_IDS, LEVELS, chapterById, chapterOfLevel, levelById } from "./content";
import {
  applyLevelWinCore,
  levelRunFromLegacy,
  normalizeSave,
  pickContinueTarget,
  type LevelProgressNode,
  type LevelWinWorld,
} from "./rules";
import type { Chapter, ContinueTarget, Level, LevelRunResult, PlayerSave } from "./types";

// 纯规则集中在 rules.ts（可被 node 纯函数测试直接加载），这里统一对外导出，
// 页面与战斗组件继续只从 progress.ts 取规则。
export {
  EMPTY_LEVEL_RECORD,
  LEVEL_START_HP,
  MONSTER_START_HP,
  BASE_ANSWER_SCORE,
  COMBO_BONUS_STEP,
  COMBO_BONUS_CAP,
  LINK_BONUS,
  TEN_STREAK,
  TALISMANS,
  normalizeSave,
  normalizeLevelRecord,
  normalizeRunResult,
  starsForRun,
  scoreForAnswer,
  mergeLevelRecord,
  applyLevelRun,
  levelRunFromLegacy,
  applyEndlessRun,
  pickContinueTarget,
  totalStars,
} from "./rules";

function unique(items: string[]): string[] {
  return [...new Set(items)];
}

/** 全部关卡按章节顺序 + 关内顺序排列，供“继续历险”目标选择使用。 */
const ORDERED_LEVELS: Level[] = [...CHAPTERS]
  .sort((a, b) => a.order - b.order)
  .flatMap((chapter) => [...chapter.levels].sort((a, b) => a.order - b.order));

function chapterBossCleared(chapter: Chapter, clearedLevels: string[]): boolean {
  const boss = chapter.levels.find((level) => level.boss) ?? chapter.levels[chapter.levels.length - 1];
  return boss ? clearedLevels.includes(boss.id) : false;
}

export function migrateSave(save: PlayerSave): PlayerSave {
  // 先规范化（缺失/非法字段回退默认值），再做旧关卡 id 映射。
  const base = normalizeSave(save);
  const clearedLevels = unique(base.clearedLevels.map((id) => LEGACY_LEVEL_IDS[id] ?? id));
  const achievements = unique(
    base.achievements.map((id) => (id === "poet-libai" ? "poet-libai" : id)),
  );
  return { ...base, clearedLevels, achievements };
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
  return chapterBossCleared(chapter, save.clearedLevels);
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

/**
 * 通关写入，兼容两种调用：
 * - 旧：applyLevelWin(save, levelId, fullHp)（满血布尔值）；
 * - 新：applyLevelWin(save, levelId, run)（本局表现 LevelRunResult）。
 */
export function applyLevelWin(
  save: PlayerSave,
  levelId: string,
  runOrFullHp: LevelRunResult | boolean,
): PlayerSave {
  const run = levelRunFromLegacy(levelId, runOrFullHp);
  const level = levelById(levelId);
  const chapter = chapterOfLevel(level);
  // 朝代成就要看“写入本关之后”的通关集合，这里先算出下一帧的 clearedLevels。
  const clearedLevels =
    run.won && !save.clearedLevels.includes(level.id)
      ? [...save.clearedLevels, level.id]
      : save.clearedLevels;
  const dynastyDone =
    level.boss &&
    CHAPTERS.filter((item) => item.dynastyId === chapter.dynastyId).every((item) =>
      chapterBossCleared(item, clearedLevels),
    );
  const world: LevelWinWorld = {
    isBoss: level.boss,
    chapterLevels: chapter.levels.map((item) => ({ id: item.id, boss: item.boss })),
    poetAchievementId: level.boss ? `poet-${chapter.poetId}` : null,
    dynastyAchievementId: dynastyDone ? `dynasty-${chapter.dynastyId}` : null,
  };
  return applyLevelWinCore(save, level.id, run, world);
}

/** 最早一个已解锁且未通关的关卡；全部通关时返回 null。 */
export function nextPlayableLevel(save: PlayerSave): Level | null {
  return (
    ORDERED_LEVELS.find(
      (level) => !save.clearedLevels.includes(level.id) && isLevelUnlocked(level.id, save),
    ) ?? null
  );
}

/** 最近通关的关卡（“再战提分”目标）；没有任何通关记录时返回 null。 */
export function nextReplayLevel(save: PlayerSave): Level | null {
  for (let i = ORDERED_LEVELS.length - 1; i >= 0; i -= 1) {
    const level = ORDERED_LEVELS[i];
    if (level && save.clearedLevels.includes(level.id)) return level;
  }
  return null;
}

/** 首页“继续历险”目标：未通关取下一个可挑战关卡，全通关取最近通关关卡。 */
export function continueTarget(save: PlayerSave): ContinueTarget | null {
  const nodes: LevelProgressNode[] = ORDERED_LEVELS.map((level) => ({
    id: level.id,
    unlocked: isLevelUnlocked(level.id, save),
    cleared: save.clearedLevels.includes(level.id),
  }));
  const target = pickContinueTarget(nodes);
  return target ? { levelId: levelById(target.levelId).id, replay: target.replay } : null;
}

export function unlockedPoemIds(save: PlayerSave): string[] {
  return LEVELS.filter((level) => save.clearedLevels.includes(level.id)).map((level) => level.poemId);
}

export function rescuedCount(save: PlayerSave): { have: number; total: number } {
  return { have: rescuedPoetIds(save).length, total: CHAPTERS.length };
}

export { chapterById, ACHIEVEMENTS };
