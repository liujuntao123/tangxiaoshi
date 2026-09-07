/* 主角样式走查截图：闯关答题 + 无尽开场/答题 两处基线与改后对比。
 *
 * 用法：node scripts/hero-style-shots.mjs screenshots/hero-style [BASE]
 * 依赖 :8081 的 preview 构建（scripts/preview.mjs restart）。
 */
import { chromium } from "playwright";
import { mkdirSync, readFileSync } from "node:fs";
import { buildLevelPlan } from "../src/lib/game/levels.ts";

const OUT = process.argv[2] ?? "screenshots/hero-style";
const BASE = process.argv[3] ?? process.env.UI_BASE ?? "http://127.0.0.1:8081";
mkdirSync(OUT, { recursive: true });

const bank = JSON.parse(
  readFileSync(new URL("../src/lib/game/content/bank.json", import.meta.url), "utf8"),
);
const poems = bank.poems.filter((p) => p.questions.length === 5);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.on("pageerror", (err) => console.log("PAGEERROR:", err.message));

let n = 0;
async function shot(name, waitMs = 900) {
  await page.waitForTimeout(waitMs);
  n += 1;
  const file = `${OUT}/${String(n).padStart(2, "0")}-${name}.png`;
  await page.screenshot({ path: file });
  console.log("saved", file);
}

// 登录
await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await page.getByText("去注册").click();
const email = `hero-${Date.now()}@test.local`;
await page.fill('input[type="email"]', email);
const pw = page.locator('input[type="password"]');
await pw.nth(0).fill("password123");
await pw.nth(1).fill("password123");
await page.getByRole("button", { name: "注册", exact: true }).click();
await page.waitForURL(`${BASE}/`, { timeout: 15000 });

// 1. 闯关答题：开场 → 开始答题 → 第 1 题
const sessionText = await page.evaluate(async () => {
  const res = await fetch("/api/auth/get-session", { credentials: "include" });
  return await res.text();
});
const userId = JSON.parse(sessionText)?.user?.id;
if (!userId) throw new Error("no session user id");
const plan = buildLevelPlan(poems, userId, 1);
const answerByQuote = new Map();
for (const { question } of plan.questions) {
  answerByQuote.set(question.quote, question.choices[question.answerIndex]);
}

await page.goto(`${BASE}/levels/1`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: "开始答题" }).click();
await shot("level-battle-q1", 1200);

// 2. 无尽模式：开场 → 开始 → 第 1 题
await page.goto(`${BASE}/endless`, { waitUntil: "networkidle" });
await shot("endless-intro", 1500);
await page.getByRole("button", { name: "开始" }).click();
await shot("endless-battle-q1", 1200);

console.log("total shots:", n);
await browser.close();
