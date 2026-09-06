# 唐小诗历险记：工程实施计划

## 1. 实施原则

1. 先稳定数据契约，再改战斗状态机，最后改入口和展示层。
2. 复用现有内容、素材、路由和存档 API，避免无必要的架构重写。
3. 每个阶段都能单独运行和类型检查，避免所有改动堆到最后才发现回归。
4. 新增存档字段必须向后兼容；新客户端能读取旧记录，旧字段语义不改变。

## 2. 现状基线

- 技术栈：Vite 8、TanStack Start/Router、React 19、Tailwind 4。
- 内容：41 个诗人章节、162 个关卡，每关绑定一首诗。
- 主要入口：`src/components/game/home-screen.tsx`、`play-level.tsx`、`story-map.tsx`、`endless-view.tsx`。
- 数据：`PlayerSave` 只有通关、钥匙、成就和无尽最高分。
- 数据库：`migrations/0002_player_saves.sql`，Neon 与 PGLite 共用顶层 migration。
- 当前风险：战斗使用多个延迟回调，容易出现重复点击、结果串线和退出后更新状态。

## 3. 文件责任分工

### 数据与规则

- `src/lib/game/types.ts`：增加 `LevelRecord`、`levelRecords`、`totalScore`，并定义诗签/本局结果类型。
- `src/lib/game/progress.ts`：集中实现评级、分数、历史最佳合并、当前继续关卡、诗印统计。
- `src/lib/game/save.ts`：扩展 Zod validator、数据库行转换、默认值和写入字段。
- `migrations/0003_game_records.sql`：增加 `level_records` JSON 文本和 `total_score` 整数。
- `src/lib/game/content/index.ts`：保持题库读取；需要时增加题目上下文辅助函数。

### 战斗与页面

- `src/components/game/play-level.tsx`：改成显式状态机，承担诗签、连击、诗气、反馈和结算。
- `src/components/game/endless-view.tsx`：复用可共享的战斗反馈/题目组件或同样的状态规则。
- `src/components/game/home-screen.tsx`：计算并跳转继续历险目标，显示真实进度。
- `src/components/game/story-map.tsx`：节点显示诗印、当前节点状态，保留行走。
- `src/components/game/chapter-list.tsx`：章节显示诗印统计。
- `src/components/game/practice-view.tsx`：增加题目进度/轻量完成状态。
- `src/components/game/achievements-view.tsx`：增加全局统计。
- `src/styles.css`：添加连击、诗气、结果和节点状态的少量动画。

## 4. 分阶段任务

### 阶段 A：存档契约和纯规则

**目标：**新增字段不影响现有登录、读取和通关逻辑。

任务：

- 定义 `LevelRecord` 与 `LevelRunResult`。
- 为 `PlayerSave` 增加 `levelRecords`、`totalScore`。
- 增加 `normalizeSave`/迁移逻辑：未知/缺失/非法字段回退默认值。
- 更新 SQL migration、validator、`toSave` 和 write handler。
- 让 `applyLevelWin` 支持本局表现参数并兼容旧调用。
- 提取并测试 `starsForRun`、`mergeLevelRecord`、`applyEndlessRun`。

完成标准：旧格式对象能正常读取；新字段能保存；测试和 typecheck 通过。

### 阶段 B：主线战斗状态机

**目标：**一关从连续点题变成有准备、反馈和结算的短局。

任务：

- 引入 `Phase` 联合类型：`intro/loadout/battle/resolving/outro/result/lose`。
- 将一次答题拆成 `chooseAnswer` 和 `continueAfterResolution`。
- 使用 ref 或统一 cleanup 管理延迟动画；任何过渡只允许当前回合生效。
- 实现三枚诗签及一次性使用规则。
- 实现连击、诗气、连携和分数。
- 在 outro 后显示 result；result 中写入历史最佳。
- 结果按钮支持回地图和再战；再战清理本局所有临时状态。

完成标准：正确和错误都需要玩家点击收句；连续快速点击不会跳题或重复扣血；胜利只写一次存档。

### 阶段 C：入口、地图和无尽

**目标：**玩家始终知道目标，并且重玩有价值。

任务：

- 增加 `nextPlayableLevel`/`nextReplayLevel` 规则。
- 首页主按钮跳转当前目标，显示诗印/总分/连击。
- 地图节点显示 0-3 星和当前可挑战提示，章节页显示总诗印。
- 无尽加入战斗式反馈、连击奖励、错题确认和刷新纪录。

完成标准：新存档可以从首页一键进入第一关；已有进度从首页继续；重战不会破坏解锁。

### 阶段 D：练习、成就和视觉打磨

**目标：**三个模式体验统一但定位清楚。

任务：

- 练习显示 `n / total` 和当前诗文的答题完成状态。
- 成就页显示全局诗印、总分、最高连对。
- 添加紧凑动画和 reduced-motion 处理。
- 检查 360x800、430x932、桌面宽屏布局。

完成标准：文字不溢出、选项不遮挡角色、按钮可用状态清楚。

## 5. 测试计划

### 纯函数测试

至少覆盖：

- 缺失新字段的旧存档默认值。
- 1/2/3 星计算边界。
- 历史最佳星级、分数、连击和次数合并。
- 已通关关卡重战不重复钥匙。
- 无尽纪录刷新和成就触发。
- 继续历险目标选择。

### 手动流程

1. 新用户登录后进入首页，点“继续历险”。
2. 选择三枚诗签中的每一枚，确认一次性能力可用且只能用一次。
3. 答对一题：攻击、连击、诗气和收句按钮正确。
4. 答错一题：正确项、诗句上下文、扣血/护卷和收句正确。
5. 全胜进入结尾对白，再进入结算页；检查星级和历史最佳。
6. 再战提分，确认成绩取最高、钥匙不重复。
7. 无尽答错，先看反馈再进入结束页；刷新纪录提示准确。
8. 刷新页面或重新进入路由，确认存档可读。

### 命令

```bash
npm run typecheck
npm test
npm run lint
npm run build
```

## 6. 风险与处理

| 风险 | 处理 |
| --- | --- |
| PGLite 与 Neon 字段类型不同 | 使用 JSON 文本和统一 `toSave` 规范化，migration 只放顶层 |
| 旧存档缺少字段 | 所有读取入口使用默认值，不直接访问可选字段 |
| 动画延迟造成状态串线 | 回合 token/ref + effect cleanup；结果由显式按钮推进 |
| 题干和选项在小屏被遮挡 | 固定战斗 HUD 区域，选项使用紧凑尺寸，实测两种窄屏 |
| 首页目标无关卡 | 提供无关卡兜底，回到历险入口或最近关卡 |
| 无尽和主线逻辑漂移 | 共用纯规则函数，视觉组件可复用 |

## 7. 交付顺序

1. 先提交设计文档和验收清单。
2. 完成数据契约、migration、纯函数测试。
3. 完成主线战斗状态机并手动跑通一关。
4. 完成首页、地图、章节、无尽。
5. 完成练习/成就和视觉调整。
6. 跑完整命令，检查 diff，只保留与游戏重做有关的文件。
