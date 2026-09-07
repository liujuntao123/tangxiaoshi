/* UI 全量走查截图：注册新玩家后逐页逐状态采集（含 360px 窄屏复核）。
 *
 * 用法：node scripts/capture-ui-audit.mjs screenshots/audit [BASE]
 * 依赖 :8081 的 preview 构建（scripts/preview.mjs restart + BETTER_AUTH_TRUSTED_ORIGINS）。
 */
import { chromium } from "playwright";
import { mkdirSync, readFileSync } from "node:fs";
import { buildLevelPlan } from "../src/lib/game/levels.ts";

const OUT = process.argv[2] ?? "screenshots/ui-audit";
const BASE = process.argv[3] ?? process.env.UI_BASE ?? "http://127.0.0.1:8081";
mkdirSync(OUT, { recursive: true });

const bank = JSON.parse(
  readFileSync(new URL("../src/lib/game/content/bank.json", import.meta.url), "utf8"),
);
const poems = bank.poems.filter((p) => p.questions.length === 5);

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();
page.on("pageerror", (err) => console.log("PAGEERROR:", err.message));

let n = 0;
async function shot(name, waitMs = 900) {
  await page.waitForTimeout(waitMs);
  n += 1;
  const file = `${OUT}/${String(n).padStart(2, "0")}-${name}.png`;
  await page.screenshot({ path: file });
  console.log("saved", file);
}
async function clickByText(selector, text) {
  await page.locator(selector).filter({ hasText: text }).first().click();
}
async function nextPageIfPossible() {
  const btn = page.getByRole("button", { name: "下一页" });
  if (await btn.count()) {
    const disabled = await btn.isDisabled().catch(() => true);
    if (!disabled) {
      await btn.click();
      await page.waitForTimeout(800);
      return true;
    }
  }
  return false;
}

// —— 登录 / 注册 ——
await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await shot("login", 1400);
await page.getByText("去注册").click();
await shot("login-register", 700);

const email = `audit-${Date.now()}@test.local`;
await page.fill('input[type="email"]', email);
const pw = page.locator('input[type="password"]');
await pw.nth(0).fill("password123");
await pw.nth(1).fill("password123");
await page.getByRole("button", { name: "注册", exact: true }).click();
await page.waitForURL(`${BASE}/`, { timeout: 15000 });
await shot("home", 1800);

// —— 关卡列表（两页）——
await page.goto(`${BASE}/levels`, { waitUntil: "networkidle" });
await shot("levels-p1", 1300);
if (await nextPageIfPossible()) await shot("levels-p2", 900);

// —— 关卡答题全流程 ——
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
await shot("level-intro", 1400);
await page.getByRole("button", { name: "开始答题" }).click();
await shot("quiz-q1", 1000);

async function answerLevelQuestion(pickWrong) {
  // 选项木牍文案带「甲乙丙丁」序号印前缀，比较时剥掉
  const norm = (s) => s.replace(/^[甲乙丙丁]\s*\n?/, "").trim();
  const quote = (await page.locator("section .title-art").first().innerText().catch(() => "")).trim();
  const answer = answerByQuote.get(quote);
  const candidates = page.getByRole("button").filter({ hasText: /\S/ });
  const count = await candidates.count();
  for (let i = 0; i < count; i++) {
    const t = norm((await candidates.nth(i).innerText().catch(() => "")).trim());
    const isAnswer = answer !== undefined && t === answer;
    if (t && t.length <= 40 && (pickWrong ? !isAnswer : isAnswer)) {
      await candidates.nth(i).click();
      await page.waitForTimeout(950);
      return true;
    }
  }
  console.log(`WARN: no ${pickWrong ? "wrong" : "correct"} choice clicked for "${quote.slice(0, 20)}"`);
  return false;
}
await answerLevelQuestion(false);
await shot("quiz-report-correct", 900);
await page.getByRole("button", { name: /下一题|看结果/ }).click();
await page.waitForTimeout(700);
await answerLevelQuestion(true);
await shot("quiz-report-wrong", 900);
await page.getByRole("button", { name: /下一题|看结果/ }).click();
for (let i = 3; i <= 12; i++) {
  await page.waitForTimeout(600);
  if ((await page.locator("body").innerText()).includes("本关得分")) break;
  if (!(await answerLevelQuestion(false))) break;
  const nextBtn = page.getByRole("button", { name: /下一题|看结果/ });
  if (!(await nextBtn.count())) break;
  await nextBtn.click();
}
await shot("level-result", 1000);

// —— 诗卡答题（资料库路径）：答错三题走到失败结算 ——
const playPoem = poems[1];
await page.goto(`${BASE}/play/${playPoem.id}`, { waitUntil: "networkidle" });
await shot("play-q1", 1600);
for (let q = 0; q < 3; q++) {
  const qd = playPoem.questions[q];
  const answerText = qd.choices?.[qd.answerIndex] ?? qd.answer;
  const norm = (s) => s.replace(/^[甲乙丙丁]\s*\n?/, "").trim();
  const candidates = page.getByRole("button").filter({ hasText: /\S/ });
  const count = await candidates.count();
  let clicked = false;
  for (let i = 0; i < count; i++) {
    const t = norm((await candidates.nth(i).innerText().catch(() => "")).trim());
    if (t && t.length <= 40 && !(answerText && t.includes(answerText))) {
      await candidates.nth(i).click();
      clicked = true;
      break;
    }
  }
  if (!clicked) break;
  await page.waitForTimeout(950);
  if (q === 0) await shot("play-report-wrong", 700);
  const nextBtn = page.getByRole("button", { name: /下一题|看结果/ });
  if (!(await nextBtn.count())) break;
  await nextBtn.click();
  await page.waitForTimeout(700);
}
await shot("play-result-lose", 900);

// —— 资料库三层 ——
// 注意：页头返回键也是 /library/ 链接，行链接从 nth(1) 起取
const rowLink = () => page.locator("a[href*='/library/']").nth(1);

await page.goto(`${BASE}/library`, { waitUntil: "networkidle" });
await shot("library-p1", 1300);
if (await nextPageIfPossible()) await shot("library-p2", 900);

await page.goto(`${BASE}/library`, { waitUntil: "networkidle" });
await rowLink().click();
await shot("chapters", 1300);
if (await nextPageIfPossible()) await shot("chapters-p2", 900);

await rowLink().click();
await shot("authors", 1300);
if (await nextPageIfPossible()) await shot("authors-p2", 900);

// 首位作者：首遇引导语 → 逐句点掉 → 诗卡网格
await rowLink().click();
await shot("author-speech", 1500);
for (let i = 0; i < 6; i++) {
  const cont = page.locator("button").filter({ hasText: /点击继续|开始答题/ }).first();
  if (!(await cont.count())) break;
  await cont.click().catch(() => {});
  await page.waitForTimeout(450);
  if ((await page.locator("button").filter({ hasText: /点击继续|开始答题/ }).count()) === 0) break;
}
await shot("author-poems", 1100);
if (await nextPageIfPossible()) await shot("author-poems-p2", 900);

// —— 诗册（含分页与分类 tab）——
await page.goto(`${BASE}/achievements`, { waitUntil: "networkidle" });
await shot("achievements", 1400);
if (await nextPageIfPossible()) await shot("achievements-p2", 900);
await clickByText("button", "作者");
await shot("achievements-tab-author", 900);

// —— 无尽模式：开场 → 答错 → 结束 ——
await page.goto(`${BASE}/endless`, { waitUntil: "networkidle" });
await shot("endless-intro", 1400);
await page.getByRole("button", { name: "开始" }).click();
await shot("endless-q1", 1100);
{
  // 只点选项木牍（带甲乙丙丁序号印），故意答错
  const slip = page.locator("button").filter({ hasText: /^[甲乙丙丁]/ }).first();
  await slip.click();
  await page.waitForTimeout(950);
}
await shot("endless-report-wrong", 800);
await page.getByRole("button", { name: /收句|看结果/ }).click();
await shot("endless-ended", 900);

// —— 诗库（两页 + 答题 + 先看答案）——
await page.goto(`${BASE}/practice`, { waitUntil: "networkidle" });
await shot("practice", 1400);
if (await nextPageIfPossible()) await shot("practice-p2", 900);
await page.locator("button.tap-deep").first().click();
await shot("practice-play", 1400);
const revealBtn = page.getByRole("button", { name: "先看答案" });
if (await revealBtn.count()) {
  await revealBtn.click();
  await shot("practice-reveal", 800);
}

// —— 设置弹窗 ——
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: "设置" }).click();
await shot("settings", 900);

// —— 360px 窄屏复核（同一会话）——
const narrow = await context.newPage();
await narrow.setViewportSize({ width: 360, height: 780 });
const nshot = async (name, url, waitMs = 1300) => {
  if (url) await narrow.goto(`${BASE}${url}`, { waitUntil: "networkidle" });
  await narrow.waitForTimeout(waitMs);
  n += 1;
  const file = `${OUT}/${String(n).padStart(2, "0")}-${name}.png`;
  await narrow.screenshot({ path: file });
  console.log("saved", file);
};
await nshot("narrow-home", "/");
await nshot("narrow-levels", "/levels");
await nshot("narrow-library", "/library");
await nshot("narrow-achievements", "/achievements");
await nshot("narrow-practice", "/practice");
await nshot("narrow-author-poems", "/library");

console.log("total shots:", n);
await browser.close();
