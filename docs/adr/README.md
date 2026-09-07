# 设计记录

产品用词见仓库根目录 [`CONTEXT.md`](../../CONTEXT.md)。这里只记已经落地的取舍；当前协作和文档同步规则见 [`../../AGENTS.md`](../../AGENTS.md)。内容组织见 [`../content.md`](../content.md)，内容生产规则见 [`../content-rules.md`](../content-rules.md)，生图规范见 [`../art.md`](../art.md)，剧情总表见 [`../story/INDEX.md`](../story/INDEX.md)。

| 编号 | 结论 | 现状 |
| --- | --- | --- |
| [0001](0001-ship-vertical-web-first.md) | 先做竖屏网页，不先做微信小游戏包 | 有效 |
| [0002](0002-quiz-is-the-battle.md) | 答题是核心互动 | 内核有效；妖怪/血条/出招包装不属于当前实现 |
| [0003](0003-chapters-by-poet.md) | 主线按诗人分章，上有朝代层 | 被 [0011](0011-collection-chapter-author-cards.md) 取代 |
| [0004](0004-one-poem-bank-three-rules.md) | 三种内容入口共用一份诗文 | 有效；远征、资料库、诗库、无尽模式共用 bank |
| [0005](0005-practice-open-story-gates-the-rest.md) | 练习全开，剧情负责解锁 | 练习全开有效；主线门控被 0011 取代 |
| [0006](0006-kid-picture-book-not-scholarly-ink.md) | 古风绘本，不用写意水墨 | 有效；细节见 [0012](0012-per-collection-backgrounds-avatars.md) |
| [0007](0007-plain-level-names.md) | 直白关卡名；钥匙按章算 | 被 0011 取代 |
| [0008](0008-content-database-save-on-device.md) | 内容进库、存档留设备 | 已被 0009 取代 |
| [0009](0009-game-accounts-studio-access-key.md) | 游戏登录 + 后台密钥 | 登录/永久存档仍有效；后台被 0010 取代 |
| [0010](0010-no-studio-content-ships-in-game.md) | 不做后台，内容随版本发布 | 有效 |
| [0011](0011-collection-chapter-author-cards.md) | 文集→章节→作者→诗卡，资料卡片式，全开放 | 内容层级有效；入口经 0016 改墨路选择、0017 迁至 `/library` |
| [0012](0012-per-collection-backgrounds-avatars.md) | 每文集 5 张专属背景 + 各维度形象 | 有效 |
| [0013](0013-three-achievement-kinds.md) | 成就三类（文集/作者/朝代），全通制 | 有效；入口现称诗册 |
| [0014](0014-all-collections-open-simplified.md) | 11 个文集一次性开放 + 源数据统一简体 | 有效 |
| [0015](0015-poem-card-gameplay.md) | 诗签/连击/收句/诗印落到诗卡 | 诗卡规则有效；诗签被 [0018](0018-level-based-expedition.md) 移除，诗印仍用于资料库诗卡 |
| [0016](0016-ink-tide-expedition.md) | 墨潮远征三节点、三路线、诗火、修页奖励 | 被 [0018](0018-level-based-expedition.md) 取代 |
| [0017](0017-expedition-library-entry-split.md) | 远征与文集分家：`/tour` 只留墨路，文集迁 `/library`，旧路径重定向 | `/library` 分家有效；`/tour` 已被 [0018](0018-level-based-expedition.md) 的 `/levels` 取代 |
| [0018](0018-level-based-expedition.md) | 关卡制远征：50 关平铺、每关 10 题、玩家专属题序、道具奖励 | 当前主线有效；「无难度维度」条款被 [0020](0020-level-difficulty-tiers.md) 修订 |
| [0019](0019-endless-leaderboard.md) | 无尽排行榜：纪录向无压迫、从 `player_saves` 派生、连对/得分双榜并列同名次 | 有效 |
| [0020](0020-level-difficulty-tiers.md) | 学段难度分档：每 10 关一档（小学·低 → 高中）、编译期定档、档内篇幅循序渐进 | 有效 |

旧 ADR 不删除，因为它们记录历史取舍；新功能只能依据“有效”且未被取代的条款。