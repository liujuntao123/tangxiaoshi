# 项目协作与文档维护规范

## 1. 当前产品事实

项目是竖屏 Web 古诗文游戏《唐小诗环游记》。当前主线版本是“墨潮远征”（关卡制）：首页是远征台，`/levels` 是关卡列表，`/levels/$levelId` 是关卡答题场（每关 10 题、答对 6 题过关、星星与道具奖励、每 10 关一个学段难度档）；`/play/$poemId` 是资料库诗卡答题（5 题 + 诗印）。当前玩法事实以 `CONTEXT.md`、`docs/game-design.md`、`docs/adr/0018-level-based-expedition.md`、`docs/adr/0020-level-difficulty-tiers.md` 和代码为准。

旧的“朝代 → 诗人 → 关卡 / 地图 / 妖怪 / 钥匙”只允许出现在历史 ADR 的背景说明中，不得作为新功能设计依据。旧的三节点墨路 / 诗签 / 修页奖励 / 诗火远征已整体移除（ADR-0016/0017 被 ADR-0018 取代），不得回植。

## 2. 文档同步铁律

修改下列任一项目事实时，必须在同一变更中同步文档：

- 主循环、关卡结构、题序算法、道具、星级或入口命名：更新 `README.md`、`CONTEXT.md`、对应 `docs/*.md`，必要时新增/更新 ADR。
- 存档字段、迁移、持久化边界：更新 `docs/content.md`、ADR、README 技术说明和 `changelog.md`。
- 内容层级、题型、引导语或编译流程：更新 `docs/content.md`、`docs/content-rules.md`、`docs/story/INDEX.md`（后者由脚本生成，禁止手改）。
- 素材路径、风格或生成流程：更新 `docs/art.md` 和相关脚本说明。
- 每一次面向用户或开发者的项目修改都要在根目录 `changelog.md` 留一条记录，写明日期、Added/Changed/Fixed/Docs 中实际发生的内容。

文档不能把“计划”写成“已实现”。设计文档中的未实现项目必须标注 `计划` 或 `未实现`；代码注释引用的设计文档必须存在并与代码边界一致。

## 3. 数据与存档边界

- 内容唯一源是 `data/poetry-site/`，手写命名/引导语/意象在 `scripts/content/catalog.py`。
- 内容改动必须运行：

  ```bash
  python3 scripts/content/build-bank.py
  python3 scripts/content/validate_content.py
  python3 scripts/content/export_story_docs.py
  ```

- `PlayerSave` 是按用户 ID 保存的永久成绩：诗卡通关、诗印、最佳分、总分、成就、作者遇见记录、墨潮试炼纪录、关卡星星（`levelStars`）和道具库存（`items`，migration `0005_level_progress.sql`）。
- 关卡没有独立的「进行时」状态：题目由 userId 即时确定性生成，进度只落在 `PlayerSave`，刷新、换设备都不丢。
- 客户端状态必须有 normalize、`try/catch` 和无存储能力时的降级路径。
- 新的数据库结构化字段必须使用有序 SQL migration；Neon 与 PGLite 必须兼容。

## 4. 当前玩法红线

- 保持古风 Q 版绘本、短局答题、作答后必须主动确认才推进（按钮直白：下一题/看结果）、可读错题反馈。
- 不恢复妖怪、血条、攻击/受击帧、钥匙门控、旧地图解锁、排行榜压迫或付费/抽卡系统。
- 关卡系统保持直白：平铺关号 + 学段难度档（每 10 关一档，标签只用学段词，难度规则唯一权威在 `docs/content-rules.md`，ADR-0020）、道具名称即用途；不把「墨路」「诗签」「修页奖励」这类旧隐喻加回来，不造抽象难度数值/动态难度，也不把道具扩展成复杂装备树。
- 旧作者/文集/朝代页面仍是资料库和收集内容，不应重新成为主线入口。

## 5. 验收命令

常规代码修改至少运行：

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

内容修改还要运行内容管线。文档修改至少检查链接、命令、文件路径和代码事实；不要把 `node_modules/` 文档当作项目文档维护。

## 6. 任务收尾：提交推送与 Docker 更新

一次完整任务（代码、内容或文档）完成并通过第 5 节验收后，必须在同一任务内完成收尾三步，不要留到下一次：

1. 提交并推送（`main` 分支，提交信息用中文概括实际变更）：

   ```bash
   git add -A && git commit -m "…" && git push
   ```

2. 重建自托管镜像并更新容器（宿主机构建 nitro 产物 → 打包镜像 → 重建容器，流程见 `deploy/build-image.sh`）：

   ```bash
   bash deploy/build-image.sh
   docker compose -f deploy/docker-compose.yml up -d
   ```

3. 验证：`curl -fsS http://127.0.0.1:8090/login` 返回 200、容器 `tangxiaoshi-game` 状态 `Up`；对外入口是 Cloudflare 隧道子域 `grok-txs.aizhi.site`。

红线：`deploy/data/`（PGLite 生产存档）与 `deploy/.env` 不得提交进仓库，一次性数据库备份目录（`deploy/data.bak-*`）同样不入库；更新容器只重建镜像、重启进程，不删改数据目录。
