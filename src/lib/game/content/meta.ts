/** Art catalogs the compiler and runtime share. Future modes can add beasts/scenes here. */

export const BEAST_IDS = ["sleep", "falls", "wind", "crane", "boat", "demon"] as const;
export type BeastId = (typeof BEAST_IDS)[number];

export const SCENE_IDS = ["moon", "water", "spring", "tower", "river", "palace", "mountain", "winter"] as const;
export type SceneId = (typeof SCENE_IDS)[number];

export const SCENE_ART: Record<SceneId, string> = {
  moon: "/art/scene-moon.jpg",
  water: "/art/scene-falls.jpg",
  spring: "/art/scene-peach.jpg",
  tower: "/art/scene-tower.jpg",
  river: "/art/scene-baidi.jpg",
  palace: "/art/scene-palace.jpg",
  mountain: "/art/scene-falls.jpg",
  winter: "/art/scene-moon.jpg",
};

export function poetPortrait(poetId: string): string {
  return `/sprites/poets/${poetId}.png`;
}

export function poetBustPath(poetId: string): string {
  if (poetId === "libai") return "/sprites/libai-bust.png";
  return `/sprites/poets/${poetId}.png`;
}
