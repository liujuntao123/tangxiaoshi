import type {
  AchievementDef,
  Author,
  Chapter,
  Collection,
  DialogueLine,
  Dynasty,
  Poem,
  Question,
} from "../types";
import { PASS_RATE, QUESTIONS_PER_POEM, type PlayerSave } from "../types";
import bankJson from "./bank.json";

type RawQuestion = Omit<Question, "choices" | "answerIndex"> & {
  choices: string[];
  answerIndex: number;
};

type RawPoem = Omit<Poem, "questions" | "difficulty"> & {
  difficulty?: number;
  questions: RawQuestion[];
};

type Bank = {
  version: number;
  collections: Collection[];
  chapters: Chapter[];
  authors: Author[];
  poems: RawPoem[];
  dynasties: Dynasty[];
  achievements: AchievementDef[];
};

function asQuestion(raw: RawQuestion): Question | null {
  if (raw.choices.length !== 4) return null;
  if (raw.answerIndex < 0 || raw.answerIndex > 3) return null;
  return {
    ...raw,
    quote: raw.quote ?? "",
    choices: raw.choices as Question["choices"],
    answerIndex: raw.answerIndex as 0 | 1 | 2 | 3,
  };
}

const bank = bankJson as Bank;

export const COLLECTIONS: Collection[] = bank.collections;
export const PLAYABLE_COLLECTIONS: Collection[] = COLLECTIONS.filter((item) => item.playable);
export const CHAPTERS: Chapter[] = bank.chapters;
export const AUTHORS: Author[] = bank.authors;
export const DYNASTIES: Dynasty[] = bank.dynasties;
export const ACHIEVEMENTS: AchievementDef[] = bank.achievements;

export const POEMS: Poem[] = bank.poems
  .map((poem) => ({
    ...poem,
    // 学段难度缺失/越界时回落中档（正常编译产物必有该字段，这里只做运行时兜底）
    difficulty:
      typeof poem.difficulty === "number" && poem.difficulty >= 1 && poem.difficulty <= 5
        ? poem.difficulty
        : 3,
    questions: poem.questions
      .map(asQuestion)
      .filter((q): q is Question => q !== null)
      .slice(0, QUESTIONS_PER_POEM),
  }))
  .filter((poem) => poem.questions.length === QUESTIONS_PER_POEM);

const collectionByIdMap = new Map(COLLECTIONS.map((item) => [item.id, item]));
const chapterByIdMap = new Map(CHAPTERS.map((item) => [item.id, item]));
const authorByIdMap = new Map(AUTHORS.map((item) => [item.id, item]));
const poemByIdMap = new Map(POEMS.map((item) => [item.id, item]));
const dynastyByIdMap = new Map(DYNASTIES.map((item) => [item.id, item]));

export function collectionById(id: string): Collection {
  const found = collectionByIdMap.get(id);
  if (!found) throw new Error(`missing collection ${id}`);
  return found;
}

export function chapterById(id: string): Chapter {
  const found = chapterByIdMap.get(id);
  if (!found) throw new Error(`missing chapter ${id}`);
  return found;
}

export function authorById(id: string): Author {
  const found = authorByIdMap.get(id);
  if (!found) throw new Error(`missing author ${id}`);
  return found;
}

export function poemById(id: string): Poem {
  const found = poemByIdMap.get(id);
  if (!found) throw new Error(`missing poem ${id}`);
  return found;
}

export function dynastyById(id: string): Dynasty {
  const found = dynastyByIdMap.get(id);
  if (!found) throw new Error(`missing dynasty ${id}`);
  return found;
}

/** 路由边界的容错查找：旧书签/旧 PWA 深链可能带着已下线的 id（如旧关卡 id）。 */
export function findCollection(id: string): Collection | null {
  return collectionByIdMap.get(id) ?? null;
}

export function findChapter(id: string): Chapter | null {
  return chapterByIdMap.get(id) ?? null;
}

export function findAuthor(id: string): Author | null {
  return authorByIdMap.get(id) ?? null;
}

export function findPoem(id: string): Poem | null {
  return poemByIdMap.get(id) ?? null;
}

export function chaptersIn(collectionId: string): Chapter[] {
  return CHAPTERS.filter((chapter) => chapter.collectionId === collectionId);
}

export function authorsInChapter(chapterId: string): Author[] {
  const chapter = chapterById(chapterId);
  return chapter.authorIds
    .map((authorId) => authorByIdMap.get(authorId))
    .filter((author): author is Author => Boolean(author));
}

export function poemsByAuthor(authorId: string): Poem[] {
  return POEMS.filter((poem) => poem.authorId === authorId);
}

export function poemsInChapter(chapterId: string): Poem[] {
  const chapter = chapterById(chapterId);
  return POEMS.filter(
    (poem) => poem.collectionId === chapter.collectionId && poem.chapterIndex === chapter.index,
  );
}

export function poemsInCollection(collectionId: string): Poem[] {
  return POEMS.filter((poem) => poem.collectionId === collectionId);
}

/** 练习三轴筛选的作者候选（含朝代信息） */
export function authorOptions(): { id: string; name: string; dynastyIds: string[] }[] {
  return AUTHORS.map((author) => ({
    id: author.id,
    name: author.name,
    dynastyIds: [
      ...new Set(
        poemsByAuthor(author.id).map((poem) => poem.dynastyId),
      ),
    ],
  }));
}

/** 无尽题池：已编译全部诗的全部题 */
export function allQuestions(): { question: Question; poem: Poem }[] {
  return POEMS.flatMap((poem) => poem.questions.map((question) => ({ question, poem })));
}

/** 及格线：答对 60% 即通过。 */
export function passMark(questionCount: number): number {
  return Math.ceil(questionCount * PASS_RATE);
}

/** 机会灯笼数：题数 - 及格线 + 1。 */
export function chancesFor(questionCount: number): number {
  return Math.max(2, questionCount - passMark(questionCount) + 1);
}

/** 答题时打乱题目顺序（每轮不同）。 */
export function shuffleQuestions(questions: Question[]): Question[] {
  const copy = [...questions];
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

export type AchievementProgress = { have: number; total: number; done: boolean };

/** 成就进度：全通制（作者=其全部诗卡；文集=文集全部诗卡；朝代=该朝已上线全部诗卡）。 */
export function achievementProgress(def: AchievementDef, save: PlayerSave): AchievementProgress {
  let total = 0;
  if (def.kind === "author") {
    total = poemsByAuthor(def.id.slice("author-".length)).length;
  } else if (def.kind === "collection") {
    total = poemsInCollection(def.id.slice("collection-".length)).length;
  } else {
    const dynastyId = def.id.slice("dynasty-".length);
    total = POEMS.filter((poem) => poem.dynastyId === dynastyId).length;
  }
  const pool =
    def.kind === "author"
      ? poemsByAuthor(def.id.slice("author-".length)).map((poem) => poem.id)
      : def.kind === "collection"
        ? poemsInCollection(def.id.slice("collection-".length)).map((poem) => poem.id)
        : POEMS.filter((poem) => poem.dynastyId === def.id.slice("dynasty-".length)).map(
            (poem) => poem.id,
          );
  const have = pool.filter((id) => save.clearedPoems.includes(id)).length;
  return { have, total, done: total > 0 && have >= total };
}

export type { DialogueLine };
