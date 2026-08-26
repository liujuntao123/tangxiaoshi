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

export type PlayerSave = {
  clearedLevels: string[];
  keysOwned: number;
  achievements: string[];
  endlessBestStreak: number;
  endlessBestScore: number;
};

export const EMPTY_SAVE: PlayerSave = {
  clearedLevels: [],
  keysOwned: 0,
  achievements: [],
  endlessBestStreak: 0,
  endlessBestScore: 0,
};
