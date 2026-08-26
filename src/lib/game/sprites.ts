export const HERO_IDLE = ["/sprites/hero.png"];
export const HERO_ATTACK = ["/sprites/hero-attack.png", "/sprites/hero-attack-2.png"];
export const HERO_HURT = ["/sprites/hero-hurt.png", "/sprites/hero-hurt-2.png"];

export const HERO_WALK = {
  down: ["/sprites/hero.png"],
  left: ["/sprites/hero.png"],
  right: ["/sprites/hero.png"],
  up: ["/sprites/hero.png"],
} as const;

export type WalkDir = keyof typeof HERO_WALK;

export const FX_BOLT = ["/sprites/fx/bolt.png"];
export const FX_IMPACT = ["/sprites/fx/impact.png"];

export function bustOf(art: string): string {
  return art.replace(/\.png$/, "-bust.png");
}

export function walkDir(from: { x: number; y: number }, to: { x: number; y: number }): WalkDir {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) > Math.abs(dy)) return dx >= 0 ? "right" : "left";
  return dy >= 0 ? "down" : "up";
}

export function poseFrames(
  pose: "idle" | "attack" | "hurt",
  idle: readonly string[],
  attack: readonly string[],
  hurt: readonly string[],
): readonly string[] {
  if (pose === "attack") return attack;
  if (pose === "hurt") return hurt;
  return idle;
}
