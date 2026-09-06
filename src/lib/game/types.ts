export type QuestionType = "next-line" | "title" | "poet" | "meaning";

export type Question = {
  id: string;
  type: QuestionType;
  prompt: string;
  choices: [string, string, string, string];
  answerIndex: 0 | 1 | 2 | 3;
};

export type Poem = {
  id: string;
  poetId: string;
  poetName: string;
  title: string;
  lines: string[];
  questions: Question[];
  form?: string;
  source?: string;
  dynastyId?: string;
  theme?: string;
};

export type DialogueLine = {
  speaker: "tang" | "other" | "narrator";
  name: string;
  text: string;
};

export type Level = {
  id: string;
  order: number;
  chapterId: string;
  place: string;
  monsterName: string;
  monsterArt: string;
  monsterIdle: string[];
  monsterAttack: string[];
  monsterHurt: string[];
  sceneBg: string;
  poemId: string;
  intro: DialogueLine[];
  outro: DialogueLine[];
  map: { x: number; y: number };
  boss: boolean;
};

export type Chapter = {
  id: string;
  dynastyId: string;
  poetId: string;
  poetName: string;
  title: string;
  hook: string;
  era?: string;
  tags?: string[];
  opening: DialogueLine[];
  order: number;
  keysToBoss: number;
  art: string;
  mapStart: { x: number; y: number };
  levels: Level[];
};

export type Dynasty = {
  id: string;
  name: string;
  tagline: string;
  mapArt: string;
  scene: string;
  era?: string;
  opening: DialogueLine[];
};

export type AchievementDef = {
  id: string;
  title: string;
  hint: string;
  art: string;
  kind: "poet" | "dynasty" | "challenge";
};

/** 结算星级：0 未通关 / 失败，1-3 规则见 docs/game-design.md §7.1。 */
export type Stars = 0 | 1 | 2 | 3;

/** 单个关卡的历史最佳成绩；历史只保留最高值，不因重战降低。 */
export type LevelRecord = {
  bestStars: Stars;
  bestScore: number;
  bestCombo: number;
  attempts: number;
};

/** 诗签：每局开始三选一，只影响当前挑战（docs/game-design.md §5.3）。 */
export type TalismanId = "clarity" | "ward" | "echo";

export type TalismanDef = {
  id: TalismanId;
  name: string;
  /** 按钮上的单字符号，配合名称与说明，不依赖美术资源。 */
  symbol: string;
  description: string;
  /** 每局可用次数（当前三枚均为一次性）。 */
  uses: number;
};

/** 一局关卡战斗结束时的表现快照，由战斗组件在结算时构造。 */
export type LevelRunResult = {
  levelId: string;
  won: boolean;
  /** 结算时剩余血量（初始 3，见 LEVEL_START_HP）。 */
  hpLeft: number;
  /** 本局最高连击。 */
  maxCombo: number;
  /** 本局得分（scoreForAnswer 累加）。 */
  score: number;
  /** 答错次数，含被护卷挡下的那次（护卷挡下仍无法达成 3 星）。 */
  mistakes: number;
  /** 本局携带的诗签，未带/非法时为 null。 */
  talisman?: TalismanId | null;
};

/** 首页“继续历险”目标：replay 为 true 时表示全部通关后的“再战提分”。 */
export type ContinueTarget = {
  levelId: string;
  replay: boolean;
};

export type PlayerSave = {
  clearedLevels: string[];
  keysOwned: number;
  achievements: string[];
  endlessBestStreak: number;
  endlessBestScore: number;
  /** 关卡历史最佳；旧存档缺失按空对象处理（normalizeSave 兜底）。 */
  levelRecords: Record<string, LevelRecord>;
  /** 主线累计得分：每局结算分数累加，不随重战扣减。 */
  totalScore: number;
};

export const EMPTY_SAVE: PlayerSave = {
  clearedLevels: [],
  keysOwned: 0,
  achievements: [],
  endlessBestStreak: 0,
  endlessBestScore: 0,
  levelRecords: {},
  totalScore: 0,
};
