import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ENDLESS_BOARD_SIZE,
  ENDLESS_NAME_FALLBACK,
  normalizeEndlessBoard,
} from "./leaderboard.ts";

describe("normalizeEndlessBoard", () => {
  it("完整数据透传，名次按榜单指标算并列（1,2,2,4）", () => {
    const board = normalizeEndlessBoard({
      streakBoard: [
        { name: "小满", bestScore: 900, bestStreak: 12, isSelf: false },
        { name: "阿唐", bestScore: 900, bestStreak: 12, isSelf: true },
        { name: "石头", bestScore: 300, bestStreak: 9, isSelf: false },
      ],
      scoreBoard: [
        { name: "小满", bestScore: 900, bestStreak: 12, isSelf: false },
        { name: "阿唐", bestScore: 900, bestStreak: 12, isSelf: true },
        { name: "石头", bestScore: 300, bestStreak: 9, isSelf: false },
      ],
      playerCount: 7,
      myStreakRank: 1,
      myScoreRank: 1,
    });
    // 连对榜：12、12 并列第 1，9 是第 3（竞赛排名，无第 2）
    assert.deepEqual(
      board.streakBoard.map((e) => e.rank),
      [1, 1, 3],
    );
    // 得分榜同样并列：900、900 第 1，300 第 3
    assert.deepEqual(
      board.scoreBoard.map((e) => e.rank),
      [1, 1, 3],
    );
    assert.equal(board.playerCount, 7);
    assert.equal(board.myStreakRank, 1);
    assert.equal(board.myScoreRank, 1);
    assert.equal(board.streakBoard[1]?.isSelf, true);
  });

  it("两榜指标不同导致名次不同（主指标优先）", () => {
    const row = (name: string, bestScore: number, bestStreak: number) => ({
      name,
      bestScore,
      bestStreak,
      isSelf: false,
    });
    const board = normalizeEndlessBoard({
      streakBoard: [row("甲", 500, 8), row("乙", 900, 6)],
      scoreBoard: [row("甲", 500, 8), row("乙", 900, 6)],
    });
    // 连对榜：8 > 6，甲第一
    assert.deepEqual(
      board.streakBoard.map((e) => e.name),
      ["甲", "乙"],
    );
    // 得分榜名次依赖服务端排序；此处只验证名次序号照列表顺序重算
    assert.deepEqual(
      board.scoreBoard.map((e) => e.rank),
      [1, 2],
    );
  });

  it("脏数据逐项回退：缺名兜底、数值钳制、非法行丢弃", () => {
    const board = normalizeEndlessBoard({
      streakBoard: [
        { name: "  ", bestScore: -5, bestStreak: Number.NaN, isSelf: 1 },
        null,
        { name: 42, bestScore: "x", bestStreak: 3.9 },
        { name: "名字超长超过十二个字符会被截断处理", bestScore: 10, bestStreak: 1 },
      ],
      scoreBoard: "junk",
      playerCount: -3,
      myStreakRank: 0,
      myScoreRank: "x",
    });
    assert.equal(board.streakBoard.length, 3);
    assert.equal(board.streakBoard[0]?.name, ENDLESS_NAME_FALLBACK);
    assert.equal(board.streakBoard[0]?.bestScore, 0);
    assert.equal(board.streakBoard[0]?.bestStreak, 0);
    assert.equal(board.streakBoard[0]?.isSelf, false); // 只有 === true 才算自己
    assert.equal(board.streakBoard[1]?.name, ENDLESS_NAME_FALLBACK); // 非字符串名字兜底
    assert.equal(board.streakBoard[1]?.bestStreak, 3); // 小数截断为整数
    assert.equal(board.streakBoard[2]?.name, "名字超长超过十二个字符会"); // 截断到 12 字
    assert.deepEqual(board.scoreBoard, []);
    assert.equal(board.playerCount, 0);
    assert.equal(board.myStreakRank, null);
    assert.equal(board.myScoreRank, null);
  });

  it(`榜单截断到前 ${ENDLESS_BOARD_SIZE} 名`, () => {
    const rows = Array.from({ length: 30 }, (_, i) => ({
      name: `p${i}`,
      bestScore: 1000 - i,
      bestStreak: 30 - i,
      isSelf: false,
    }));
    const board = normalizeEndlessBoard({ streakBoard: rows, scoreBoard: rows });
    assert.equal(board.streakBoard.length, ENDLESS_BOARD_SIZE);
    assert.equal(board.scoreBoard.length, ENDLESS_BOARD_SIZE);
    assert.equal(board.streakBoard[0]?.rank, 1);
    assert.equal(board.streakBoard[19]?.rank, 20);
  });

  it("整体非法或缺失回退空榜单", () => {
    for (const bad of [null, "x", 42, [], {}]) {
      const board = normalizeEndlessBoard(bad);
      assert.deepEqual(board.streakBoard, []);
      assert.deepEqual(board.scoreBoard, []);
      assert.equal(board.playerCount, 0);
      assert.equal(board.myStreakRank, null);
      assert.equal(board.myScoreRank, null);
    }
  });
});
