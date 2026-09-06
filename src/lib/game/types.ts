// 内容契约 v2 —— 编译器（scripts/content/build-bank.py）与前端共同遵守。
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

export type PlayerSave = {
  clearedPoems: string[];
  achievements: string[];
  endlessBestStreak: number;
  endlessBestScore: number;
  /** 已遇过引导语的作者 */
  metAuthors: string[];
};

export const EMPTY_SAVE: PlayerSave = {
  clearedPoems: [],
  achievements: [],
  endlessBestStreak: 0,
  endlessBestScore: 0,
  metAuthors: [],
};

/** 每诗卡题数与配比：3 整句补全（2 next + 1 prev）+ 2 诗名 */
export const QUESTIONS_PER_POEM = 5;
/** 及格线 60% */
export const PASS_RATE = 0.6;
