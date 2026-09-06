/** 素材目录：编译器与运行时共享的路径约定（docs/art.md）。 */

/** 全局背景：首页 + 各主页面 + 资料库三层 */
export const GAME_BACKGROUNDS = {
  home: "/art/bg/home.png",
  levels: "/art/bg/tour-collections.png",
  tourChapters: "/art/bg/tour-chapters.png",
  tourAuthor: "/art/bg/tour-author.png",
  endless: "/art/bg/endless.png",
  practice: "/art/bg/practice.png",
  achievements: "/art/bg/achievements.png",
} as const;

export type GameBackgroundKey = keyof typeof GAME_BACKGROUNDS;

/** 通用章节形象：一套 10 张，第 N 章取 ((N-1) mod 10)+1 */
export const CHAPTER_ART_COUNT = 10;

export function chapterArt(chapterIndex: number): string {
  const n = (((chapterIndex - 1) % CHAPTER_ART_COUNT) + CHAPTER_ART_COUNT) % CHAPTER_ART_COUNT + 1;
  return `/art/avatars/chapter-${n}.png`;
}

export function collectionArt(collectionId: string): string {
  return `/art/avatars/collection-${collectionId}.png`;
}

export function dynastyArt(dynastyId: string): string {
  return `/art/avatars/dynasty-${dynastyId}.png`;
}

/** 作者立绘：一人一张，全页面复用 */
export function poetPortrait(authorId: string): string {
  return `/sprites/poets/${authorId}.png`;
}

/** 主角唐小诗三形态（透明背景） */
export const HERO = {
  idle: "/sprites/hero.png",
  happy: "/sprites/hero-happy.png",
  sad: "/sprites/hero-sad.png",
} as const;
