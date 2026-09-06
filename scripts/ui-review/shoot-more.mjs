/**
 * 深度状态截图：收句反馈（对/错）、诗签生效、结算诗印、墨潮试炼报告等
 * shoot.mjs 没覆盖的游戏感关键状态。作答用题库 bank.json 确定性选对/选错。
 * 用法：node scripts/ui-review/shoot-more.mjs --out=screenshots/round-N
 */
import { chromium } from "playwright";
import { mkdirSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const BANK = JSON.parse(readFileSync(resolve(HERE, "../../src/lib/game/content/bank.json"), "utf8"));

const BASE = process.env.SHOT_BASE ?? "http://127.0.0.1:8123";
const argOut = process.argv.find((a) => a.startsWith("--out"));
const OUT_DIR = resolve(argOut ? argOut.split("=")[1] : "screenshots/deep");
mkdirSync(OUT_DIR, { recursive: true });

const EMAIL = `deep-review-${Date.now()}@test.local`;
const PASSWORD = "shijing-2026-review";

async function shot(page, name) {
  await page.waitForTimeout(500);
  await page.screenshot({ path: resolve(OUT_DIR, `${name}.png`) });
  console.log("shot:", name);
}

/** 读屏上的题面（大字 quote + 问法），在题库里找到原题与四个选项文本。 */
function matchQuestion(quote, ask) {
  const type = ask.includes("下一句") ? "complete-next" : ask.includes("上一句") ? "complete-prev" : "title";
  const hits = [];
  for (const poem of BANK.poems) {
    for (const q of poem.questions) {
      if (q.quote === quote && q.type === type) hits.push(q);
    }
  }
  return hits;
}

/** 点击含指定文本的选项木牍（限 .ui-slip 按钮）。 */
async function pickChoice(page, text) {
  await page.locator(`button:has(.ui-slip)`).filter({ hasText: text }).first().click();
}

/** 作答一次：correct 控制 grep 正确/错误选项；返回 { quote } 便于日志。 */
async function answerOnce(page, correct, name) {
  await page.waitForSelector("section p.title-art", { timeout: 8000 });
  const quote = (await page.locator("section p.title-art").first().innerText()).trim();
  const ask = (await page.locator("section p.paper-glow.text-sm").first().innerText()).trim();
  const hits = matchQuestion(quote, ask);
  if (hits.length === 0) throw new Error(`题库未命中: ${quote} / ${ask}`);
  // 候选按「四个选项都出现在屏上」过滤，规避跨诗同 quote 的歧义
  const buttons = page.locator("button:has(.ui-slip)");
  const onScreen = [];
  for (const q of hits) {
    const texts = q.choices.map((c) => c);
    let all = true;
    for (const t of texts) {
      if ((await buttons.filter({ hasText: t }).count()) === 0) all = false;
    }
    if (all) onScreen.push(q);
  }
  const q = onScreen[0] ?? hits[0];
  const answerText = q.choices[q.answerIndex];
  const wrongText = q.choices.find((c) => c !== answerText);
  await shot(page, name); // 作答前
  await pickChoice(page, correct ? answerText : wrongText);
  await page.waitForTimeout(1200); // SETTLE_MS=500 + 报告 pop-in
  return { quote, correctText: answerText };
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

// 登录
await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await page.locator('button:has-text("去注册")').click();
await page.locator('input[type="email"]').first().fill(EMAIL);
await page.locator('input[type="password"]').nth(0).fill(PASSWORD);
await page.locator('input[type="password"]').nth(1).fill(PASSWORD);
await page.getByRole("button", { name: "注册", exact: true }).click();
await page.waitForURL(`${BASE}/`, { timeout: 15000 });
await page.waitForTimeout(900);

// —— 远征诗卡全程：诗签 → 5 题（对/错/对/对/对）→ 中盘修页奖励 → 下一节点诗签 ——
// 首页主按钮是 Link（a 元素）；/tour 面板里的牌匾按钮才真正点亮诗火、开出墨路
await page.locator('a:has-text("点亮第一盏诗火")').click();
await page.waitForURL("**/tour", { timeout: 10000 });
await page.waitForTimeout(700);
await page.locator('button:has-text("点亮第一盏诗火")').click();
await page.waitForTimeout(900);
await page.locator("button").filter({ hasText: /青灯小径/ }).first().click();
await page.waitForURL("**/play/**", { timeout: 10000 });
await page.waitForTimeout(900);

// 诗签：选「明心」（HUD 会出现「明心·隐两项」按钮）
await page.locator("button").filter({ hasText: /明心/ }).first().click();
await page.waitForTimeout(350);
await shot(page, "20-loadout-picked");
await page.locator('button:has-text("开始答题")').click();
await page.waitForTimeout(600);

// Q1 答对 → 收句反馈（对）
await answerOnce(page, true, "21-q1-before");
await shot(page, "22-report-correct");
await page.locator('button:has-text("收句"), button:has-text("继续")').click({ timeout: 4000 });
await page.waitForTimeout(500);

// Q2 答错 → 收句反馈（错，诗火灭一盏）
await answerOnce(page, false, "23-q2-before");
await shot(page, "24-report-wrong");
await page.locator('button:has-text("收句"), button:has-text("继续")').click({ timeout: 4000 });
await page.waitForTimeout(500);

// Q3 用明心隐两项 → 隐藏态截图 → 答对
await page.locator('button:has-text("明心")').first().click();
await page.waitForTimeout(400);
await shot(page, "25-clarity-hidden");
await (async () => {
  await page.waitForSelector("section p.title-art", { timeout: 8000 });
  const quote = (await page.locator("section p.title-art").first().innerText()).trim();
  const ask = (await page.locator("section p.paper-glow.text-sm").first().innerText()).trim();
  const hits = matchQuestion(quote, ask);
  const q = hits[0];
  await pickChoice(page, q.choices[q.answerIndex]);
  await page.waitForTimeout(1200);
})();
await shot(page, "26-report-q3");
await page.locator('button:has-text("收句"), button:has-text("继续")').click({ timeout: 4000 });
await page.waitForTimeout(400);

// Q4/Q5 答对 → 通关中盘「诗页已修复 + 修页奖励」
for (const n of [4, 5]) {
  await answerOnce(page, true, `27-q${n}-before`);
  await shot(page, `27-q${n}-report`);
  await page.locator('button:has-text("收句"), button:has-text("继续")').click({ timeout: 4000 });
  await page.waitForTimeout(450);
}
await page.waitForTimeout(700);
await shot(page, "28-result-node-clear");
// 领修页奖励「续灯」→ 下一节点诗签页
await page.locator('button:has-text("续灯")').click({ timeout: 4000 }).catch(() => {});
await page.waitForTimeout(900);
await shot(page, "29-node2-loadout");

// —— 墨潮试炼：开局 → 答对报告 → 答错终局 ——
await page.goto(`${BASE}/endless`, { waitUntil: "networkidle" });
await page.locator('button:has-text("开始")').first().click();
await page.waitForTimeout(700);
await answerOnce(page, true, "31-endless-q1-before");
await shot(page, "32-endless-report-correct");
await page.locator('button:has-text("收句"), button:has-text("继续")').click({ timeout: 4000 });
await page.waitForTimeout(500);
await answerOnce(page, false, "33-endless-q2-before");
await shot(page, "34-endless-report-wrong");
await page.locator('button:has-text("看结果")').click({ timeout: 4000 });
await page.waitForTimeout(800);
await shot(page, "35-endless-ended");

await browser.close();
console.log("DONE", OUT_DIR);
