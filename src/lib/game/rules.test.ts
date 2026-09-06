import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  applyEndlessRun,
  applyPoemRun,
  mergePoemRecord,
  normalizeInventory,
  normalizeLevelStars,
  normalizePoemRecord,
  normalizeRunResult,
  normalizeSave,
  poemContextFor,
  scoreForAnswer,
  starsForRun,
  totalStars,
} from "./rules.ts";
import type { PlayerSave, Poem, PoemRecord, PoemRunResult, Question } from "./types.ts";

function baseSave(overrides: Partial<PlayerSave> = {}): PlayerSave {
  return {
    clearedPoems: [],
    achievements: [],
    endlessBestStreak: 0,
    endlessBestScore: 0,
    metAuthors: [],
    poemRecords: {},
    totalScore: 0,
    levelStars: {},
    items: { reveal: 0, redo: 0, double: 0 },
    ...overrides,
  };
}

function run(overrides: Partial<PoemRunResult> = {}): PoemRunResult {
  return {
    poemId: "123",
    won: true,
    chancesLeft: 3,
    chancesTotal: 3,
    maxCombo: 0,
    score: 0,
    mistakes: 0,
    ...overrides,
  };
}

const testPoem: Poem = {
  id: "1",
  collectionId: "c",
  chapterIndex: 1,
  authorId: "a",
  authorName: "作者",
  dynastyId: "tang",
  title: "静夜思",
  lines: ["床前", "明月光", "疑是", "地上霜"],
  text: "床前，明月光，疑是，地上霜。",
  background: "/art/bg/collections/c-1.png",
  questions: [],
};

function question(answerText: string): Question {
  return {
    id: "1-q1",
    type: "complete-next",
    prompt: "",
    quote: "",
    choices: [answerText, "甲", "乙", "丙"],
    answerIndex: 0,
  };
}

describe("normalizeSave", () => {
  it("旧存档（缺关卡与道具字段）补默认值", () => {
    const legacy = {
      clearedPoems: ["1"],
      achievements: ["author-liyu"],
      endlessBestStreak: 4,
      endlessBestScore: 4,
      metAuthors: ["liyu"],
    };
    const save = normalizeSave(legacy);
    assert.deepEqual(save.clearedPoems, ["1"]);
    assert.deepEqual(save.metAuthors, ["liyu"]);
    assert.deepEqual(save.poemRecords, {});
    assert.equal(save.totalScore, 0);
    assert.deepEqual(save.levelStars, {});
    assert.deepEqual(save.items, { reveal: 0, redo: 0, double: 0 });
  });

  it("整体非对象返回全默认", () => {
    assert.deepEqual(normalizeSave(null), baseSave());
    assert.deepEqual(normalizeSave("x"), baseSave());
    assert.deepEqual(normalizeSave([]), baseSave());
  });

  it("非法字段逐项回退，非法诗卡记录条目丢弃", () => {
    const save = normalizeSave({
      clearedPoems: ["1", 2, "1", null],
      achievements: ["a", 42],
      endlessBestStreak: -5,
      endlessBestScore: Number.NaN,
      metAuthors: "liyu",
      totalScore: "12",
      poemRecords: {
        "1": { bestStars: 9, bestScore: -3, bestCombo: "x", attempts: 2 },
        bad: "junk",
      },
      levelStars: { "1": 2, "x": 3, "0": 1, "2": 9 },
      items: { reveal: 3, redo: -2, double: "x", hack: 9 },
    });
    assert.deepEqual(save.clearedPoems, ["1"]);
    assert.deepEqual(save.achievements, ["a"]);
    assert.equal(save.endlessBestStreak, 0);
    assert.equal(save.endlessBestScore, 0);
    assert.deepEqual(save.metAuthors, []);
    assert.equal(save.totalScore, 0); // 非数字（含数字字符串）不做强转，回退 0
    assert.deepEqual(save.poemRecords["1"], { bestStars: 3, bestScore: 0, bestCombo: 0, attempts: 2 });
    assert.equal(save.poemRecords.bad, undefined);
    assert.deepEqual(save.levelStars, { "1": 2, "2": 3 }); // 非数字 key 丢弃，星级钳到 0-3
    assert.deepEqual(save.items, { reveal: 3, redo: 0, double: 0 }); // 未知道具丢弃，负数回 0
  });

  it("不修改入参", () => {
    const input = { clearedPoems: ["1"], poemRecords: { "1": { bestStars: 2 } } };
    const snapshot = JSON.stringify(input);
    normalizeSave(input);
    assert.equal(JSON.stringify(input), snapshot);
  });
});

describe("normalizePoemRecord / normalizeRunResult", () => {
  it("非法记录返回 null", () => {
    assert.equal(normalizePoemRecord(null), null);
    assert.equal(normalizePoemRecord("x"), null);
    assert.equal(normalizePoemRecord([]), null);
  });

  it("记录字段逐项钳制", () => {
    assert.deepEqual(normalizePoemRecord({ bestStars: 7, bestScore: -1, bestCombo: 1.9, attempts: -2 }), {
      bestStars: 3,
      bestScore: 0,
      bestCombo: 1,
      attempts: 0,
    });
  });

  it("run 结果：chancesLeft 钳到 [0, chancesTotal]", () => {
    const dirty = run({ chancesLeft: 99, maxCombo: -4 }) as unknown as Record<string, unknown>;
    dirty.score = "x";
    const safe = normalizeRunResult(dirty as unknown as PoemRunResult);
    assert.equal(safe.chancesLeft, 3);
    assert.equal(safe.maxCombo, 0);
    assert.equal(safe.score, 0);
  });
});

describe("normalizeLevelStars / normalizeInventory", () => {
  it("非法整体回空，合法条目保留", () => {
    assert.deepEqual(normalizeLevelStars(null), {});
    assert.deepEqual(normalizeLevelStars({ "3": 3 }), { "3": 3 });
    assert.deepEqual(normalizeInventory(null), { reveal: 0, redo: 0, double: 0 });
  });
});

describe("starsForRun（诗印评级）", () => {
  it("失败 0 印", () => {
    assert.equal(starsForRun(run({ won: false })), 0);
  });

  it("满灯笼且零失误 3 印", () => {
    assert.equal(starsForRun(run({ chancesLeft: 3, mistakes: 0 })), 3);
  });

  it("护卷挡下：灯笼满但有过错，2 印", () => {
    assert.equal(starsForRun(run({ chancesLeft: 3, mistakes: 1 })), 2);
  });

  it("剩 1 盏灯笼且连击不足 3 → 1 印；连击达 3 → 2 印", () => {
    assert.equal(starsForRun(run({ chancesLeft: 1, maxCombo: 2, mistakes: 2 })), 1);
    assert.equal(starsForRun(run({ chancesLeft: 1, maxCombo: 3, mistakes: 2 })), 2);
  });

  it("越界输入安全钳制", () => {
    assert.equal(starsForRun(run({ chancesLeft: -3, chancesTotal: 2, mistakes: -1 })), 1);
  });
});

describe("scoreForAnswer", () => {
  it("基础 100 分，连击加成每层 +25，封顶 +100，连携 +100", () => {
    assert.equal(scoreForAnswer({ combo: 1 }), 100);
    assert.equal(scoreForAnswer({ combo: 3 }), 150);
    assert.equal(scoreForAnswer({ combo: 5 }), 200);
    assert.equal(scoreForAnswer({ combo: 9 }), 200);
    assert.equal(scoreForAnswer({ combo: 1, linked: true }), 200);
  });
});

describe("mergePoemRecord / applyPoemRun", () => {
  it("历史最佳只升不降，attempts 累加", () => {
    const prev: PoemRecord = { bestStars: 2, bestScore: 300, bestCombo: 4, attempts: 1 };
    const merged = mergePoemRecord(prev, run({ maxCombo: 2, score: 500, mistakes: 1, chancesLeft: 2 }));
    assert.deepEqual(merged, { bestStars: 2, bestScore: 500, bestCombo: 4, attempts: 2 });
    assert.equal(mergePoemRecord(undefined, run()).attempts, 1);
    // 更差的一局不会拉低历史最佳
    const worse = mergePoemRecord(merged, run({ maxCombo: 1, score: 100, mistakes: 2, chancesLeft: 1 }));
    assert.deepEqual(worse, { bestStars: 2, bestScore: 500, bestCombo: 4, attempts: 3 });
  });

  it("applyPoemRun 合并记录并累加总分，不动通关与成就", () => {
    const save = baseSave({ clearedPoems: ["9"], achievements: ["a"], totalScore: 50 });
    const next = applyPoemRun(save, run({ poemId: "1", score: 200 }));
    assert.deepEqual(next.clearedPoems, ["9"]);
    assert.deepEqual(next.achievements, ["a"]);
    assert.equal(next.totalScore, 250);
    assert.equal(next.poemRecords["1"]?.attempts, 1);
  });

  it("非法 poemId 原样返回规范化底稿", () => {
    const save = baseSave({ totalScore: 7 });
    const next = applyPoemRun(save, run({ poemId: "", score: 999 }));
    assert.equal(next.totalScore, 7);
  });
});

describe("applyEndlessRun", () => {
  it("连对与得分分别取最高", () => {
    const save = baseSave({ endlessBestStreak: 5, endlessBestScore: 800 });
    const next = applyEndlessRun(save, 300, 12);
    assert.equal(next.endlessBestStreak, 12);
    assert.equal(next.endlessBestScore, 800);
    const next2 = applyEndlessRun(next, 1200, 3);
    assert.equal(next2.endlessBestStreak, 12);
    assert.equal(next2.endlessBestScore, 1200);
  });
});

describe("totalStars", () => {
  it("全部诗卡诗印求和", () => {
    const save = baseSave({
      poemRecords: {
        "1": { bestStars: 3, bestScore: 0, bestCombo: 0, attempts: 1 },
        "2": { bestStars: 1, bestScore: 0, bestCombo: 0, attempts: 1 },
      },
    });
    assert.equal(totalStars(save), 4);
  });
});

describe("poemContextFor", () => {
  it("答案在句首取答案句与下一句", () => {
    assert.deepEqual(poemContextFor(testPoem, question("床前")), ["床前", "明月光"]);
  });

  it("答案在中部取前一句与答案句", () => {
    assert.deepEqual(poemContextFor(testPoem, question("明月光")), ["床前", "明月光"]);
  });

  it("答案在句尾取上一句与答案句", () => {
    assert.deepEqual(poemContextFor(testPoem, question("地上霜")), ["疑是", "地上霜"]);
  });

  it("答案不在正文时回退前两句", () => {
    assert.deepEqual(poemContextFor(testPoem, question("不存在的句子")), ["床前", "明月光"]);
  });
});
