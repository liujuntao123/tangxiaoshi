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
};

export type DialogueLine = {
  speaker: "tang" | "other" | "narrator";
  name: string;
  text: string;
};

export type Level = {
  id: string;
  order: number;
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
};

export type AchievementDef = {
  id: string;
  title: string;
  hint: string;
  art: string;
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
