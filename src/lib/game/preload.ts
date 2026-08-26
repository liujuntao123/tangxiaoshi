const seen = new Set<string>();

export const CORE_IMAGES = [
  "/ui/speech-panel.png",
  "/ui/choice-slip.png",
  "/ui/choice-on.png",
  "/ui/choice-miss.png",
  "/ui/back-btn.png",
  "/ui/lantern.png",
  "/ui/jade-btn.png",
  "/ui/hp-on.png",
  "/ui/hp-off.png",
  "/ui/icon-story.png",
  "/ui/icon-practice.png",
  "/ui/icon-achieve.png",
  "/sprites/hero.png",
  "/sprites/hero-bust.png",
  "/sprites/hero-attack-2.png",
  "/sprites/hero-hurt-2.png",
  "/sprites/key.png",
  "/art/scene-moon.jpg",
  "/art/map.jpg",
];

export function preloadImages(urls: readonly string[]) {
  if (typeof window === "undefined") return;
  for (const url of urls) {
    if (!url || seen.has(url)) continue;
    seen.add(url);
    const img = new Image();
    img.decoding = "async";
    img.src = url;
  }
}
