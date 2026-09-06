# Changelog

本文件记录项目的产品、玩法、工程和文档变更。未发布变更统一放在 `[Unreleased]`，发布版本再改为具体版本号。每次修改项目相关内容时，必须同步追加一条记录。

## [Unreleased] - 2026-09-07

### Changed

- 游戏「游戏感 + 精致度」全面升级（Gemini 3.8 双向审查 + 三批实施，玩法/命名/存档零变更）：
  - **动效设计系统**（`src/styles.css`）：新增缓动令牌（`--ease-ink/wood/stamp/sway`）与诗火语义色令牌（`--color-fire/fire-glow`）；23 个共享动效/工艺类（`ink-in` 墨染入场、`slip-in` 铺简错峰、`sheet-up` 纸笺托出、`stamp-in` 顿章、`seal-pop` 升级为朱砂落印仪式、`lamp-out/in` 诗火熄灭/重燃、`wash-fade` 明心涤墨、`bow` 守卷人欠身、`scenery-plate` 亮景托底、`paper-input` 宣纸输入槽、`ui-panel-compact` 紧凑 9-slice 面板、`tap-deep` 木质重按等）；清理旧动作战斗死代码（`pose-lunge/pose-recoil/hit-flash/fly-right/fly-left`、无调用的 `stage-shake`）；全部新动效受 `prefers-reduced-motion` 降级。
  - **答题主链路**（`poem-quiz.tsx` / `endless-view.tsx`）：收句不再硬切——题区淡出退为背景、报告纸笺自底部托出；报告层展示完整诗联（`Resolution` 新增 `prompt`/`questionType` 快照字段）；诗火灯笼熄灭/重燃动效（`hp-pips.tsx`）；玉印对勾改顿章；诗气槽改墨槽工艺 + 连携就绪呼吸 + 连击朱砂涟漪；诗签选中上浮、未选中徽章材质化；明心隐项改水墨涤淡；结算诗印 160ms 错峰落印；飘分从被点选项上方升腾；守卷人答对欠身致意。
  - **音效与触感**（`sfx.ts`）：8-bit 方波全量替换为低通滤波的水墨音色（木笏轻叩/玉磬/轻叹/三连上行），新增 `sfxStamp` 顿章声；关键节点加克制微触觉（作答 12ms、灭灯 35ms、落印三段），全部可选链 + try/catch 兜底。
  - **布局/配色/一致性**：诗库三轴筛选墙改三行横向滑动条、诗卡九宫格回归首屏（P0）；题干与问句加多行安全墨纱信笺托底，任何场景插画上可读（P0）；首页统计入深墨托底、「火」徽章纠正为朱砂语义（P0）；墨路起始页裸字提示入胶囊（P0）；答题选项 `gap-0`→`gap-2` 消除玉环粘连（P0）；登录主次按钮层级纠正、输入框宣纸凹槽化；墨路页顶部三层 HUD 收拢为两行；资料库双胶囊压顶消解、文集网格换紧凑轻面板；翻页器弃用镜像返回键改玉环圆钮；诗册统计框方角化与圆 Tab 形成方圆对比；墨潮试炼开局立绘入场；首页顶部孤立灯笼移除。
  - **验收**：`typecheck`/`lint`/`npm test`（59/59）/`npm run build` 全绿；真实玩家路径 13 屏 + 深度状态 17 屏（收句对错反馈、明心隐项、通关修页奖励、试炼报告/终局）截图前后对比通过（`scripts/ui-review/shoot.mjs`、新增 `scripts/ui-review/shoot-more.mjs`，基线存 `screenshots/round-0*`、改版存 `screenshots/round-1*`）。
- 入口拆分（ADR-0017，用户走查 2026-09「文集与继续远征纠缠/重复」）：远征与文集分家，主线只保留首页「继续远征」一个入口。
  - 新增 `/library` 诗集资料库页（`library-view.tsx`）：文集 → 章节 → 作者 → 诗卡层级整体从 `/tour` 迁出；首页底部「文集」直达 `/library`。
  - `/tour` 只留墨路选择：删除 `?view=library` 视图切换与页内文集网格；当前节点已领诗卡时页首新增「续修本页 · 《诗名》」快捷，从首页绕到择路页也能一键回到原诗卡。
  - 首页主按钮标签诚实化：未择墨路时显示「去择墨路」（原文案「继续远征」落到择路页，被误读为「点了不跳转」）；已择墨路仍是「继续远征」直达答题页。
  - 旧深链 `/tour/$collectionId(/$chapterId(/$authorId))` 保留为壳路由重定向到 `/library` 对应层级，旧书签不断链。
  - `MissingCard` 降级页引导从「去环游」改为「去文集」（`/library`）；资料库各层返回目标同步更新。
  - 走查复测：六种远征状态（无远征/已点亮未择路/已择路/中盘/收官/陈旧诗卡 id）下首页主按钮均正确落地（`scripts/ui-review/repro-matrix.mjs`）；16 项端到端检查全过——新手开局、续修直达、中盘「去择墨路」、「续修本页」快捷、文集四层浏览、旧深链重定向（`scripts/ui-review/verify-entries.mjs`），dev 与自托管生产容器均已验证。
- 游戏 UI 走查改版（玩法与命名不变，只动视觉与排版）：
  - 修复 `ArtPanel` 布局类落在 border-image 外壳上的缺陷——作者/章节/成就行卡的 flex 失效导致「头像下面一行字、右侧整片空白」；现在布局类作用于内容层。
  - 作者、章节、诗册成就行卡改为横向任务卡：玉环头像框/图槽 + 标题 + 通关/诗印进度条（`meter`）+ 进入箭头，列表卡 `rise-in` 错峰入场。
  - 墨路三候选升级为路线任务卡：灯金/雨峡青/暮山紫类别色脊、单字徽章（灯/澜/卷）、同色 tag 与收益 pill、右端「启程」CTA；起手面板垂直居中并加灯笼徽饰。
  - 首页与墨路的旅程节点改为 `jdot` 墨座圆点 + 连接线（完成朱印 / 当前呼吸 / 失败沉墨），浅色天空背景上清晰可读。
  - 诗集资料库文集卡加圆形图槽与「N 首 · N 章」计数 chip；墨潮试炼 idle/结算面板垂直居中并加灯笼徽饰。
- 对比度修复（浅底白字清零）：诗库筛选 chips 改深字深边/实心松绿选中态；「选一章开始」「《花间集》的作者」「N 首诗」「诗集资料库」等场景说明文字统一 `caption-pill` 深墨胶囊；诗册统计改深墨小座；诗卡网格诗印空槽加深墨底、文集角标加深底、题干与「先看答案」补 `paper-glow`/`ink-chip`；诗册筛选 pills 加底色。
- 面板与列表留白冗余（走查二轮）：全部列表滚动容器左右边距 `px-4`→`px-5`、底部安全距 `1.2–1.4rem`→`1.6rem`；`ArtPanel` 内容层左右内边距 `px-3`→`px-4`（内容不贴 border-image 框）；分页器距底 `pb-3`→`pb-4`；作者诗卡网格容器 `inset-x-4`/底距 `1rem`→`inset-x-5`/`1.5rem`；诗集资料库网格列间距 `gap-3`→`gap-4`。
- `src/styles.css` 新增 UI 令牌与基元：路线类别色（`lamp/storm/dusk`）、`caption-pill`、`medal`、`art-slot`、`meter`、`jdot`、`rise-in`；`stage.tsx` 新增 `PanelCaption`、`PortraitMedal`、`ArtSlot`、`RowChevron`。
- 设计文档 `docs/game-design.md` §9 固化上述卡片语言与对比度红线。

### Fixed

- 修复设置弹窗关闭/退出登录按钮无反应：弹窗渲染在 `StageHud` 的 `pointer-events-none` 头部内且遮罩层未声明 `pointer-events-auto`，整个弹窗继承了 `pointer-events: none`，点击全部穿透到下层页面（设置入口按钮自身带 `pointer-events-auto` 所以能正常打开弹窗）。给遮罩层补 `pointer-events-auto` 后，点遮罩关闭、关闭按钮、退出登录全部恢复响应。
- 修复「继续远征」跳转逻辑（用户走查 2026-09）：主按钮此前无条件去 `/tour`，即使当前节点已择墨路，玩家也要在墨路选择页重选一遍才能回到答题页——「继续远征」并不真的"继续"，且与 `/tour` 页面里的诗集资料库入口搅在一起。
  - 现在的语义：当前节点已择墨路 → 「继续远征」直达 `/play/$poemId?route=&node=` 续修本页（实测 ~0.2s 直达）；未择墨路 → `/tour` 择路（游戏必需步骤）。首页说明文字同步改为「续修本页：青灯小径《诗名》」。
  - `/tour` 视图完全改为 URL 驱动：`?view=library` = 诗集资料库、无参数 = 墨路选择，页内「返回墨路选择 / 打开资料库」同步写回 search，移除只在挂载时生效的 `initialView` 内部状态，墨路选择与文集浏览不再共享可变状态。
  - 端到端验证：新用户点亮第一盏诗火 → 择路 → 答题；中途离开后首页「继续远征」直达原答题页；文集视图进出与 URL 一致。
- 性能加固（配合上述逻辑修复）：登录/注册提交时后台预热题库 chunk；`__root` 新增 `BootVeil` 水合遮罩（SSR 可见、水合后淡出，整页加载时把不可点击的空窗变成诚实加载态）；nitro 开启 `compressPublicAssets` 预压缩（题库 JS 传输 ~4.6MB → ~1.1MB）。
- 修复 Google Fonts 样式表阻塞水合的隐患（实测复现）：`<head>` 里的字体 `<link rel=stylesheet>` 在字体服务被墙/慢网络下长时间挂起时，按浏览器语义会卡住后续全部脚本执行——实测挂起 75s 页面仍不水合、整页可看不可点。改为水合完成后 JS 异步注入字体样式表（display=swap），永不阻塞脚本；无法访问字体服务的环境回退系统字体，应用完全可用。
  - 排查备注：路由组件级代码分割（懒加载路由）已尝试并回退——TanStack Start 插件 + Rolldown SSR 构建下，应用内任何路由级动态 import 都会生成悬空 `ssr_exports` facade 导致全站 500，待上游修复后再做。
- 4x CPU 节流 + 限速网络实测（生产构建）：登录后首页 ~0.8s 可交互；点击点亮第一盏诗火→墨路画面 ~0.4s；开始远征→路线卡 ~0.17s；首页→诗库/诗册/试炼 0.4–0.9s（首次含 chunk 加载）。

### Docs

- `AGENTS.md` 新增「任务收尾」约定（§6）：一次完整任务通过验收后必须同一任务内提交推送（`main`），并用 `deploy/build-image.sh` + `deploy/docker-compose.yml` 重建自托管镜像、更新容器，验证 `127.0.0.1:8090` 与隧道子域 `grok-txs.aizhi.site`；同时 `.gitignore` 补充忽略一次性数据库备份 `deploy/data.bak-*/`。

### Verification

- `npm run typecheck`、`npm run lint`、`npm test`（src 59 通过）、`npm run build` 全部通过。
- 390x844 移动视口全页面截图走查（首页 / 墨路 / 资料库 / 章节 / 作者 / 作者诗卡 / 答题 / 诗库 / 墨潮试炼 / 诗册）。

## [Unreleased] - 2026-09-06

### Added

- 新增“墨潮远征”设计与实现基准：`docs/deep-reboot-brief.md`。
- 新增远征状态模块 `src/lib/game/expedition.ts`：三节点、青灯小径/风雨险滩/无名残卷、诗火、修页奖励和结局。
- `/tour` 新增三条真实诗卡墨路选择；完成节点后可选择续灯、磨墨或听句。
- 首页改为墨潮远征台，答题页增加节点、路线、诗火和墨潮反馈。
- 新增项目协作与文档同步规范 `AGENTS.md`，并解除 `.gitignore` 对它的忽略，使规范随仓库交付。
- 新增 ADR-0016，记录墨潮远征的实际实现边界。

### Changed

- 入口名称更新：练习 → 诗库，无尽 → 墨潮试炼，成就 → 诗册；文集浏览降级为诗集资料库。
- 远征答题结果改为“诗页补回一行”与“墨潮抹去一盏诗火”等世界观反馈。
- 远征进行时状态存储在浏览器 `localStorage` 的 `tangxiaoshi.expedition.v1`；永久成绩仍写入按用户 ID 的 `PlayerSave`。
- README、CONTEXT、游戏设计、实施计划、试玩清单、内容文档和 ADR 索引统一到墨潮远征口径。

### Fixed

- 修复远征节点完成后结算面板因 `nodeIndex` 推进而丢失远征上下文的问题。
- 修复远征失败结算没有记录实际错题数的问题。

### Verification

- `npm run typecheck` 通过。
- `npm run build` 通过。
- 游戏规则测试通过；完整测试中的环境夹具问题另见本次交付说明。
