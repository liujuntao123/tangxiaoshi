import type { AchievementDef, Chapter, DialogueLine, Dynasty, Level, Poem, Question } from "../types";
import bankJson from "./bank.json";
import { poetBustPath, poetPortrait } from "./meta";
import storyJson from "./story.json";

type RawQuestion = {
  id: string;
  type: Question["type"];
  prompt: string;
  choices: string[];
  answerIndex: number;
};

type RawPoem = Omit<Poem, "questions"> & { questions: RawQuestion[] };

const rawPoems = bankJson as RawPoem[];
const story = storyJson as {
  world: { title: string; logline: string; hero: string; villain: string; rules: string[] };
  prologue: DialogueLine[];
  dynasties: Dynasty[];
  chapters: Chapter[];
  legacyLevelIds: Record<string, string>;
};

function asQuestion(raw: RawQuestion): Question | null {
  if (raw.choices.length !== 4) return null;
  const answerIndex = raw.answerIndex;
  if (answerIndex < 0 || answerIndex > 3) return null;
  return {
    id: raw.id,
    type: raw.type,
    prompt: raw.prompt,
    choices: raw.choices as Question["choices"],
    answerIndex: answerIndex as 0 | 1 | 2 | 3,
  };
}

export const POEMS: Poem[] = rawPoems
  .map((poem) => ({
    ...poem,
    questions: poem.questions.map(asQuestion).filter((q): q is Question => q !== null),
  }))
  .filter((poem) => poem.questions.length >= 3);

export const WORLD = story.world;
export const PROLOGUE: DialogueLine[] = story.prologue ?? [];
export const DYNASTIES: Dynasty[] = story.dynasties.map((dynasty) => ({
  ...dynasty,
  opening: dynasty.opening ?? [],
}));
export const CHAPTERS: Chapter[] = story.chapters.map((chapter) => ({
  ...chapter,
  hook: chapter.hook ?? "",
  era: chapter.era ?? "",
  tags: chapter.tags ?? [],
  opening: chapter.opening ?? [],
}));
export const LEVELS: Level[] = CHAPTERS.flatMap((chapter) => chapter.levels);
export const LEGACY_LEVEL_IDS = story.legacyLevelIds;

const poemByIdMap = new Map(POEMS.map((poem) => [poem.id, poem]));
const levelByIdMap = new Map(LEVELS.map((level) => [level.id, level]));
const chapterByIdMap = new Map(CHAPTERS.map((chapter) => [chapter.id, chapter]));
const dynastyByIdMap = new Map(DYNASTIES.map((dynasty) => [dynasty.id, dynasty]));

export function poemById(id: string): Poem {
  const poem = poemByIdMap.get(id);
  if (!poem) throw new Error(`missing poem ${id}`);
  return poem;
}

export function levelById(id: string): Level {
  const mapped = LEGACY_LEVEL_IDS[id] ?? id;
  const level = levelByIdMap.get(mapped);
  if (!level) throw new Error(`missing level ${id}`);
  return level;
}

export function chapterById(id: string): Chapter {
  const chapter = chapterByIdMap.get(id);
  if (!chapter) throw new Error(`missing chapter ${id}`);
  return chapter;
}

export function dynastyById(id: string): Dynasty {
  const dynasty = dynastyByIdMap.get(id);
  if (!dynasty) throw new Error(`missing dynasty ${id}`);
  return dynasty;
}

export function chapterOfLevel(level: Level): Chapter {
  return chapterById(level.chapterId);
}

export function chaptersIn(dynastyId: string): Chapter[] {
  return CHAPTERS.filter((chapter) => chapter.dynastyId === dynastyId);
}

export function poemsByPoet(poetId: string): Poem[] {
  return POEMS.filter((poem) => poem.poetId === poetId);
}

export function poetsInDynasty(dynastyId: string): { poetId: string; poetName: string }[] {
  const seen = new Map<string, string>();
  for (const poem of POEMS) {
    if (poem.dynastyId === dynastyId && !seen.has(poem.poetId)) {
      seen.set(poem.poetId, poem.poetName);
    }
  }
  return [...seen.entries()].map(([poetId, poetName]) => ({ poetId, poetName }));
}

export function poetArt(poetId: string): string {
  return poetPortrait(poetId);
}

export function poetBust(poetId: string): string {
  return poetBustPath(poetId);
}

export const ACHIEVEMENTS: AchievementDef[] = [
  ...CHAPTERS.map((chapter) => ({
    id: `poet-${chapter.poetId}`,
    title: `${chapter.poetName}回来了`,
    hint: `在${chapter.title}救出${chapter.poetName}`,
    art: poetArt(chapter.poetId),
    kind: "poet" as const,
  })),
  ...DYNASTIES.map((dynasty) => ({
    id: `dynasty-${dynasty.id}`,
    title: `${dynasty.name}通关`,
    hint: `救出${dynasty.name}所有诗人`,
    art: dynasty.mapArt,
    kind: "dynasty" as const,
  })),
  {
    id: "no-damage",
    title: "滴水不漏",
    hint: "有一关三血打满，一题都不错",
    art: "/ui/hp-on.png",
    kind: "challenge",
  },
  {
    id: "ten-streak",
    title: "十连击",
    hint: "无尽模式连对十题",
    art: "/sprites/fx/bolt.png",
    kind: "challenge",
  },
];

export function shuffleQuestions(poem: Poem): Question[] {
  const copy = [...poem.questions];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = copy[i];
    const b = copy[j];
    if (a === undefined || b === undefined) continue;
    copy[i] = b;
    copy[j] = a;
  }
  return copy;
}

export function questionsFromPoems(ids: string[]): Question[] {
  const pool = POEMS.filter((poem) => ids.includes(poem.id)).flatMap((poem) => poem.questions);
  return shuffleQuestions({ ...POEMS[0]!, questions: pool });
}
