import { ACHIEVEMENTS, COLLECTIONS, POEMS, achievementProgress, chaptersIn, poemsInChapter } from "./content";
import type { ContinueTarget, PlayerSave, PoemRunResult } from "./types";
import {
  applyPoemRun,
  normalizeSave,
  pickContinueTarget,
  type PoemProgressNode,
} from "./rules";

// 纯规则集中在 rules.ts（可被 node 纯函数测试直接加载），这里统一对外导出，
// 页面与答题组件继续只从 progress.ts 取规则。
export {
  EMPTY_POEM_RECORD,
  BASE_ANSWER_SCORE,
  COMBO_BONUS_STEP,
  COMBO_BONUS_CAP,
  LINK_BONUS,
  TALISMANS,
  normalizeSave,
  normalizePoemRecord,
  normalizeRunResult,
  starsForRun,
  scoreForAnswer,
  mergePoemRecord,
  applyPoemRun,
  pickContinueTarget,
  poemContextFor,
  totalStars,
} from "./rules";

function unique(items: string[]): string[] {
  return [...new Set(items)];
}

/**
 * 一张诗卡答完且及格 = 通关该诗卡。成就按全通制即时补发（只增不减，ADR-0013）。
 * 带 run 时同时合并该卡历史最佳成绩并累加总分（玩法重做口径，ADR-0015）。
 */
export function applyPoemWin(save: PlayerSave, poemId: string, run?: PoemRunResult): PlayerSave {
  const base = run ? applyPoemRun(save, run) : normalizeSave(save);
  const clearedPoems = unique(
    base.clearedPoems.includes(poemId) ? base.clearedPoems : [...base.clearedPoems, poemId],
  );
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

/** 全部诗卡按环游顺序（文集序 → 章序 → 卡序）排列，供「继续环游」目标选择使用。 */
const ORDERED_POEMS: string[] = COLLECTIONS.flatMap((collection) =>
  chaptersIn(collection.id).flatMap((chapter) => poemsInChapter(chapter.id).map((poem) => poem.id)),
);

/** 首页「继续环游」目标：环游全开放（ADR-0011），未通关取下一张诗卡，
 *  全通关取环游顺序里最后一张已通关诗卡（「再战提分」）。 */
export function continueTarget(save: PlayerSave): ContinueTarget | null {
  const cleared = new Set(save.clearedPoems);
  const nodes: PoemProgressNode[] = ORDERED_POEMS.map((id) => ({
    id,
    unlocked: true,
    cleared: cleared.has(id),
  }));
  return pickContinueTarget(nodes);
}
