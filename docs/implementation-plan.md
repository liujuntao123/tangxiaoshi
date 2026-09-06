# 墨潮远征：工程实施与维护计划

> 状态：P0/P1 核心已落地。本文记录当前架构、验收方式和后续计划，不再描述旧关卡/地图实现。

## 1. 当前架构

- 技术栈：Vite 8、TanStack Start/Router、React 19、Tailwind CSS 4。
- 内容：11 个文集、89 章、281 位作者、2147 张诗卡、10735 题。
- 主入口：`home-screen.tsx` → `/tour` → `tour-routes.tsx` → `/play/$poemId`。
- 资料库入口：`/library`（`library-view.tsx`）→ `tour-collections.tsx` → 章节/作者/诗卡；旧 `/tour/$collectionId…` 深链由重定向壳路由转到 `/library`。
- 永久数据：`PlayerSave` 与 `migrations/0001–0004`。
- 远征数据：`src/lib/game/expedition.ts`，浏览器 `localStorage` 单局状态。

## 2. 文件职责

### 远征与答题

- `src/lib/game/expedition.ts`：路线定义、候选池、normalize、localStorage、节点转移、奖励、结局摘要。
- `src/components/game/home-screen.tsx`：远征台和三节点进度。
- `src/components/game/tour-routes.tsx`：三条墨路选择。
- `src/routes/_app/play.$poemId.tsx`：解析 `route/node`，锁定远征节点，保存结算 session。
- `src/components/game/poem-quiz.tsx`：诗签、答题状态机、反馈、诗火和结算。
- `src/lib/game/rules.ts`：永久诗卡评分、诗印、成绩合并和 PlayerSave 规则。

### 内容与存档

- `src/lib/game/content/bank.json`：脚本生成，禁止手改。
- `src/lib/game/save.ts`：PlayerSave schema、数据库读写和 normalize。
- `src/lib/game/save-context.tsx`：登录用户的永久存档上下文。
- `migrations/0001–0004`：永久存档 migration；当前没有远征数据库字段。

## 3. 状态约束

- 远征每局最多 3 节点，诗火初始 3、上限 4。
- 节点路线必须从真实题库生成确定性候选；刷新不会偷偷换当前候选。
- 远征失败后可以重走当前节点或返回路线选择，不能把整个远征永久锁死。
- 远征中产生的诗卡通关、诗印、最佳分和总分继续写入 PlayerSave。
- 不要把 localStorage 远征状态称为账号级存档；若改为云端同步，必须增加 migration、validator、读写和 ADR。

## 4. 当前验收

### 命令

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

### 手动流程

1. 新用户进入首页，确认主按钮是“点亮第一盏诗火”。
2. 进入 `/tour`，确认三条路线各显示真实诗卡、风险和收益。
3. 进入诗卡，确认节点/路线/诗火 HUD、三枚诗签和“收句”流程。
4. 答错后检查诗火反馈、正确项、相邻诗句和主动收句。
5. 完成节点，选择修页奖励并返回 `/tour`，确认奖励出现在下一节点。
6. 完成三节点或失败，确认结局/重试/另选墨路按钮正确。
7. 刷新远征页面，确认 localStorage 状态恢复；切换资料库、诗库、墨潮试炼和诗册，确认旧入口仍可用。
8. 在 360x800、430x932 和桌面宽屏检查不溢出、不遮挡。

## 5. 后续计划

### P1/P2 计划

- 增加 `expedition.ts` 的纯函数测试。
- 评估按用户 ID 的远征同步，解决同一浏览器多账号共享 localStorage 的边界。
- 视试玩结果增加远征结局历史、墨潮试炼里程碑或首幕专属对白。

未实现内容必须先更新设计文档和 changelog，再进入代码。
