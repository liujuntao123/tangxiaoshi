# 墨潮远征：可玩性重构记录

> 状态：**历史记录（已被 ADR-0018 取代，2026-09）**。本文描述的三节点墨路/诗签/诗火骨架已整体移除；
> 当前主线是关卡制远征，现行规范见 [`game-design.md`](game-design.md) 与 [`adr/0018-level-based-expedition.md`](adr/0018-level-based-expedition.md)。

## 为什么重构

上一版已经有诗签、连击、诗气、收句和诗印，但主入口仍像内容目录：玩家只是选择文集/章节/作者/诗卡，题目之间没有路线风险，答题结果也不会改变旅程。此次重构把骨架改成三节点“墨潮远征”。

## 已实现循环

1. 首页远征台提供唯一主目标。
2. `/tour` 展示青灯小径、风雨险滩、无名残卷三条真实路线。
3. 路线从真实 `POEMS` 候选池确定性抽取一张诗卡。
4. 诗卡仍为 5 题，保留诗签、连击、诗气、收句和 60% 及格规则。
5. 远征答题使用诗火作为当前机会灯笼；答对/答错改变反馈与资源。
6. 节点成功后选择续灯、磨墨或听句，奖励影响下一节点。
7. 三节点成功显示诗声复明或带伤归卷；节点失败显示墨潮未退，允许重走或另选墨路。
8. 永久诗卡成绩仍写入原有 `PlayerSave`；远征进行时状态使用 `localStorage`。

## 实现边界

- 远征状态 key：`tangxiaoshi.expedition.v1`。
- 诗火：初始 3，上限 4；答题机会按当前火数计算。
- 青灯小径成功后回复 1 盏诗火。
- 风雨险滩每题正确 +50 分。
- 磨墨只对下一节点首题正确 +100 分；听句只显示下一节点诗文第一行。
- `墨潮未退` 是失败结算语义；失败后节点回到 pending，不会把远征永久标为 failed。
- 远征分数和诗卡资料库分数共享 `poemRecords.bestScore` 与 `totalScore`，当前不区分来源。

## 未实现/不承诺

以下内容仍是后续设计空间，不得写成当前功能：诗签跨节点升级、远征结局次数统计、墨潮试炼 5/10/20 连对里程碑、专属三幕对白、账号级远征同步、按路线独立排行榜。

## 相关文件

- 总设计：[`game-design.md`](game-design.md)
- 实现验收 brief：[`deep-reboot-brief.md`](deep-reboot-brief.md)
- 工程计划：[`implementation-plan.md`](implementation-plan.md)
- 试玩清单：[`playtest-checklist.md`](playtest-checklist.md)
- 当前决策：[`adr/0016-ink-tide-expedition.md`](adr/0016-ink-tide-expedition.md)
