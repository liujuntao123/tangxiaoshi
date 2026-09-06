/**
 * 入口拆分端到端验证（ADR-0017）：
 * 1) 新手：首页 → 点亮第一盏诗火 → /tour 择路 → 答题页
 * 2) 续修：回首页 → 继续远征 → 直达同一答题页
 * 3) 中盘（未择路）：首页按钮显示「去择墨路」→ /tour 出现「续修本页」快捷
 * 4) 文集：dock → /library → 文集 → 章 → 作者 → 诗卡答题（普通模式）
 * 5) 旧深链：/tour/$collectionId… 重定向到 /library/…
 * 用法：node scripts/ui-review/verify-entries.mjs [base]
 */
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://127.0.0.1:8123";
const EMAIL = `verify-entries-${Date.now()}@test.local`;
const PASSWORD = "shijing-2026-review";
let failed = 0;
const check = (name, cond, detail = "") => {
  console.log(`${cond ? "✔" : "✖"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!cond) failed++;
};

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  locale: "zh-CN",
});
const page = await context.newPage();
page.on("pageerror", (e) => { console.log("[pageerror]", e.message); failed++; });

// 注册
await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
await page.locator('button:has-text("去注册")').click();
await page.locator('input[type="email"]').first().fill(EMAIL);
await page.locator('input[type="password"]').nth(0).fill(PASSWORD);
await page.locator('input[type="password"]').nth(1).fill(PASSWORD);
await page.locator('button[aria-label="注册"]').click();
await page.waitForURL(`${BASE}/`, { timeout: 15000 });
await page.waitForTimeout(1000);

// 1. 新手：点亮第一盏诗火 → /tour → 择路 → 答题页
const mainBtn = () => page.locator("a.tap").filter({ hasText: /继续远征|去择墨路|再启远征|点亮第一盏诗火/ }).first();
check("新手主按钮=点亮第一盏诗火", (await mainBtn().innerText()).trim() === "点亮第一盏诗火", await mainBtn().getAttribute("href"));
await mainBtn().click();
await page.waitForURL("**/tour", { timeout: 10000 });
await page.locator('button:has-text("点亮第一盏诗火")').click();
await page.waitForTimeout(600);
const path = page.locator("button").filter({ hasText: /青灯小径|风雨险滩|无名残卷/ }).first();
const offerText = await path.innerText();
await path.click();
await page.waitForURL("**/play/**", { timeout: 10000 });
const playUrl = page.url();
check("择路进入答题页", /\/play\/.+\?route=\w+&node=0$/.test(playUrl), playUrl);
check("路线卡带《诗名》与「作者 · 文集」", /《.+》/.test(offerText) && /.+ · .+/.test(offerText), offerText.replace(/\s+/g, " ").slice(0, 40));

// 2. 回首页 → 继续远征 → 直达同一答题页
await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1400);
check("已择路主按钮=继续远征", (await mainBtn().innerText()).trim() === "继续远征", await mainBtn().getAttribute("href"));
await mainBtn().click();
await page.waitForTimeout(1200);
check("继续远征直达原答题页", page.url() === playUrl, page.url());

// 3. 中盘（模拟第 1 页完成、第 2 页未择路）：localStorage 直接推进
await page.evaluate(() => {
  const raw = JSON.parse(window.localStorage.getItem("tangxiaoshi.expedition.v1"));
  raw.nodeIndex = 1;
  raw.nodes = [{ ...raw.nodes[0], status: "done" }, null, null];
  window.localStorage.setItem("tangxiaoshi.expedition.v1", JSON.stringify(raw));
});
await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1400);
check("中盘主按钮=去择墨路", (await mainBtn().innerText()).trim() === "去择墨路", await mainBtn().getAttribute("href"));
check("中盘说明=选一条墨路", (await page.locator("p.paper-glow.text-center").last().innerText()).includes("选一条墨路"));
await mainBtn().click();
await page.waitForURL("**/tour", { timeout: 10000 });
await page.waitForTimeout(800);
const resume = page.locator('button:has-text("续修本页")');
check("未领卡时无续修快捷", (await resume.count()) === 0);
check("择路页显示三条墨路", (await page.locator("button").filter({ hasText: /青灯小径|风雨险滩|无名残卷/ }).count()) >= 1);

// 择第 2 页路线后，再回择路页应出现续修快捷
await page.locator("button").filter({ hasText: /青灯小径|风雨险滩|无名残卷/ }).first().click();
await page.waitForURL("**/play/**", { timeout: 10000 });
await page.goto(`${BASE}/tour`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1000);
check("已领卡后择路页有续修本页", (await page.locator('button:has-text("续修本页")').count()) === 1);
await page.locator('button:has-text("续修本页")').click();
await page.waitForURL("**/play/**", { timeout: 10000 });
check("续修快捷直达答题页", new URL(page.url()).searchParams.get("node") === "1", page.url());

// 4. 文集：dock → /library → 文集 → 章 → 作者 → 诗卡
await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1200);
await page.locator('nav a:has-text("文集")').click();
await page.waitForURL("**/library", { timeout: 10000 });
check("文集入口到 /library", new URL(page.url()).pathname === "/library");
await page.waitForTimeout(900);
const colls = page.locator('a[href^="/library/"]');
check("资料库列出文集卡", (await colls.count()) > 0, `count=${await colls.count()}`);
await colls.first().click();
await page.waitForURL("**/library/**", { timeout: 10000 });
await page.waitForTimeout(800);
await page.locator('a[href*="/library/"]').last().click(); // 第一章
await page.waitForURL(/\/library\/.+\/.+/, { timeout: 10000 });
await page.waitForTimeout(800);
const authors = page.locator('a[href*="/library/"]');
check("章节页列出作者", (await authors.count()) > 0, `count=${await authors.count()}`);
await authors.last().click(); // HUD 返回键也是 /library 链接，取最后一个行卡
await page.waitForURL(/\/library\/.+\/.+\/.+/, { timeout: 10000 });
await page.waitForTimeout(900);
// 首遇作者有引导对白浮层，点完它（末尾按钮为「开始答题」）才露出诗卡
for (let i = 0; i < 6; i++) {
  const next = page.locator('button:has-text("点击继续"), button:has-text("开始答题")').first();
  if ((await next.count()) === 0) break;
  await next.click().catch(() => {});
  await page.waitForTimeout(350);
}
const poemCard = page.locator("button.tap").filter({ has: page.locator("p") }).first();
await poemCard.click();
await page.waitForURL("**/play/**", { timeout: 10000 });
const libPlay = page.url();
check("文集诗卡进入答题页（无 route 参数）", !new URL(libPlay).searchParams.has("route"), libPlay);

// 5. 旧深链重定向
await page.goto(`${BASE}/tour/huajianji`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(800);
check("旧 /tour/$collectionId 重定向 /library", new URL(page.url()).pathname.startsWith("/library/"), page.url());

// 收官态主按钮
await page.evaluate(() => {
  const raw = JSON.parse(window.localStorage.getItem("tangxiaoshi.expedition.v1"));
  raw.finished = "clear";
  window.localStorage.setItem("tangxiaoshi.expedition.v1", JSON.stringify(raw));
});
await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1400);
check("收官主按钮=再启远征", (await mainBtn().innerText()).trim() === "再启远征");

await browser.close();
console.log(failed === 0 ? "\nALL PASS" : `\n${failed} CHECK(S) FAILED`);
process.exit(failed === 0 ? 0 : 1);
