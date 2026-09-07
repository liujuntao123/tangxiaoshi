// 内容契约 v4 —— 编译器（scripts/content/build-bank.py）与前端共同遵守。
// 层级：文集 → 章节 → 作者 → 诗卡（问答单位）。

export type QuestionType = "complete-next" | "complete-prev" | "title";

export type Question = {
  id: string;
  type: QuestionType;
  /** 题面口语，如「春花秋月何时了」的下一句是？ */
  prompt: string;
  /** 补全题单独展示的引用句（title 题为空） */
  quote: string;
  choices: [string, string, string, string];
  answerIndex: 0 | 1 | 2 | 3;
};

export type Poem = {
  /** poetry-site 全局唯一 id（数字字符串） */
  id: string;
  collectionId: string;
  /** 文集内章节序号，1 起 */
  chapterIndex: number;
  authorId: string;
  authorName: string;
  dynastyId: string;
  title: string;
  /** 正文半句序列（按标点切分，保序，不含标点） */
  lines: string[];
  /** 原文全文（练习/展示用，含标点） */
  text: string;
  /** 该诗卡固定背景（所属文集 5 张之一，按 id 稳定轮换） */
  background: string;
  /** 学段难度档 1-5（小学·低/中/高、初中、高中），编译期推导，规则见 docs/content-rules.md */
  difficulty: number;
  /** 学习常见度序（越小越常见）：0 教材篇目，1000 通识读本，2000 经典，3000 雅致（ADR-0020） */
  studyRank: number;
  questions: Question[];
};

export type Author = {
  id: string;
  name: string;
  portrait: string;
  collectionIds: string[];
  /** 可玩诗文数（已编译） */
  poemCount: number;
  /** 首遇引导语（对白形式，作者 speaking） */
  guide: DialogueLine[];
};

export type Chapter = {
  /** {collectionId}-c{index} */
  id: string;
  collectionId: string;
  index: number;
  /** 章节实名，如「南唐二主词李璟篇」 */
  title: string;
  art: string;
  authorIds: string[];
  poemCount: number;
};

export type Collection = {
  id: string;
  title: string;
  editor: string | null;
  dynasties: string[];
  /** 未编译内容的文集 = 锁定展示 */
  playable: boolean;
  art: string;
  /** 每文集 5 张专属背景（仅 playable） */
  backgrounds: string[];
  chapterIds: string[];
  poemCount: number;
};

export type Dynasty = {
  id: string;
  name: string;
  art: string;
};

export type AchievementKind = "collection" | "author" | "dynasty";

export type AchievementDef = {
  /** author-{id} / collection-{id} / dynasty-{id} */
  id: string;
  kind: AchievementKind;
  /** 直白主标 */
  title: string;
  /** 雅致副标 */
  subtitle: string;
  /** 达成条件说明（含数量） */
  hint: string;
  art: string;
};

export type DialogueLine = {
  speaker: "tang" | "other" | "narrator";
  name: string;
  text: string;
};

/**
 * 结算评级（诗印）：0 未通关 / 失败，1-3 规则见 docs/game-design.md §7.1。
 * 沿用玩法重做的三档评级口径，落到诗卡上（ADR-0015）。
 */
export type Stars = 0 | 1 | 2 | 3;

/** 单张诗卡的历史最佳成绩；历史只保留最高值，不因重玩降低。 */
export type PoemRecord = {
  bestStars: Stars;
  bestScore: number;
  bestCombo: number;
  attempts: number;
};

/** 一轮诗卡问答结束时的表现快照，由答题组件在结算时构造。 */
export type PoemRunResult = {
  poemId: string;
  won: boolean;
  /** 结算时剩余机会灯笼数。 */
  chancesLeft: number;
  /** 本轮灯笼总数（机会数随题数与及格线浮动，用于评级钳制）。 */
  chancesTotal: number;
  /** 本轮最高连击。 */
  maxCombo: number;
  /** 本轮得分（scoreForAnswer 累加）。 */
  score: number;
  /** 答错次数，含被护卷挡下的那次（护卷挡下仍无法达成 3 印）。 */
  mistakes: number;
};

/** 每诗卡题数与配比：3 整句补全（2 next + 1 prev）+ 2 诗名 */
export const QUESTIONS_PER_POEM = 5;
/** 及格线 60% */
export const PASS_RATE = 0.6;

/** 关卡道具：去伪（隐藏两个错项）/ 补答（错题换新题补位）/ 双倍（答对得分翻倍）。 */
export type ItemId = "reveal" | "redo" | "double";

export const ITEM_IDS: readonly ItemId[] = ["reveal", "redo", "double"];

export function isItemId(value: unknown): value is ItemId {
  return typeof value === "string" && (ITEM_IDS as readonly string[]).includes(value);
}

/** 道具库存：每种道具的持有数量。 */
export type Inventory = Record<ItemId, number>;

export const EMPTY_INVENTORY: Inventory = { reveal: 0, redo: 0, double: 0 };

export type PlayerSave = {
  clearedPoems: string[];
  achievements: string[];
  endlessBestStreak: number;
  endlessBestScore: number;
  /** 已遇过引导语的作者 */
  metAuthors: string[];
  /** 诗卡历史最佳；旧存档缺失按空对象处理（normalizeSave 兜底）。 */
  poemRecords: Record<string, PoemRecord>;
  /** 环游累计得分：每轮结算分数累加，不随重玩扣减。 */
  totalScore: number;
  /** 关卡历史最佳星级（key 为关卡序号字符串，1 起；0/缺失 = 未通关）。 */
  levelStars: Record<string, Stars>;
  /** 道具库存。 */
  items: Inventory;
};

export const EMPTY_SAVE: PlayerSave = {
  clearedPoems: [],
  achievements: [],
  endlessBestStreak: 0,
  endlessBestScore: 0,
  metAuthors: [],
  poemRecords: {},
  totalScore: 0,
  levelStars: {},
  items: { ...EMPTY_INVENTORY },
};
