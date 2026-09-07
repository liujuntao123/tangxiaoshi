# Changelog

本文件记录项目的产品、玩法、工程和文档变更。未发布变更统一放在 `[Unreleased]`，发布版本再改为具体版本号。每次修改项目相关内容时，必须同步追加一条记录。

## [Unreleased] - 2026-09-06（开场面板与面板质感微调）

### Changed

- 首页远征牌下移（top 15.5% → 18.5%）并微升标题块，短屏（含 667px 级设备）不再压住「探索中国古诗词之美」副标题；`paper-plate` 底色透明度同步调轻。
- 宣纸面板（speech-panel）中幅 alpha 降至 0.90 并叠加 backdrop-blur：报告/开场/列表纸面隐约透出场景，压不垮背景插画；无边框区文字可读性不受影响。
- 关卡开场面板贴底更近（bottom 1rem → 0.6rem）；无尽模式开场/结算面板整体下坠 1.5dvh，其中开场面板因背景人物恰在脚下，局部垫柔光纸底防穿模。

## [Unreleased] - 2026-09-06（全量页面走查与收口）

### Fixed

- **关卡结算星级显示错误（实锤 bug）**：`seal-pop` 落印动画的 fill-mode 会把 opacity 钉回 1，覆盖了未获得星星的 `opacity-25 grayscale`，导致「两星」文案配三颗亮星；置灰改挂父级 span，动画只管入场。
- 文集列表页卡面过高导致与分页控件重叠：卡面收紧（图 24→20、内边距与间距缩小），`PagedList` 页内容区加 `overflow-y-auto`（移动端隐藏滚动条），内容超预算时区内滚动、绝不盖住翻页钮。

### Changed

- 首页底部导航「墨潮试炼」更名为「无尽模式」，`/endless` 页内标题同步；`CONTEXT.md`、`README.md`、`docs/game-design.md`、`docs/content.md`、`docs/content-rules.md`、`docs/playtest-checklist.md`、ADR-0018 与 ADR 索引同步更名（历史 ADR-0016 保留原文）。
- 首页数据三格与 50 段关卡进度条合并为同一座「远征牌」纸面板（数据 + 墨线 + 下一关提示 + 进度），50 段刻度每 10 关加高一档形成节奏。
- 关卡开场面板大标题改「整装出发」并附三星预览，去除与页头横匾的「第 N 关」重复。
- `PagedList` 短页内容垂直居中（m-auto），章节/作者只剩一两行时不再大片空白贴顶。
- 收句确认时选项退隐更彻底（slip-fade-back 终态 opacity 0.15 → 0.1）；诗卡模式灯笼行收进墨签与题号签同语言；诗卡网格（作者页/诗库）底部墨渐变加深防白字被浅底吃掉；诗库筛选横滑条加右缘淡出蒙版；翻页玉钮禁用态改降饱和而非置灰，质感更协调。
- 新增全量走查脚本 `scripts/capture-ui-audit.mjs`：38 张截图覆盖全部路由与交互状态（含 360px 窄屏复核），并适配选项「甲乙丙丁」序号印的文本匹配。

## [Unreleased] - 2026-09-06（UI 精致化与游戏感走查第二轮）

### Added

- 新增 UI 素材四枚（`scripts/art/ui2.py`，透明背景，走 `docs/art.md` 生图管线）：`title-banner.png` 卷轴横匾、`lock.png` 铜锁、`seal-blank.png` 空白朱砂印框、`branch-plum.png` 梅枝角饰；另加翻页玉钮 `page-prev.png` / `page-next.png`（同日第二批）。
- 新增 UI 走查截图脚本 `scripts/capture-ui-round.mjs`：注册新玩家后按路由与交互状态（答题/报告/结算/引导语/设置弹窗）一次性采集 20 张竖屏截图，供子代理评审与回归对照。
- 设计系统新令牌（`src/styles.css`）：`hud-banner`（页题横匾，缺图回退纸纹底）、`question-plate`（题干宣纸笺）、`paper-plate`/`paper-plate-ink`（场景页数据纸座）、`ink-divider`（渐隐墨线分隔）、`pip-current`（纸座进度条当前关呼吸）、`stat-grid`（碑刻数据格列间细分隔）。

### Changed

- 二级页标题统一 `hud-banner` 卷轴横匾（`StageHud`），替代裸文字标题；跨页标题字阶与位置自此一致。
- 答题题干托底全面换为宣纸笺（关卡/诗卡/墨潮三处同款）：出处小字移入笺内，浅色场景上不再有对比度问题；选项木牍增加甲乙丙丁朱砂序号印。
- 主按钮牌匾字色改暖白 + 墨影（走查：墨字压墨匾对比不足、发闷）。
- 首页数据格与 50 段进度条合并为两座纸面板，墨字 + 列间细分隔；进度条当前关用 `pip-current` 呼吸；诗册顶部统计与首页同语言（`paper-plate`）。
- 关卡列表卡：锁定卡不再整卡置灰（保留纸面板底色、内容降饱和 + 铜锁图标），可挑战卡显示空心星槽 + 「可挑战」徽记；每页 15 → 12 张以适配加高后的卡面，消除与分页控件的重叠。
- 关卡结算：过关时右上角以 `stamp-in` 斜盖「通」字朱砂印；结算/开场/诗卡结算面板内用 `ink-divider` 分节；开场面板加三星预览。
- 墨潮试炼：开场面板加墨线分隔与底部规则纸签；局内题干换纸笺、唐小诗立绘上移避开选项区、连对/得分数字用松绿/鎏金淡色计读。
- 诗卡模式：连击 HUD 收敛为左上角小印签（连击为 0 且连携未就绪时不占位）。
- 登录页：表单面板加墨线分隔，左上角加梅枝角饰；`paper-input` 输入框底色改暖米调；设置弹窗加梅枝角饰与墨线分隔。
- `scripts/art/lib.py` Provider 链切换为 2026-09-05 实测口径（image.mlgb7.com → qkmss.com → chat2api.smarttoken.top），并对前两家追加 `response_format:"url"`；edits 端点在新链路无已验证通道，`heroes.py` 沿用 PIL 派生降级。

### Docs

- `docs/art.md`：Provider 表更新为新链路，补 `ui2.py` 四枚素材与横匾裁带后处理说明，落盘路径补 `public/ui/`。
- `docs/game-design.md`：视觉标准补页题横匾、结算朱砂印、纸座数据格、锁定卡新处理等走查固化规则。

## [Unreleased] - 2026-09-06（关卡制远征）

### Added

- 关卡制远征主线（ADR-0018，取代三节点墨路）：50 个平铺关卡、顺序解锁、每关 10 题答对 6 题过关；星级按答错数（零错三星 / ≤2 错两星 / 其余一星）。
  - 出题算法（`src/lib/game/levels.ts`，纯函数）：种子由 userId 派生（FNV-1a → mulberry32），全库 2147 首诗确定性洗牌后按每关 13 首（10 正式 + 3 备用）切段——同一玩家每关题目永远固定、不同玩家互不相同（防透题），关卡内一诗一题、关卡之间诗不重复（50 关共 650 首 < 2147 首）。
  - 道具系统（持久库存 `PlayerSave.items`）：去伪（隐两个错项）/ 补答（答错换备用题补位，每关最多 3 次）/ 双倍（下次答对翻倍），使用即时扣减落存档；奖励口径一句话——每拿到一颗新星奖 1 个随机道具（种子 = 玩家+关卡+星档，结果固定）。
  - 新页面：`/levels` 关卡列表（50 卡：关号/星级/解锁态）与 `/levels/$levelId` 关卡答题场（开场规则说明、出处标注、答错不淘汰、十格对错进度点、过关直达下一关）。
  - 首页改版：主按钮「继续闯关」直达下一关（全部通关变「挑战满星」），50 段进度条 + 已通关/星星/总分。
- 单元测试：`src/lib/game/levels.test.ts`（出题确定性、防透题、关卡零重复、星级、道具奖励发放、解锁规则）；`npm test` 73 项全绿。
- E2E 冒烟脚本：`scripts/smoke-level-win.mjs`（注册 → 用真实引擎算题全对通关 → 验证三星/道具奖励/下一关解锁/首页进度）、`scripts/smoke-redo.mjs`（补答道具全流程）。
- 数据库迁移 `migrations/0005_level_progress.sql`：`player_saves` 新增 `level_stars`、`items`（JSON 文本列，Neon 与 PGLite 兼容）。

### Changed

- 首页主按钮「继续闯关」改为进入 `/levels` 关卡列表选关（不再直达单关）；移除点击无反馈的「全部关卡」文字链。同步 `CONTEXT.md`、`README.md`、`docs/game-design.md` 与 ADR-0018。
- 关卡列表瘦身：每页 12 → 9 张卡（3×3），移除「每关 10 道题…」「过关开下一关…」两处说明文案（规则由关卡开场面板承载），顶部只留已通关数与星星数两枚数据签。
- 分页控件升级为游戏 UI 玉钮（`page-prev/next.png` 玉盘箭头，缺图回退字衬 ‹ ›），禁用态置灰，`PagedList` 全站生效。
- 首页关卡进度条下移（top 28% → 31%），与数据座、主角的纵向节奏更均衡。
- `ui2.py` 素材校验兼容 compress.py 量化后的 P 模式 PNG，避免重复生图。
- 存档契约扩展：`PlayerSave` 新增 `levelStars`（每关历史最佳星级）与 `items`（道具库存），`normalizeSave`/validator/读写 SQL 同步；旧存档缺字段按空值兜底。
- 诗卡答题（资料库 `/play/$poemId`）与练习（`/practice/$poemId`）拆分为独立路由，`poem-quiz.tsx` 收敛为两种模式；练习的「先看答案」与诗卡的灯笼/诗印规则不变。

### Removed

- 整体移除三节点墨路远征（不做兼容）：`expedition.ts`（诗火/墨路/修页奖励/结局/localStorage `tangxiaoshi.expedition.v1`）、`tour-routes.tsx`、`/tour` 全部路由、诗签（明心/护卷/回响）与开局诗签选择、`pickContinueTarget`。
- 资料库组件更名：`tour-author(s)/tour-chapters/tour-collections` → `library-*`（仍服务 `/library`）；`GAME_BACKGROUNDS.tour` → `.levels`。

### Docs

- 新增 `docs/adr/0018-level-based-expedition.md`；ADR 索引中 0016/0017 标记被取代。
- 重写 `docs/game-design.md`（关卡制总案）、`CONTEXT.md`（新核心词汇：关卡/题库池/玩家专属题序/星星/道具）、`README.md`（玩法与存档说明）、`docs/playtest-checklist.md`（关卡制试玩清单）、`docs/content.md`（玩法读取关系与文件清单）。
- `docs/deep-reboot-brief.md` 顶部标注已被 ADR-0018 取代，仅作历史记录。
- 根 `AGENTS.md` 第 1/3/4 节同步：当前产品事实、存档边界（关卡星星/道具入库）、玩法红线（不回植旧隐喻）。

### Changed（子代理双审查修复）

- UI 文案审查（子代理 #1）修复：
  - 道具「去伪」更名「排除」（显示名，机制不变）；关卡开场说明写全每个道具的用途（移动端无 hover）。
  - 移除诗卡答题的「诗气」进度条（纯视觉、无机制作用，制造虚假预期）；HUD 改为连击 + 连携就绪提示。
  - 诗卡模式补规则说明一行：「5 道题 · 答对 3 题通关 · 灯笼灭完本轮结束」，灯笼加文字标签；答错显示「还剩 N 盏」；失败结算写明过关线差几题。
  - 「连携出手！诗韵加倍」改为与数值一致的「连携出手！额外 +100 分」；推进按钮统一为「下一题 / 看结果」（弃用内部术语「收句」，机制保留：仍须主动确认，AGENTS.md/CONTEXT.md/game-design.md/playtest-checklist 同步）。
  - 关卡答错报告标题改「答错了」并前置「正确答案：」；「新星奖励」改「星星奖励」；「双倍·已备」改「双倍·已就绪」；星级规则改等式写法；三处「题目专属」措辞统一；首页通关文案去文言腔；library-view 过期入口指引改「继续闯关」。
  - 修复题面泄露：诗名题（出自哪一首）不再在题面上方显示出处标注（来源移到作答后的报告层）。
- 一致性审查（子代理 #2）确认 7 条核心声明全部与代码一致；顺手清理：死 CSS（`.talisman-lift`、`wash-fade`）、过时走查脚本 `scripts/ui-review/`（引用已废弃的 /tour 与 localStorage 键）。

### 验收

- `typecheck` / `lint` / `npm test`（73 项）/ `npm run build` 全绿；内容管线（build-bank / validate_content / export_story_docs）通过（2147 诗 10735 题不变）。
- Playwright 实测（dev 8081）：注册 → 首页直达第 1 关 → 关卡列表 → 开场说明 → 答题/答错报告 → 失败结算与再试；全对通关三星 + 新星道具 + 下一关解锁直达；补答换题后计数回退；诗库练习与资料库路径回归通过，无控制台错误。

## [Unreleased] - 2026-09-06（表现层打磨）

### Changed

- 诗名变体归一（内容层）：build-bank.py 编译期把「A / B」别名题名统一取第一段（68 首受影响），诗名题选项不再出现歧义双题名；重跑内容管线全绿，题量不变。
- 首页改版：主标题《唐小诗环游记》+ 副标题「探索中国古诗词之美」；数据展示游戏化——新增生图接口生成的透明背景 Q 版古风 icon（卷轴=已通关、金星的星=星星、铜钱=总分），接入首页数据格、关卡列表汇总与星标、关卡结算星星。
- 闯关场（level-quiz）：唐小诗从左侧改为靠上居中；开场说明与结算文案精简（移除「题目专为你出」类冗余说明）。
- 分页交互统一：关卡列表、诗集资料库文集网格、章节列表、作者列表全部改为左右按钮分页（PagedList），替换竖向滚动；截图验证无溢出。
- 文集诗卡答题（poem-quiz）：唐小诗与作者双人位上移（bottom 38%→42%），与题卡间距更舒适。

### Assets

- `public/ui/icon-star.png`、`icon-scroll.png`、`icon-coin.png`：gpt-image-2 透明背景生成的 Q 版古风游戏图标。

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
