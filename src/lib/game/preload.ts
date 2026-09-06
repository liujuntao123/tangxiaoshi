const seen = new Set<string>();

export const CORE_IMAGES = [
  "/ui/speech-panel.png",
  "/ui/choice-slip.png",
  "/ui/choice-miss.png",
  "/ui/check-on.png",
  "/ui/btn-settings.png",
  "/ui/back-btn.png",
  "/ui/lantern.png",
  "/ui/jade-btn.png",
  "/ui/hp-on.png",
  "/ui/hp-off.png",
  "/ui/icon-story.png",
  "/ui/icon-practice.png",
  "/ui/icon-achieve.png",
  "/ui/icon-endless.png",
  "/sprites/hero.png",
  "/sprites/hero-happy.png",
  "/sprites/hero-sad.png",
  "/art/bg/home.png",
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
