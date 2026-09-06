/**
 * 入口拆分关键页截图（390x844 移动视口）。
 * 用法：node scripts/ui-review/shots-entries.mjs
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const BASE = "http://127.0.0.1:8123";
const OUT = "screenshots/entry-split";
mkdirSync(OUT, { recursive: true });
const EMAIL = `shots-entry-${Date.now()}@test.local`;
const PASSWORD = "shijing-2026-review";

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  locale: "zh-CN",
});
const page = await context.newPage();

await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
await page.locator('button:has-text("去注册")').click();
await page.locator('input[type="email"]').first().fill(EMAIL);
await page.locator('input[type="password"]').nth(0).fill(PASSWORD);
await page.locator('input[type="password"]').nth(1).fill(PASSWORD);
await page.locator('button[aria-label="注册"]').click();
await page.waitForURL(`${BASE}/`, { timeout: 15000 });
await page.waitForTimeout(1200);
await page.screenshot({ path: resolve(OUT, "01-home-fresh.png") });

// /tour 起始面板
await page.goto(`${BASE}/tour`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1000);
await page.screenshot({ path: resolve(OUT, "02-tour-start.png") });

// 择路 + 续修快捷
await page.locator('button:has-text("点亮第一盏诗火")').click();
await page.waitForTimeout(700);
await page.locator("button").filter({ hasText: /青灯小径|风雨险滩|无名残卷/ }).first().click();
await page.waitForURL("**/play/**", { timeout: 10000 });
await page.waitForTimeout(800);
await page.goto(`${BASE}/tour`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1000);
await page.screenshot({ path: resolve(OUT, "03-tour-resume-shortcut.png") });

// /library
await page.goto(`${BASE}/library`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1200);
await page.screenshot({ path: resolve(OUT, "04-library.png") });

// 文集章节页
await page.locator('a[href^="/library/"]').first().click();
await page.waitForURL("**/library/**", { timeout: 10000 });
await page.waitForTimeout(1000);
await page.screenshot({ path: resolve(OUT, "05-library-collection.png") });

await browser.close();
console.log("DONE", OUT);
