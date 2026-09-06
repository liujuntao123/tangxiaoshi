/**
 * 状态矩阵复现：各种远征 localStorage 状态下，首页主按钮的表现。
 * 用法：node scripts/ui-review/repro-matrix.mjs [base]
 */
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://127.0.0.1:8123";
const EMAIL = `repro-matrix-${Date.now()}@test.local`;
const PASSWORD = "shijing-2026-review";

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  locale: "zh-CN",
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push("[pageerror] " + e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push("[console] " + m.text().slice(0, 200));
});

// 注册
await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
await page.locator('button:has-text("去注册")').click();
await page.locator('input[type="email"]').first().fill(EMAIL);
await page.locator('input[type="password"]').nth(0).fill(PASSWORD);
await page.locator('input[type="password"]').nth(1).fill(PASSWORD);
await page.locator('button[aria-label="注册"]').click();
await page.waitForURL(`${BASE}/`, { timeout: 15000 });
await page.waitForTimeout(800);

// 取一个真实存在的 poemId：走 /tour 开局 → 选第一条墨路，从落地 URL 里拿
await page.goto(`${BASE}/tour`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1200);
await page.locator('button:has-text("点亮第一盏诗火")').click();
await page.waitForTimeout(800);
await page.locator("button").filter({ hasText: /青灯小径|风雨险滩|无名残卷/ }).first().click();
await page.waitForURL("**/play/**", { timeout: 15000 });
const realPoemId = new URL(page.url()).pathname.split("/").pop();
console.log("realPoemId =", realPoemId);

const now = Date.now();
const STATES = {
  "A-无远征": null,
  "B-已点亮未择路": {
    nodeIndex: 0, fire: 3, relic: "none", offerSeed: 1,
    nodes: [null, null, null], finished: null, updatedAt: now,
  },
  "C-第1页已择路": {
    nodeIndex: 0, fire: 3, relic: "none", offerSeed: 1,
    nodes: [{ path: "safe", poemId: String(realPoemId), status: "pending", relic: "none", mistakes: 0, score: 0 }, null, null],
    finished: null, updatedAt: now,
  },
  "D-第1页完成未择第2页": {
    nodeIndex: 1, fire: 3, relic: "none", offerSeed: 2,
    nodes: [{ path: "safe", poemId: String(realPoemId), status: "done", relic: "none", mistakes: 0, score: 120 }, null, null],
    finished: null, updatedAt: now,
  },
  "E-已收官": {
    nodeIndex: 2, fire: 3, relic: "none", offerSeed: 3,
    nodes: [
      { path: "safe", poemId: String(realPoemId), status: "done", relic: "none", mistakes: 0, score: 120 },
      { path: "risk", poemId: String(realPoemId), status: "done", relic: "none", mistakes: 1, score: 90 },
      { path: "mystery", poemId: String(realPoemId), status: "done", relic: "none", mistakes: 0, score: 100 },
    ],
    finished: "clear", updatedAt: now,
  },
  "F-陈旧诗卡ID": {
    nodeIndex: 0, fire: 3, relic: "none", offerSeed: 4,
    nodes: [{ path: "safe", poemId: "xianqin-caishiguan-1", status: "pending", relic: "none", mistakes: 0, score: 0 }, null, null],
    finished: null, updatedAt: now,
  },
};

for (const [name, state] of Object.entries(STATES)) {
  errors.length = 0;
  await page.evaluate((v) => {
    if (v === null) window.localStorage.removeItem("tangxiaoshi.expedition.v1");
    else window.localStorage.setItem("tangxiaoshi.expedition.v1", JSON.stringify(v));
  }, state);
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1600);
  const mainLink = page.locator('a.tap').filter({ hasText: /继续远征|去择墨路|点亮第一盏诗火|再启远征/ }).first();
  const href = await mainLink.getAttribute("href").catch(() => null);
  const label = (await mainLink.innerText().catch(() => null))?.trim();
  const caption = await page.locator("p.paper-glow.text-center").last().innerText().catch(() => null);
  await mainLink.click({ timeout: 5000 }).catch((e) => errors.push("click failed: " + e.message.split("\n")[0]));
  await page.waitForTimeout(1600);
  const after = new URL(page.url());
  const bodyHead = (await page.locator("body").innerText().catch(() => "")).replace(/\s+/g, " ").slice(0, 80);
  console.log(
    `\n== ${name}\n   按钮: ${label} → href: ${href}\n   提示: ${caption}\n   点击后: ${after.pathname}${after.search}\n   画面: ${bodyHead}`,
  );
  if (errors.length) console.log("   错误:", errors.slice(0, 3).join(" | "));
}

await browser.close();
console.log("\nDONE");
