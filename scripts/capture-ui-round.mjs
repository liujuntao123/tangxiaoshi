/* UI 走查截图：注册新玩家 → 按路由与交互状态采集全套竖屏截图。
 *
 * 用法：node scripts/capture-ui-round.mjs screenshots/ui-round [BASE]
 * 依赖 :8081 的 preview 构建（scripts/preview.mjs restart）。
 */
import { chromium } from "playwright";
import { mkdirSync, readFileSync } from "node:fs";
import { buildLevelPlan } from "../src/lib/game/levels.ts";

const OUT = process.argv[2] ?? "screenshots/ui-round";
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

// 1. 登录页（未登录）
await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await shot("login", 1400);

// 2. 注册进入首页（远征台）
await page.getByText("去注册").click();
const email = `ui-${Date.now()}@test.local`;
await page.fill('input[type="email"]', email);
const pw = page.locator('input[type="password"]');
await pw.nth(0).fill("password123");
await pw.nth(1).fill("password123");
await page.getByRole("button", { name: "注册", exact: true }).click();
await page.waitForURL(`${BASE}/`, { timeout: 15000 });
await shot("home", 1800);

// 3. 关卡列表
await page.goto(`${BASE}/levels`, { waitUntil: "networkidle" });
await shot("levels", 1400);

// 4. 关卡介绍 → 答题，用真实引擎算答案
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
await shot("level-intro", 1500);
await page.getByRole("button", { name: "开始答题" }).click();
await shot("quiz-q1", 1100);

// Q1 答对 → 报告
{
  const quoteEl = page.locator("section .title-art").first();
  const quote = (await quoteEl.innerText().catch(() => "")).trim();
  const answer = answerByQuote.get(quote);
  await page.getByRole("button").filter({ hasText: answer }).first().click();
  await shot("quiz-report-correct", 1100);
  await page.getByRole("button", { name: /下一题|看结果/ }).click();
}

// Q2 答错 → 报告
{
  await page.waitForTimeout(700);
  const quoteEl = page.locator("section .title-art").first();
  const quote = (await quoteEl.innerText().catch(() => "")).trim();
  const answer = answerByQuote.get(quote);
  // 直接点第一个非正确项：选项按钮都在选项容器里，取与正确答案不同的第一个
  const candidates = page.getByRole("button").filter({ hasText: /\S/ });
  let clicked = false;
  for (let i = 0; i < (await candidates.count()); i++) {
    const t = (await candidates.nth(i).innerText().catch(() => "")).trim();
    if (t && t !== answer && t.length <= 30) {
      await candidates.nth(i).click();
      clicked = true;
      break;
    }
  }
  if (!clicked) console.log("Q2: no wrong choice found");
  await shot("quiz-report-wrong", 1100);
  await page.getByRole("button", { name: /下一题|看结果/ }).click();
}

// Q3..Q10 全对直到结算
for (let i = 3; i <= 12; i++) {
  await page.waitForTimeout(700);
  const body = await page.locator("body").innerText();
  if (body.includes("本关得分") || body.includes("过关")) break;
  const quoteEl = page.locator("section .title-art").first();
  const quote = (await quoteEl.innerText().catch(() => "")).trim();
  const answer = answerByQuote.get(quote);
  if (!answer) {
    console.log(`Q${i}: cannot match quote`);
    break;
  }
  await page.getByRole("button").filter({ hasText: answer }).first().click();
  await page.waitForTimeout(950);
  const nextBtn = page.getByRole("button", { name: /下一题|看结果/ });
  if (!(await nextBtn.count())) break;
  await nextBtn.click();
}
await shot("level-result", 1100);

// 5. 诗卡答题（资料库路径，带机会灯笼）
const poem = poems[0];
await page.goto(`${BASE}/play/${poem.id}`, { waitUntil: "networkidle" });
await shot("play-q1", 1800);
{
  const q = poem.questions[0];
  const answerText = q.choices?.[q.answerIndex] ?? q.answer;
  const candidates = page.getByRole("button").filter({ hasText: /\S/ });
  let clicked = false;
  for (let i = 0; i < (await candidates.count()); i++) {
    const t = (await candidates.nth(i).innerText().catch(() => "")).trim();
    if (t && answerText && !t.includes(answerText) && t.length <= 30) {
      await candidates.nth(i).click();
      clicked = true;
      break;
    }
  }
  if (!clicked) console.log("play: no wrong choice found");
  await shot("play-report-wrong", 1100);
}

// 6. 资料库三层 + 作者引导语
await page.goto(`${BASE}/library`, { waitUntil: "networkidle" });
await shot("library", 1400);
await page.locator("a[href*='/library/']").first().click();
await shot("library-chapters", 1400);
await page.locator("a[href*='/library/']").first().click();
await shot("library-authors", 1400);
await page.locator("a[href*='/library/']").first().click();
await shot("author-speech", 1600);
await page.getByRole("button", { name: /.{0,6}/ }).filter({ hasText: /继续|好的|开始|知道了|进入/ }).first().click().catch(() => {});
await shot("author-page", 1200);

// 7. 诗册
await page.goto(`${BASE}/achievements`, { waitUntil: "networkidle" });
await shot("achievements", 1500);

// 8. 墨潮试炼
await page.goto(`${BASE}/endless`, { waitUntil: "networkidle" });
await shot("endless-intro", 1500);
await page.getByRole("button", { name: "开始" }).click();
await shot("endless-q1", 1200);

// 9. 诗库
await page.goto(`${BASE}/practice`, { waitUntil: "networkidle" });
await shot("practice", 1500);
const practiceLink = page.locator("a[href*='/practice/']").first();
if (await practiceLink.count()) {
  await practiceLink.click();
  await shot("practice-play", 1500);
}

// 10. 设置弹窗
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: "设置" }).click();
await shot("settings", 900);

console.log("CONSOLE/page errors above (if any). total shots:", n);
await browser.close();
