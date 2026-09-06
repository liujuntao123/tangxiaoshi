import { ACHIEVEMENTS, POEMS, achievementProgress } from "./content";
import type { PlayerSave, PoemRunResult } from "./types";
import { applyPoemRun, normalizeSave } from "./rules";
import { buildLevelPlan, type LevelPlan } from "./levels";

// 纯规则集中在 rules.ts / levels.ts（可被 node 纯函数测试直接加载），这里统一对外导出，
// 页面与答题组件继续只从 progress.ts 取规则与真实题库的绑定。
export {
  EMPTY_POEM_RECORD,
  BASE_ANSWER_SCORE,
  COMBO_BONUS_STEP,
  COMBO_BONUS_CAP,
  LINK_BONUS,
  normalizeSave,
  normalizePoemRecord,
  normalizeRunResult,
  starsForRun,
  scoreForAnswer,
  mergePoemRecord,
  applyPoemRun,
  poemContextFor,
  totalStars,
} from "./rules";
export {
  ITEM_DEFS,
  LEVEL_COUNT,
  LEVEL_PASS,
  QUESTIONS_PER_LEVEL,
  SPARES_PER_LEVEL,
  applyLevelResult,
  isLevelUnlocked,
  levelProgress,
  levelStars,
  nextLevelTarget,
  starsForLevelRun,
} from "./levels";

/**
 * 玩家专属关卡计划：userId 决定全库诗的洗牌顺序，因此同一玩家的每关题目
 * 永远固定，不同玩家互不相同（防透题，ADR-0018）。
 */
export function levelPlanFor(userId: string, level: number): LevelPlan {
  return buildLevelPlan(POEMS, userId, level);
}

/**
 * 一张诗卡答完且及格 = 通关该诗卡。成就按全通制即时补发（只增不减，ADR-0013）。
 * 带 run 时同时合并该卡历史最佳成绩并累加总分。
 */
export function applyPoemWin(save: PlayerSave, poemId: string, run?: PoemRunResult): PlayerSave {
  const base = run ? applyPoemRun(save, run) : normalizeSave(save);
  const clearedPoems = base.clearedPoems.includes(poemId)
    ? base.clearedPoems
    : [...base.clearedPoems, poemId];
  const next: PlayerSave = { ...base, clearedPoems };
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

/** 无尽一局结束：连对与得分分别刷新双最佳。 */
export { applyEndlessRun } from "./rules";

export function clearedCount(save: PlayerSave): { have: number; total: number } {
  return { have: save.clearedPoems.length, total: POEMS.length };
}
