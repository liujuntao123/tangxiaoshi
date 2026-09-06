import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  applyEndlessRun,
  applyLevelRun,
  applyLevelWinCore,
  levelRunFromLegacy,
  mergeLevelRecord,
  normalizeLevelRecord,
  normalizeRunResult,
  normalizeSave,
  pickContinueTarget,
  scoreForAnswer,
  starsForRun,
  TALISMANS,
  totalStars,
} from "./rules.ts";
import type { LevelRunResult, PlayerSave } from "./types.ts";

function baseSave(overrides: Partial<PlayerSave> = {}): PlayerSave {
  return {
    clearedLevels: [],
    keysOwned: 0,
    achievements: [],
    endlessBestStreak: 0,
    endlessBestScore: 0,
    levelRecords: {},
    totalScore: 0,
    ...overrides,
  };
}

function run(overrides: Partial<LevelRunResult> = {}): LevelRunResult {
  return {
    levelId: "level-1",
    won: true,
    hpLeft: 3,
    maxCombo: 0,
    score: 0,
    mistakes: 0,
    talisman: null,
    ...overrides,
  };
}

/** 章节世界：两个普通关卡 + 一个 boss，通关普通关各得 1 把钥匙。 */
const world = {
  isBoss: false,
  chapterLevels: [
    { id: "level-1", boss: false },
    { id: "level-2", boss: false },
    { id: "level-3", boss: true },
  ],
  poetAchievementId: null,
  dynastyAchievementId: null,
};

describe("normalizeSave", () => {
  it("旧存档缺失新字段时回退默认值，原字段保留", () => {
    const save = normalizeSave({
      clearedLevels: ["level-1"],
      keysOwned: 2,
      achievements: ["no-damage"],
      endlessBestStreak: 4,
      endlessBestScore: 7,
    });
    assert.deepEqual(save, {
      clearedLevels: ["level-1"],
      keysOwned: 2,
      achievements: ["no-damage"],
      endlessBestStreak: 4,
      endlessBestScore: 7,
      levelRecords: {},
      totalScore: 0,
    });
  });

  it("整体不是对象时返回全默认值", () => {
    assert.deepEqual(normalizeSave(null), baseSave());
    assert.deepEqual(normalizeSave(42), baseSave());
    assert.deepEqual(normalizeSave("nope"), baseSave());
    assert.deepEqual(normalizeSave(undefined), baseSave());
  });

  it("非法字段逐项回退默认值", () => {
    const save = normalizeSave({
      clearedLevels: "level-1",
      keysOwned: -5,
      achievements: ["no-damage", 3, null, "ten-streak"],
      endlessBestStreak: Number.NaN,
      endlessBestScore: "x",
      totalScore: -1,
      levelRecords: "nope",
    });
    assert.deepEqual(save.clearedLevels, []);
    assert.equal(save.keysOwned, 0);
    assert.deepEqual(save.achievements, ["no-damage", "ten-streak"]);
    assert.equal(save.endlessBestStreak, 0);
    assert.equal(save.endlessBestScore, 0);
    assert.equal(save.totalScore, 0);
    assert.deepEqual(save.levelRecords, {});
  });

  it("levelRecords 丢弃非法条目、钳制/修补缺字段的条目", () => {
    const save = normalizeSave({
      levelRecords: {
        "level-1": { bestStars: 3, bestScore: 480, bestCombo: 4, attempts: 2 },
        "level-2": { bestStars: 9, bestScore: -3 },
        "level-3": "garbage",
        "level-4": null,
      },
    });
    assert.deepEqual(save.levelRecords["level-1"], { bestStars: 3, bestScore: 480, bestCombo: 4, attempts: 2 });
    assert.deepEqual(save.levelRecords["level-2"], { bestStars: 3, bestScore: 0, bestCombo: 0, attempts: 0 });
    assert.equal("level-3" in save.levelRecords, false);
    assert.equal("level-4" in save.levelRecords, false);
  });

  it("不修改入参，且两次结果不共享可变引用", () => {
    const input = { levelRecords: { "level-1": { bestStars: 1 } } };
    const save = normalizeSave(input);
    assert.deepEqual(input.levelRecords["level-1"], { bestStars: 1 });
    save.levelRecords["level-9"] = normalizeLevelRecord({ bestStars: 2 })!;
    assert.equal("level-9" in normalizeSave(input).levelRecords, false);
  });
});

describe("starsForRun", () => {
  it("失败为 0 星", () => {
    assert.equal(starsForRun(run({ won: false, hpLeft: 3 })), 0);
  });

  it("3 星：满血且零失误", () => {
    assert.equal(starsForRun(run({ hpLeft: 3, mistakes: 0 })), 3);
  });

  it("护卷挡下也算失误，拿不到 3 星，但满血仍有 2 星", () => {
    assert.equal(starsForRun(run({ hpLeft: 3, mistakes: 1 })), 2);
  });

  it("2 星：剩 2 血，或连击达 3", () => {
    assert.equal(starsForRun(run({ hpLeft: 2, mistakes: 1 })), 2);
    assert.equal(starsForRun(run({ hpLeft: 1, maxCombo: 3, mistakes: 1 })), 2);
  });

  it("1 星：仅完成关卡", () => {
    assert.equal(starsForRun(run({ hpLeft: 1, maxCombo: 2, mistakes: 2 })), 1);
    assert.equal(starsForRun(run({ hpLeft: 0, mistakes: 3 })), 1);
  });

  it("越界血量被钳制", () => {
    assert.equal(starsForRun(run({ hpLeft: 9 })), 3);
    assert.equal(starsForRun(run({ hpLeft: -2 })), 1);
  });
});

describe("scoreForAnswer", () => {
  it("普通正确 100 分", () => {
    assert.equal(scoreForAnswer({ combo: 1 }), 100);
  });

  it("每多 1 层连击 +25", () => {
    assert.equal(scoreForAnswer({ combo: 2 }), 125);
    assert.equal(scoreForAnswer({ combo: 3 }), 150);
  });

  it("连击加成封顶 +100", () => {
    assert.equal(scoreForAnswer({ combo: 5 }), 200);
    assert.equal(scoreForAnswer({ combo: 9 }), 200);
  });

  it("连携额外 +100", () => {
    assert.equal(scoreForAnswer({ combo: 1, linked: true }), 200);
    assert.equal(scoreForAnswer({ combo: 5, linked: true }), 300);
  });
});

describe("mergeLevelRecord", () => {
  it("首战建立记录，attempts 为 1", () => {
    const record = mergeLevelRecord(undefined, run({ score: 250, maxCombo: 2, mistakes: 1, hpLeft: 2 }));
    assert.deepEqual(record, { bestStars: 2, bestScore: 250, bestCombo: 2, attempts: 1 });
  });

  it("历史只保留最高值，不因重战降低", () => {
    const prev = { bestStars: 3 as const, bestScore: 480, bestCombo: 4, attempts: 1 };
    const record = mergeLevelRecord(prev, run({ score: 100, maxCombo: 1, mistakes: 2, hpLeft: 1 }));
    assert.deepEqual(record, { bestStars: 3, bestScore: 480, bestCombo: 4, attempts: 2 });
  });

  it("刷新最佳分数与连击", () => {
    const prev = { bestStars: 1 as const, bestScore: 100, bestCombo: 1, attempts: 3 };
    const record = mergeLevelRecord(prev, run({ score: 300, maxCombo: 4, mistakes: 0, hpLeft: 3 }));
    assert.deepEqual(record, { bestStars: 3, bestScore: 300, bestCombo: 4, attempts: 4 });
  });
});

describe("applyLevelRun", () => {
  it("写入关卡记录并累加总分", () => {
    const save = applyLevelRun(baseSave(), run({ score: 150 }));
    assert.deepEqual(save.levelRecords["level-1"], { bestStars: 3, bestScore: 150, bestCombo: 0, attempts: 1 });
    assert.equal(save.totalScore, 150);
  });

  it("失败的一局也计次与累计得分，但不改变通关与钥匙", () => {
    const save = applyLevelRun(
      baseSave({ totalScore: 100, clearedLevels: ["level-1"], keysOwned: 1 }),
      run({ won: false, levelId: "level-2", score: 75, mistakes: 3, hpLeft: 0 }),
    );
    assert.deepEqual(save.levelRecords["level-2"], { bestStars: 0, bestScore: 75, bestCombo: 0, attempts: 1 });
    assert.equal(save.totalScore, 175);
    assert.deepEqual(save.clearedLevels, ["level-1"]);
    assert.equal(save.keysOwned, 1);
  });

  it("非法 levelId 时原样返回（仅规范化）", () => {
    const save = baseSave({ totalScore: 5 });
    assert.deepEqual(applyLevelRun(save, run({ levelId: "" })), { ...save });
  });
});

describe("levelRunFromLegacy（旧调用兼容）", () => {
  it("布尔 true 视为满血 3 星表现", () => {
    const legacy = levelRunFromLegacy("level-1", true);
    assert.equal(legacy.won, true);
    assert.equal(starsForRun(legacy), 3);
    assert.equal(legacy.score, 0);
  });

  it("布尔 false 保守记 1 星", () => {
    assert.equal(starsForRun(levelRunFromLegacy("level-1", false)), 1);
  });

  it("新调用透传并规范化", () => {
    const normalized = levelRunFromLegacy("level-1", run({ hpLeft: 99, score: -4, talisman: "ward" }));
    assert.equal(normalized.hpLeft, 3);
    assert.equal(normalized.score, 0);
    assert.equal(normalized.talisman, "ward");
  });
});

describe("applyLevelWinCore", () => {
  it("首胜：计入通关、重算钥匙、写记录、加分", () => {
    const save = applyLevelWinCore(baseSave(), "level-1", run({ score: 200 }), world);
    assert.deepEqual(save.clearedLevels, ["level-1"]);
    assert.equal(save.keysOwned, 1);
    assert.deepEqual(save.levelRecords["level-1"], { bestStars: 3, bestScore: 200, bestCombo: 0, attempts: 1 });
    assert.equal(save.totalScore, 200);
  });

  it("满血胜利授予“滴水不漏”，掉血则不给", () => {
    const full = applyLevelWinCore(baseSave(), "level-1", run({ hpLeft: 3, mistakes: 0 }), world);
    assert.ok(full.achievements.includes("no-damage"));
    const hurt = applyLevelWinCore(baseSave(), "level-1", run({ hpLeft: 2, mistakes: 1 }), world);
    assert.ok(!hurt.achievements.includes("no-damage"));
  });

  it("boss 胜利授予诗人与朝代成就", () => {
    const save = applyLevelWinCore(baseSave(), "level-3", run(), {
      isBoss: true,
      chapterLevels: world.chapterLevels,
      poetAchievementId: "poet-libai",
      dynastyAchievementId: "dynasty-tang",
    });
    assert.ok(save.achievements.includes("poet-libai"));
    assert.ok(save.achievements.includes("dynasty-tang"));
  });

  it("已通关关卡重战：不重复加通关、不重复加钥匙、成绩取最高", () => {
    const first = applyLevelWinCore(baseSave(), "level-1", run({ score: 200 }), world);
    const replay = applyLevelWinCore(first, "level-1", run({ score: 300, maxCombo: 4 }), world);
    assert.deepEqual(replay.clearedLevels, ["level-1"]);
    assert.equal(replay.keysOwned, 1);
    assert.deepEqual(replay.levelRecords["level-1"], { bestStars: 3, bestScore: 300, bestCombo: 4, attempts: 2 });
  });

  it("旧调用（布尔参数）路径：满血给成就，掉血不给", () => {
    const full = applyLevelWinCore(baseSave(), "level-1", levelRunFromLegacy("level-1", true), world);
    assert.ok(full.achievements.includes("no-damage"));
    assert.equal(full.levelRecords["level-1"]!.bestStars, 3);
    const hurt = applyLevelWinCore(baseSave(), "level-1", levelRunFromLegacy("level-1", false), world);
    assert.ok(!hurt.achievements.includes("no-damage"));
    assert.equal(hurt.levelRecords["level-1"]!.bestStars, 1);
  });
});

describe("applyEndlessRun", () => {
  it("刷新双最佳", () => {
    const save = applyEndlessRun(baseSave({ endlessBestScore: 3, endlessBestStreak: 2 }), 5);
    assert.equal(save.endlessBestScore, 5);
    assert.equal(save.endlessBestStreak, 5);
  });

  it("不刷新时保留旧纪录", () => {
    const save = applyEndlessRun(baseSave({ endlessBestScore: 8, endlessBestStreak: 8 }), 3);
    assert.equal(save.endlessBestScore, 8);
    assert.equal(save.endlessBestStreak, 8);
  });

  it("十连击触发成就，以下不触发", () => {
    assert.ok(applyEndlessRun(baseSave(), 10).achievements.includes("ten-streak"));
    assert.ok(applyEndlessRun(baseSave(), 12).achievements.includes("ten-streak"));
    assert.ok(!applyEndlessRun(baseSave(), 9).achievements.includes("ten-streak"));
  });

  it("非法分数回退 0，不污染纪录", () => {
    const save = applyEndlessRun(baseSave({ endlessBestScore: 4, endlessBestStreak: 4 }), Number.NaN);
    assert.equal(save.endlessBestScore, 4);
    assert.equal(save.endlessBestStreak, 4);
  });
});

describe("pickContinueTarget（继续历险目标）", () => {
  it("优先选最早一个已解锁且未通关的关卡", () => {
    const target = pickContinueTarget([
      { id: "a", unlocked: true, cleared: true },
      { id: "b", unlocked: true, cleared: true },
      { id: "c", unlocked: true, cleared: false },
      { id: "d", unlocked: true, cleared: false },
    ]);
    assert.deepEqual(target, { levelId: "c", replay: false });
  });

  it("跳过锁定节点，找后面已解锁的未通关关卡", () => {
    const target = pickContinueTarget([
      { id: "a", unlocked: true, cleared: true },
      { id: "b", unlocked: false, cleared: false },
      { id: "c", unlocked: true, cleared: false },
    ]);
    assert.deepEqual(target, { levelId: "c", replay: false });
  });

  it("全部通关时定位最近通关关卡，标记为再战提分", () => {
    const target = pickContinueTarget([
      { id: "a", unlocked: true, cleared: true },
      { id: "b", unlocked: true, cleared: true },
      { id: "c", unlocked: true, cleared: true },
    ]);
    assert.deepEqual(target, { levelId: "c", replay: true });
  });

  it("没有可玩关卡时返回 null", () => {
    assert.equal(pickContinueTarget([]), null);
    assert.equal(
      pickContinueTarget([
        { id: "a", unlocked: false, cleared: false },
        { id: "b", unlocked: false, cleared: false },
      ]),
      null,
    );
  });
});

describe("totalStars", () => {
  it("汇总全部关卡的诗印总数", () => {
    const save = baseSave({
      levelRecords: {
        "level-1": { bestStars: 3, bestScore: 0, bestCombo: 0, attempts: 1 },
        "level-2": { bestStars: 1, bestScore: 0, bestCombo: 0, attempts: 1 },
      },
    });
    assert.equal(totalStars(save), 4);
  });

  it("旧存档为 0", () => {
    assert.equal(totalStars(baseSave()), 0);
  });
});

describe("TALISMANS", () => {
  it("三枚诗签均为一次性且 id 唯一", () => {
    assert.equal(TALISMANS.length, 3);
    assert.equal(new Set(TALISMANS.map((t) => t.id)).size, 3);
    for (const talisman of TALISMANS) {
      assert.equal(talisman.uses, 1);
      assert.ok(talisman.name.length > 0);
      assert.ok(talisman.symbol.length > 0);
      assert.ok(talisman.description.length > 0);
    }
  });
});

describe("normalizeRunResult", () => {
  it("非法诗签回退 null，负分与越界血量被钳制", () => {
    // 模拟无类型来源的脏数据（运行时可能出现，类型层面放不进 LevelRunResult）。
    const bogus = {
      ...run(),
      hpLeft: 8,
      score: -10,
      maxCombo: -2,
      talisman: "bogus",
    } as unknown as LevelRunResult;
    const safe = normalizeRunResult(bogus);
    assert.equal(safe.hpLeft, 3);
    assert.equal(safe.score, 0);
    assert.equal(safe.maxCombo, 0);
    assert.equal(safe.talisman, null);
  });
});
