import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  applyEndlessRun,
  applyPoemRun,
  mergePoemRecord,
  normalizePoemRecord,
  normalizeRunResult,
  normalizeSave,
  pickContinueTarget,
  poemContextFor,
  scoreForAnswer,
  starsForRun,
  TALISMANS,
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
    talisman: null,
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
  it("旧存档（v2 五字段，缺成绩字段）补默认值", () => {
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
    });
    assert.deepEqual(save.clearedPoems, ["1"]);
    assert.deepEqual(save.achievements, ["a"]);
    assert.equal(save.endlessBestStreak, 0);
    assert.equal(save.endlessBestScore, 0);
    assert.deepEqual(save.metAuthors, []);
    assert.equal(save.totalScore, 0); // 非数字（含数字字符串）不做强转，回退 0
    assert.deepEqual(save.poemRecords["1"], { bestStars: 3, bestScore: 0, bestCombo: 0, attempts: 2 });
    assert.equal(save.poemRecords.bad, undefined);
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

  it("run 结果：chancesLeft 钳到 [0, chancesTotal]，诗签白名单外回退 null", () => {
    const dirty = run({ chancesLeft: 99, maxCombo: -4 }) as unknown as Record<string, unknown>;
    dirty.score = "x";
    dirty.talisman = "hax";
    const safe = normalizeRunResult(dirty as unknown as PoemRunResult);
    assert.equal(safe.chancesLeft, 3);
    assert.equal(safe.maxCombo, 0);
    assert.equal(safe.score, 0);
    assert.equal(safe.talisman, null);
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

describe("pickContinueTarget", () => {
  const nodes = [
    { id: "a", unlocked: true, cleared: true },
    { id: "b", unlocked: true, cleared: true },
    { id: "c", unlocked: true, cleared: false },
    { id: "d", unlocked: true, cleared: false },
  ];

  it("最早未通关的目标", () => {
    assert.deepEqual(pickContinueTarget(nodes), { poemId: "c", replay: false });
  });

  it("全部通关时定位最后一张（再战提分）", () => {
    const all = nodes.map((n) => ({ ...n, cleared: true }));
    assert.deepEqual(pickContinueTarget(all), { poemId: "d", replay: true });
  });

  it("空列表返回 null", () => {
    assert.equal(pickContinueTarget([]), null);
  });

  it("全部未通关时定位第一张", () => {
    const none = nodes.map((n) => ({ ...n, cleared: false }));
    assert.deepEqual(pickContinueTarget(none), { poemId: "a", replay: false });
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

describe("TALISMANS", () => {
  it("三枚诗签均一次性且 id 唯一", () => {
    assert.equal(TALISMANS.length, 3);
    assert.deepEqual(
      TALISMANS.map((t) => t.id),
      ["clarity", "ward", "echo"],
    );
    for (const t of TALISMANS) {
      assert.equal(t.uses, 1);
      assert.ok(t.symbol.length >= 1);
      assert.ok(t.description.length >= 4);
    }
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
