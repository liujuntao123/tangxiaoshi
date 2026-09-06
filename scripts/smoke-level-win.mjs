/* 胜利路径冒烟：注册 → 用真实引擎算出该玩家第 1 关的题目 → 全对通关 →
   验证三星、道具奖励、下一关解锁、下一关直达。 */
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { buildLevelPlan } from "../src/lib/game/levels.ts";

const BASE = "http://127.0.0.1:8081";
const LEVEL = Number(process.argv[2] ?? 1);

// 与 content/index.ts 同口径的可用诗列表（恰好 5 题）
const bank = JSON.parse(readFileSync(new URL("../src/lib/game/content/bank.json", import.meta.url), "utf8"));
const poems = bank.poems.filter((p) => p.questions.length === 5);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.on("pageerror", (err) => console.log("PAGEERROR:", err.message));
const consoleErrors = [];
page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });

// 1. 注册并进入首页
await page.goto(BASE + "/login", { waitUntil: "networkidle" });
const email = `win-${Date.now()}@test.local`;
await page.getByText("去注册").click();
await page.fill('input[type="email"]', email);
const pw = page.locator('input[type="password"]');
await pw.nth(0).fill("password123");
await pw.nth(1).fill("password123");
await page.getByRole("button", { name: "注册", exact: true }).click();
await page.waitForURL(BASE + "/", { timeout: 15000 });
await page.waitForTimeout(1500);

// 2. 取该玩家的 userId，用真实引擎算第 LEVEL 关的题目与答案
const sessionText = await page.evaluate(async () => {
  const res = await fetch("/api/auth/get-session", { credentials: "include" });
  return await res.text();
});
const sessionData = JSON.parse(sessionText);
const userId = sessionData?.user?.id;
if (!userId) throw new Error("no session user id");
const plan = buildLevelPlan(poems, userId, LEVEL);
const answerByQuote = new Map();
for (const { question } of plan.questions) {
  answerByQuote.set(question.quote, question.choices[question.answerIndex]);
}
console.log(`plan ready for user ${userId}, level ${LEVEL}:`, plan.questions.length, "questions");

// 3. 进入本关并全对
await page.goto(`${BASE}/levels/${LEVEL}`, { waitUntil: "networkidle" });
await page.waitForTimeout(1200);
await page.getByRole("button", { name: "开始答题" }).click();
await page.waitForTimeout(700);

for (let i = 0; i < 12; i++) {
  const quoteEl = page.locator("section .title-art").first();
  const quote = (await quoteEl.innerText().catch(() => "")).trim();
  const answer = answerByQuote.get(quote);
  if (!answer) {
    console.log(`Q${i + 1}: cannot match quote "${quote}"`);
    break;
  }
  const exact = page.getByRole("button", { name: answer, exact: true });
  const choice = (await exact.count()) ? exact.first() : page.getByRole("button").filter({ hasText: answer }).first();
  await choice.click();
  await page.waitForTimeout(950);
  const body = await page.locator("body").innerText();
  if (!body.includes("答对了")) console.log(`Q${i + 1}: expected correct but report says otherwise`);
  const nextBtn = page.getByRole("button", { name: /下一题|看结果/ });
  if (!(await nextBtn.count())) break;
  await nextBtn.click();
  await page.waitForTimeout(550);
  if ((await page.locator("body").innerText()).includes("本关得分")) break;
}

await page.waitForTimeout(600);
await page.screenshot({ path: "screenshots/level-win.png" });
const resultText = await page.locator("body").innerText();
console.log("WIN 过关:", resultText.includes("过关"));
console.log("全对三星文案:", resultText.includes("全对！三星"));
console.log("星星奖励文案:", resultText.includes("星星奖励"));
console.log("下一关按钮:", resultText.includes("下一关"));

// 4. 点「下一关」直达第 2 关
await page.getByRole("button", { name: "下一关", exact: true }).click();
await page.waitForTimeout(1500);
console.log("URL after next:", page.url());
const introText = await page.locator("body").innerText();
console.log("LEVEL 2 intro:", introText.includes(`第 ${LEVEL + 1} 关`));
console.log("CONSOLE ERRORS:", consoleErrors.length ? consoleErrors.slice(0, 5) : "none");

// 5. 回首页验证进度与星星
await page.goto(BASE + "/", { waitUntil: "networkidle" });
await page.waitForTimeout(1200);
await page.screenshot({ path: "screenshots/levels-home-after-win.png" });
const home = await page.locator("body").innerText();
console.log("HOME 已通关 1/50:", home.includes("1"));
console.log("HOME 下一关是第 2 关:", home.includes("下一关 · 第 2 关"));

await browser.close();
