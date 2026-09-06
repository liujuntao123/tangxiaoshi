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

/** 诗签：每轮问答开始三选一，只影响当前这一轮（docs/game-design.md §5.3）。 */
export type TalismanId = "clarity" | "ward" | "echo";

export type TalismanDef = {
  id: TalismanId;
  name: string;
  /** 按钮上的单字符号，配合名称与说明，不依赖美术资源。 */
  symbol: string;
  description: string;
  /** 每轮可用次数（当前三枚均为一次性）。 */
  uses: number;
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
  /** 本轮携带的诗签，未带/非法时为 null。 */
  talisman?: TalismanId | null;
};

/** 首页「继续环游」目标：replay 为 true 时表示全部通关后的「再战提分」。 */
export type ContinueTarget = {
  poemId: string;
  replay: boolean;
};

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
};

export const EMPTY_SAVE: PlayerSave = {
  clearedPoems: [],
  achievements: [],
  endlessBestStreak: 0,
  endlessBestScore: 0,
  metAuthors: [],
  poemRecords: {},
  totalScore: 0,
};

/** 每诗卡题数与配比：3 整句补全（2 next + 1 prev）+ 2 诗名 */
export const QUESTIONS_PER_POEM = 5;
/** 及格线 60% */
export const PASS_RATE = 0.6;
