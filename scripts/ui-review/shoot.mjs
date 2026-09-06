/**
 * UI 走查截图脚本：沿真实玩家路径截图，供子代理评审。
 * 用法：node scripts/ui-review/shoot.mjs --out=screenshots/round-N
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const BASE = process.env.SHOT_BASE ?? "http://127.0.0.1:8123";
const argOut = process.argv.find((a) => a.startsWith("--out"));
const OUT_DIR = resolve(argOut ? argOut.split("=")[1] : "screenshots/baseline");
mkdirSync(OUT_DIR, { recursive: true });

// 每次运行用随机邮箱注册全新账号，保证「点亮第一盏诗火」的新手状态。
const EMAIL = `ui-review-${Date.now()}@test.local`;
const PASSWORD = "shijing-2026-review";

const shots = [];
async function shot(page, name) {
  const path = resolve(OUT_DIR, `${name}.png`);
  await page.waitForTimeout(500); // 等动画/入场过渡稳定
  await page.screenshot({ path });
  shots.push(name);
  console.log("shot:", name);
}

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  locale: "zh-CN",
});
const page = await context.newPage();
page.on("pageerror", (e) => console.error("[pageerror]", e.message));

// 1. 登录页（未登录态）
await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await shot(page, "01-login");

// 注册并登录
await page.locator('button:has-text("去注册")').click();
await page.locator('input[type="email"]').first().fill(EMAIL);
await page.locator('input[type="password"]').nth(0).fill(PASSWORD);
await page.locator('input[type="password"]').nth(1).fill(PASSWORD);
await page.getByRole("button", { name: "注册", exact: true }).click();
await page.waitForURL(`${BASE}/`, { timeout: 15000 });
await page.waitForTimeout(900);

// 2. 首页·远征台（新手态）
await shot(page, "02-home-fresh");

// 3. /tour 起始面板（墨潮已至）
await page.goto(`${BASE}/tour`, { waitUntil: "networkidle" });
await shot(page, "03-tour-start");

// 4. 点亮第一盏诗火 → 三条墨路
await page.locator('button:has-text("点亮第一盏诗火")').click();
await page.waitForTimeout(700);
await shot(page, "04-tour-routes");

// 5. 选第一条路线 → 诗签选择
await page.locator("button").filter({ hasText: /青灯小径|风雨险滩|无名残卷/ }).first().click();
await page.waitForURL("**/play/**", { timeout: 10000 });
await page.waitForTimeout(900);
await shot(page, "05-play-talisman");

// 6. 选一枚诗签
await page.locator("button").filter({ hasText: /明心|护卷|回响/ }).first().click();
await page.waitForTimeout(350);
await shot(page, "06-play-talisman-picked");

// 7. 开始答题
await page.locator('button:has-text("开始答题")').click();
await page.waitForTimeout(600);
await shot(page, "07-play-question");

// 8. 选一个答案（未收句）
await page.locator("button").filter({ has: page.locator(".ui-slip") }).first().click();
await page.waitForTimeout(400);
await shot(page, "08-play-answered");

// 9. 收句反馈
await page.locator('button:has-text("收句")').click({ timeout: 4000 }).catch(() => {});
await page.waitForTimeout(700);
await shot(page, "09-play-feedback");

// 10. 诗集资料库 / 诗册 / 墨潮试炼 / 诗库
const rest = [
  [`${BASE}/library`, "10-library"],
  [`${BASE}/achievements`, "11-achievements"],
  [`${BASE}/endless`, "12-endless"],
  [`${BASE}/practice`, "13-practice"],
];
for (const [url, name] of rest) {
  await page.goto(url, { waitUntil: "networkidle" });
  await shot(page, name);
}

await browser.close();
console.log("DONE", OUT_DIR, shots.join(","));
