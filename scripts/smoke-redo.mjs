/* 补答道具冒烟：注册 → 全对第 1 关拿奖励 → 若奖励含「补答」，
   进第 2 关故意答错并使用补答换题，验证本题不计、新题补位。 */
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { buildLevelPlan } from "../src/lib/game/levels.ts";

const BASE = "http://127.0.0.1:8081";
const bank = JSON.parse(readFileSync(new URL("../src/lib/game/content/bank.json", import.meta.url), "utf8"));
const poems = bank.poems.filter((p) => p.questions.length === 5);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.on("pageerror", (err) => console.log("PAGEERROR:", err.message));

async function registerAndWinLevel1() {
  await page.goto(BASE + "/login", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  const email = `redo-${Date.now()}-${Math.floor(Math.random() * 1e6)}@test.local`;
  await page.getByText("去注册").click();
  await page.fill('input[type="email"]', email);
  const pw = page.locator('input[type="password"]');
  await pw.nth(0).fill("password123");
  await pw.nth(1).fill("password123");
  await page.getByRole("button", { name: "注册", exact: true }).click();
  await page.waitForURL(BASE + "/", { timeout: 15000 });
  await page.waitForTimeout(1200);
  const sessionData = JSON.parse(
    await page.evaluate(async () => {
      const res = await fetch("/api/auth/get-session", { credentials: "include" });
      return await res.text();
    }),
  );
  const plan = buildLevelPlan(poems, sessionData.user.id, 1);
  await page.goto(`${BASE}/levels/1`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.getByRole("button", { name: "开始答题" }).click();
  await page.waitForTimeout(600);
  for (let i = 0; i < 11; i++) {
    const quote = (await page.locator("section .title-art").first().innerText().catch(() => "")).trim();
    const found = plan.questions.map((entry) => entry.question).find((q) => q.quote === quote);
    const answer = found ? found.choices[found.answerIndex] : undefined;
    if (!answer) break;
    const exact = page.getByRole("button", { name: answer, exact: true });
    const btn = (await exact.count()) ? exact.first() : page.getByRole("button").filter({ hasText: answer }).first();
    await btn.click();
    await page.waitForTimeout(900);
    const nextBtn = page.getByRole("button", { name: /下一题|看结果/ });
    if (!(await nextBtn.count())) break;
    await nextBtn.click();
    await page.waitForTimeout(500);
    if ((await page.locator("body").innerText()).includes("本关得分")) break;
  }
  const rewardText = await page.locator("body").innerText();
  return rewardText.includes("星星奖励") ? rewardText.match(/星星奖励：([^\n]+)/)?.[1] ?? "" : "";
}

let rewards = "";
for (let attempt = 1; attempt <= 4; attempt++) {
  rewards = await registerAndWinLevel1();
  console.log(`attempt ${attempt} rewards:`, rewards);
  if (rewards.includes("补答")) break;
  // 换下一个用户前登出（直接清 session 即可：注册新账号会覆盖当前会话）
}
if (!rewards.includes("补答")) {
  console.log("no 补答 dropped in 4 attempts — 跳过（概率性，逻辑已由单测覆盖）");
  await browser.close();
  process.exit(0);
}

// 进第 2 关：确认道具文案，答错第一题并使用补答
await page.goto(`${BASE}/levels/2`, { waitUntil: "networkidle" });
await page.waitForTimeout(1200);
const intro = await page.locator("body").innerText();
console.log("intro lists 补答:", /本关可用道具：.*补答/.test(intro.replace(/\n/g, "")));
await page.getByRole("button", { name: "开始答题" }).click();
await page.waitForTimeout(600);

const plan2 = JSON.parse(
  await page.evaluate(async () => {
    const res = await fetch("/api/auth/get-session", { credentials: "include" });
    const data = await res.json();
    return JSON.stringify({ uid: data.user.id });
  }),
);
void plan2;
const session2 = JSON.parse(
  await page.evaluate(async () => {
    const res = await fetch("/api/auth/get-session", { credentials: "include" });
    return await res.text();
  }),
);
const plan = buildLevelPlan(poems, session2.user.id, 2);
const first = plan.questions[0].question;
const wrongChoice = first.choices.find((_, i) => i !== first.answerIndex);
const quoteBefore = (await page.locator("section .title-art").first().innerText()).trim();
await page.getByRole("button").filter({ hasText: wrongChoice }).first().click();
await page.waitForTimeout(950);
const redoBtn = page.getByRole("button", { name: /用补答/ });
console.log("补答按钮出现:", (await redoBtn.count()) > 0);
await redoBtn.click();
await page.waitForTimeout(800);
const quoteAfter = (await page.locator("section .title-art").first().innerText()).trim();
const hud = await page.locator("body").innerText();
console.log("题目已换:", quoteBefore !== quoteAfter);
console.log("答错计数归零（答对 0 · 答错 0）:", hud.includes("答对 0 · 答错 0"));
await page.screenshot({ path: "screenshots/level-redo.png" });
console.log("CONSOLE ERRORS: checked in pageerror handler");

await browser.close();
