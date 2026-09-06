# 墨潮远征：工程实施与维护计划

> 状态：P0/P1 核心已落地（关卡制远征，ADR-0018）。本文记录当前架构、验收方式和后续计划，不再描述旧关卡/地图或三节点墨路实现。

## 1. 当前架构

- 技术栈：Vite 8、TanStack Start/Router、React 19、Tailwind CSS 4。
- 内容：11 个文集、89 章、281 位作者、2147 张诗卡、10735 题（题库池）。
- 主线入口：`home-screen.tsx` → `/levels`（`level-list.tsx`）→ `/levels/$levelId`（`level-quiz.tsx`）。
- 资料库入口：`/library`（`library-view.tsx`）→ `library-collections.tsx` → 章节/作者/诗卡；诗卡答题 `/play/$poemId`，练习 `/practice` + `/practice/$poemId`。
- 永久数据：`PlayerSave` 与 `migrations/0001–0005`（`level_stars` / `items` 见 0005）。
- 关卡数据：`src/lib/game/levels.ts`（userId 确定性题序 + 星级 + 道具规则，纯函数），进度落在 `PlayerSave.levelStars/items`，无独立进行时状态。

## 2. 文件职责

### 关卡与答题

- `src/lib/game/levels.ts`：关卡常量、出题算法（FNV-1a 种子 → 全库诗洗牌切段）、星级口径、道具定义与奖励发放、解锁/进度规则（纯函数，`levels.test.ts` 直测）。
- `src/lib/game/progress.ts`：`levelPlanFor(userId, level)` 把算法绑定到真实题库，并统一对外导出规则。
- `src/components/game/level-list.tsx`：关卡列表（50 卡、解锁态、星星）。
- `src/components/game/level-quiz.tsx`：关卡答题场（开场说明、道具条、报告层、结算与奖励展示）。
- `src/components/game/poem-quiz.tsx`：诗卡答题（资料库/练习两种模式）、反馈和结算。
- `src/lib/game/rules.ts`：永久诗卡评分、诗印、成绩合并、关卡/道具字段的 normalize。

### 内容与存档

- `src/lib/game/content/bank.json`：脚本生成，禁止手改。
- `src/lib/game/save.ts`：PlayerSave schema、数据库读写和 normalize。
- `src/lib/game/save-context.tsx`：登录用户的永久存档上下文。
- `migrations/0001–0005`：永久存档 migration（0005 = `level_stars` + `items`）。

## 3. 状态约束

- 关卡题目由 userId 即时确定性生成：同一玩家同关同题，不同玩家互不相同；不得引入会破坏该不变量的随机源。
- 关卡内一诗一题，关卡之间诗不重叠；修改题序算法必须先通过 `levels.test.ts` 的防重复断言。
- 道具消耗即时落存档；奖励只在拿到新星时发放，不得重复发放。
- 资料库诗卡通关、诗印、最佳分和总分继续写入 PlayerSave；关卡过关分数累加进 `totalScore`。

## 4. 当前验收

### 命令

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

### 手动流程

1. 新用户进入首页，确认主按钮是「继续闯关」且直达第 1 关。
2. 打开 `/levels`，确认只有第 1 关可挑战，其余未解锁。
3. 进入关卡，确认开场说明（10 题、6 题过关、星级、道具）与出处标注。
4. 答错后检查正确答案、出处、相邻诗句和「下一题」收句流程。
5. 全对通关，确认三星、新星道具奖励、下一关解锁与直达。
6. 失败重打，确认题目与上一局完全相同。
7. 刷新页面，确认关卡进度与道具库存不丢；切换资料库、诗库、墨潮试炼和诗册，确认旧入口仍可用。
8. 在 360x800、430x932 和桌面宽屏检查不溢出、不遮挡。

自动化：`scripts/smoke-level-win.mjs` 与 `scripts/smoke-redo.mjs` 覆盖胜利路径与补答道具（需本地 dev server）。

## 5. 后续计划

### P1/P2 计划

- 视试玩结果扩充关卡数（`LEVEL_COUNT` 常量，题池余量充足）。
- 关卡结算的「本关诗句」回顾列表（内容向增强）。
- 星级/道具的账号级统计进诗册（例如总星数展示）。

未实现内容必须先更新设计文档和 changelog，再进入代码。
