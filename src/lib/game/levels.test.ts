import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  LEVEL_COUNT,
  LEVEL_PASS,
  LEVELS_PER_TIER,
  POEMS_PER_LEVEL,
  QUESTIONS_PER_LEVEL,
  SPARES_PER_LEVEL,
  TIER_COUNT,
  TIER_LABELS,
  applyLevelResult,
  bandOrder,
  buildLevelPlan,
  buildTierBands,
  deterministicShuffle,
  hashString,
  isLevelUnlocked,
  levelProgress,
  levelSeed,
  levelStars,
  nextLevelTarget,
  starsForLevelRun,
  tierForLevel,
  tierLabel,
} from "./levels.ts";
import { EMPTY_SAVE, type PlayerSave, type Poem, type Question, type Stars } from "./types.ts";

/** 造 N 首合成诗，每首 5 题，题目内容带诗 id 便于断言；难度、篇幅、常见度可注入。 */
function makePoems(
  count: number,
  difficulty: (index: number) => number = () => 1,
  textLen?: (index: number) => number,
  studyRank: (index: number) => number = () => 1000,
): Poem[] {
  return Array.from({ length: count }, (_, i) => {
    const id = String(i + 1);
    const questions: Question[] = Array.from({ length: 5 }, (_, q) => ({
      id: `${id}-q${q + 1}`,
      type: "complete-next",
      prompt: `诗${id}题${q + 1}`,
      quote: `诗${id}句${q + 1}`,
      choices: ["对", "甲", "乙", "丙"],
      answerIndex: 0,
    }));
    return {
      id,
      collectionId: "c",
      chapterIndex: 1,
      authorId: `a${id}`,
      authorName: `作者${id}`,
      dynastyId: "tang",
      title: `诗${id}`,
      lines: [],
      text: textLen ? "字".repeat(textLen(i)) : "",
      background: "",
      difficulty: difficulty(i),
      studyRank: studyRank(i),
      questions,
    };
  });
}

function baseSave(overrides: Partial<PlayerSave> = {}): PlayerSave {
  return { ...EMPTY_SAVE, ...overrides };
}

describe("关卡计划（buildLevelPlan）", () => {
  const poems = makePoems(60);

  it("同一玩家永远得到同一份题目（确定性）", () => {
    const a = buildLevelPlan(poems, "player-a", 1);
    const b = buildLevelPlan(poems, "player-a", 1);
    assert.deepEqual(
      a.questions.map((q) => q.question.id),
      b.questions.map((q) => q.question.id),
    );
    assert.deepEqual(
      a.spares.map((q) => q.question.id),
      b.spares.map((q) => q.question.id),
    );
  });

  it("不同玩家的题目序列互不相同（防透题）", () => {
    const a = buildLevelPlan(poems, "player-a", 1);
    const b = buildLevelPlan(poems, "player-b", 1);
    const seqA = a.questions.map((q) => q.question.id).join(",");
    const seqB = b.questions.map((q) => q.question.id).join(",");
    assert.notEqual(seqA, seqB);
  });

  it("每关 10 道正式题来自 10 首不同的诗，另备 3 道补答题", () => {
    const plan = buildLevelPlan(poems, "player-a", 2);
    assert.equal(plan.questions.length, QUESTIONS_PER_LEVEL);
    assert.equal(plan.spares.length, SPARES_PER_LEVEL);
    const poemsInLevel = new Set(plan.questions.map((q) => q.poem.id));
    assert.equal(poemsInLevel.size, QUESTIONS_PER_LEVEL);
    const questionIds = new Set(plan.questions.map((q) => q.question.id));
    assert.equal(questionIds.size, QUESTIONS_PER_LEVEL);
  });

  it("关卡之间题目零重复（占用诗段互不重叠）", () => {
    const seen = new Set<string>();
    for (let level = 1; level <= 4; level += 1) {
      const plan = buildLevelPlan(poems, "player-a", level);
      for (const { question } of [...plan.questions, ...plan.spares]) {
        assert.ok(!seen.has(question.id), `题目 ${question.id} 在前面关卡出现过`);
        seen.add(question.id);
      }
    }
    assert.equal(seen.size, 4 * POEMS_PER_LEVEL);
  });

  it("关卡序号越界直接报错", () => {
    assert.throws(() => buildLevelPlan(poems, "player-a", 0));
    assert.throws(() => buildLevelPlan(poems, "player-a", LEVEL_COUNT + 1));
  });
});

describe("学段难度分档（ADR-0020）", () => {
  /** 5 档 × 每档 N 首的标准题库；text 长度 = 全局序号，档内篇幅升序可精确断言。 */
  function makeTierBank(perTier: number): Poem[] {
    return makePoems(
      perTier * TIER_COUNT,
      (i) => Math.floor(i / perTier) + 1,
      (i) => i + 1,
    );
  }

  it("关卡 → 档位映射：每 10 关一档", () => {
    assert.equal(LEVELS_PER_TIER, 10);
    assert.equal(TIER_COUNT * LEVELS_PER_TIER, LEVEL_COUNT);
    assert.equal(tierForLevel(1), 1);
    assert.equal(tierForLevel(10), 1);
    assert.equal(tierForLevel(11), 2);
    assert.equal(tierForLevel(31), 4);
    assert.equal(tierForLevel(50), 5);
    assert.equal(tierForLevel(0), 1);
    assert.equal(tierForLevel(99), 5);
  });

  it("档位标签：小学·低 → 高中，越界为空串", () => {
    assert.deepEqual([...TIER_LABELS], ["小学·低", "小学·中", "小学·高", "初中", "高中"]);
    assert.equal(tierLabel(3), "小学·高");
    assert.equal(tierLabel(0), "");
    assert.equal(tierLabel(6), "");
  });

  it("每关的题只来自本关档位的诗", () => {
    const bank = makeTierBank(130);
    for (let level = 1; level <= LEVEL_COUNT; level += 1) {
      const plan = buildLevelPlan(bank, "player-a", level);
      const tier = tierForLevel(level);
      for (const { poem } of [...plan.questions, ...plan.spares]) {
        assert.equal(poem.difficulty, tier, `第 ${level} 关出现了非 T${tier} 的诗`);
      }
    }
  });

  it("全 50 关题目零重复（档位补足不破坏全局不重叠）", () => {
    const bank = makeTierBank(130);
    const seen = new Set<string>();
    for (let level = 1; level <= LEVEL_COUNT; level += 1) {
      const plan = buildLevelPlan(bank, "player-a", level);
      for (const { question } of [...plan.questions, ...plan.spares]) {
        assert.ok(!seen.has(question.id), `题目 ${question.id} 在前面的关卡出现过`);
        seen.add(question.id);
      }
    }
    assert.equal(seen.size, LEVEL_COUNT * POEMS_PER_LEVEL);
  });

  it("档内常见度递进：第 1 关全是教材篇目，第 10 关只剩生僻诗", () => {
    // 每档 30 首教材篇目（studyRank 0，即便篇幅长）+ 100 首生僻诗（studyRank 1000）
    const bank = makePoems(
      130 * TIER_COUNT,
      (i) => Math.floor(i / 130) + 1,
      (i) => i + 1,
      (i) => (i % 130 < 30 ? 0 : 1000),
    );
    for (const first of [1, 11, 21, 31, 41]) {
      const l1 = buildLevelPlan(bank, "player-a", first).questions;
      for (const { poem } of l1) {
        assert.equal(poem.studyRank, 0, `第 ${first} 关应只出教材篇目`);
      }
    }
    for (const last of [10, 20, 30, 40, 50]) {
      const l10 = buildLevelPlan(bank, "player-a", last).questions;
      for (const { poem } of l10) {
        assert.equal(poem.studyRank, 1000, `第 ${last} 关应只剩生僻诗`);
      }
    }
  });

  it("教材篇目即使篇幅更长也优先出现（常见度压过篇幅）", () => {
    // 16 首教材诗篇幅 500+ 字，114 首生僻诗只有十几字
    const bank = makePoems(
      130,
      () => 1,
      (i) => (i < 16 ? 500 + i : 10 + i),
      (i) => (i < 16 ? 0 : 1000),
    );
    const l1 = buildLevelPlan(bank, "player-a", 1).questions;
    for (const { poem } of l1) assert.equal(poem.studyRank, 0, "第 1 关不应出现生僻短诗");
  });

  it("档位不足 130 首时由相邻档就近补足，一首诗只进一个档", () => {
    // T1 只有 50 首（缺 80），T2 充足：T1 档应从 T2 补足，且 T2 档不再重复用这些诗
    const bank = makePoems(
      300,
      (i) => (i < 50 ? 1 : 2),
      (i) => (i < 50 ? i + 1 : 1000 + i),
    );
    const seen = new Set<string>();
    let toppedUp = false;
    for (let level = 1; level <= 20; level += 1) {
      const plan = buildLevelPlan(bank, "player-a", level);
      for (const { poem, question } of [...plan.questions, ...plan.spares]) {
        assert.ok(!seen.has(question.id), `题目 ${question.id} 重复出场`);
        seen.add(question.id);
        if (poem.difficulty === 2 && level <= 10) toppedUp = true;
        if (poem.difficulty === 1) assert.ok(level <= 10, "T1 的诗不应出现在 T2 关卡");
      }
    }
    assert.ok(toppedUp, "T1 关卡应包含 T2 补足的诗");
    assert.equal(seen.size, 20 * POEMS_PER_LEVEL);
  });

  it("bandOrder：常见度组间顺序全服一致，组内顺序因人而异", () => {
    // 每档 30 教材（rank 0）+ 100 生僻（rank 1000）
    const bank = makePoems(
      130,
      () => 1,
      (i) => i + 1,
      (i) => (i < 30 ? 0 : 1000),
    );
    const band = buildTierBands(bank)[1] as Poem[];
    const a = bandOrder(band, "player-a");
    const b = bandOrder(band, "player-b");
    assert.equal(a.length, band.length);
    // 组间顺序固定：两者的 studyRank 序列完全相同（教材块在前，生僻块在后）
    assert.deepEqual(
      a.map((p) => p.studyRank),
      b.map((p) => p.studyRank),
    );
    // 组内顺序因人而异：具体诗序不同
    assert.notEqual(a.map((p) => p.id).join(","), b.map((p) => p.id).join(","));
    // 块边界对齐：教材块（前 30 首）完整地排在生僻块之前
    assert.ok(a.slice(0, 30).every((p) => p.studyRank === 0));
    assert.ok(a.slice(30).every((p) => p.studyRank === 1000));
  });

  it("buildTierBands：档与档之间零重叠", () => {
    const bank = makeTierBank(130);
    const bands = buildTierBands(bank);
    assert.equal(bands.length, TIER_COUNT + 1);
    const ids = new Set<string>();
    for (let tier = 1; tier <= TIER_COUNT; tier += 1) {
      for (const poem of bands[tier] as Poem[]) {
        assert.ok(!ids.has(poem.id), `诗 ${poem.id} 同时出现在多个档`);
        ids.add(poem.id);
      }
    }
  });
});

describe("关卡星级与进度", () => {
  it("三星零答错、两星答错≤2、其余一星、失败零星", () => {
    assert.equal(starsForLevelRun({ won: true, mistakes: 0 }), 3);
    assert.equal(starsForLevelRun({ won: true, mistakes: 2 }), 2);
    assert.equal(starsForLevelRun({ won: true, mistakes: 3 }), 1);
    assert.equal(starsForLevelRun({ won: false, mistakes: 0 }), 0);
  });

  it("第 1 关始终开放，其余按前一关解锁", () => {
    const save = baseSave();
    assert.ok(isLevelUnlocked(save, 1));
    assert.ok(!isLevelUnlocked(save, 2));
    const cleared = baseSave({ levelStars: { "1": 2 } });
    assert.ok(isLevelUnlocked(cleared, 2));
    assert.ok(!isLevelUnlocked(cleared, 3));
  });

  it("继续闯关目标 = 最早未通关关卡；全部通关返回 null", () => {
    assert.equal(nextLevelTarget(baseSave()), 1);
    const midway = baseSave({ levelStars: { "1": 3, "2": 1 } });
    assert.equal(nextLevelTarget(midway), 3);
    const all = Object.fromEntries(
      Array.from({ length: LEVEL_COUNT }, (_, i) => [String(i + 1), 3]),
    ) as Record<string, Stars>;
    assert.equal(nextLevelTarget(baseSave({ levelStars: all })), null);
  });

  it("levelProgress 统计通关数与星星总数", () => {
    const save = baseSave({ levelStars: { "1": 3, "2": 1 } });
    assert.deepEqual(levelProgress(save), { cleared: 2, stars: 4 });
  });

  it("非法关卡序号读数为 0 星", () => {
    assert.equal(levelStars(baseSave(), 99), 0);
    assert.equal(levelStars(baseSave(), 0), 0);
  });
});

describe("关卡结算与道具奖励", () => {
  it("首次过关：写星级、发 1 个道具、得分入总分", () => {
    const result = applyLevelResult(baseSave(), "player-a", { level: 1, won: true, mistakes: 0, score: 500 });
    assert.equal(result.prevStars, 0);
    assert.equal(result.stars, 3);
    assert.equal(result.granted.length, 3); // 1→2→3 三档新星各发 1 个
    assert.equal(result.save.levelStars["1"], 3);
    assert.equal(result.save.totalScore, 500);
    const itemCount = Object.values(result.save.items).reduce((sum, n) => sum + n, 0);
    assert.equal(itemCount, 3);
  });

  it("同一星级重复通关不再发道具，但得分照常累计", () => {
    const first = applyLevelResult(baseSave(), "player-a", { level: 1, won: true, mistakes: 0, score: 500 });
    const again = applyLevelResult(first.save, "player-a", { level: 1, won: true, mistakes: 0, score: 600 });
    assert.equal(again.granted.length, 0);
    assert.equal(again.save.totalScore, 1100);
  });

  it("星级提升只补发新星档的道具，星级不回退", () => {
    const first = applyLevelResult(baseSave(), "player-a", { level: 2, won: true, mistakes: 3, score: 300 });
    assert.equal(first.stars, 1);
    const better = applyLevelResult(first.save, "player-a", { level: 2, won: true, mistakes: 0, score: 800 });
    assert.equal(better.prevStars, 1);
    assert.equal(better.stars, 3);
    assert.equal(better.granted.length, 2);
    assert.equal(better.save.levelStars["2"], 3);
  });

  it("失败不写星级、不发道具、不入总分", () => {
    const result = applyLevelResult(baseSave(), "player-a", { level: 1, won: false, mistakes: 5, score: 200 });
    assert.equal(result.stars, 0);
    assert.equal(result.granted.length, 0);
    assert.deepEqual(result.save.levelStars, {});
    assert.equal(result.save.totalScore, 0);
  });

  it("奖励由 玩家+关卡+星档 决定，跨次序稳定且都是合法道具", () => {
    const a = applyLevelResult(baseSave(), "player-a", { level: 5, won: true, mistakes: 0, score: 100 });
    const b = applyLevelResult(baseSave(), "player-a", { level: 5, won: true, mistakes: 0, score: 900 });
    assert.deepEqual(a.granted, b.granted);
    for (const id of a.granted) {
      assert.ok(["reveal", "redo", "double"].includes(id), `非法道具 ${id}`);
    }
  });
});

describe("底层随机原语", () => {
  it("hashString 与 levelSeed 稳定且区分玩家", () => {
    assert.equal(hashString("abc"), hashString("abc"));
    assert.notEqual(levelSeed("player-a"), levelSeed("player-b"));
  });

  it("deterministicShuffle 不修改入参且可复现", () => {
    const source = [1, 2, 3, 4, 5, 6, 7, 8];
    const snapshot = [...source];
    const once = deterministicShuffle(source, 42);
    assert.deepEqual(source, snapshot);
    assert.deepEqual(once, deterministicShuffle(source, 42));
    assert.notDeepEqual([...source].sort((a, b) => a - b), once);
  });
});

describe("过关线常量", () => {
  it("10 题答对 6 题过关（60% 及格）", () => {
    assert.equal(QUESTIONS_PER_LEVEL, 10);
    assert.equal(LEVEL_PASS, 6);
  });
});
