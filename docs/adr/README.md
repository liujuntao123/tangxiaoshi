# 设计记录

产品用词见仓库根目录 [`CONTEXT.md`](../../CONTEXT.md)。这里只记已经落地的取舍。
内容组织见 [`../content.md`](../content.md)，内容生产规则见 [`../content-rules.md`](../content-rules.md)，生图规范见 [`../art.md`](../art.md)，剧情总表见 [`../story/INDEX.md`](../story/INDEX.md)。

| 编号 | 结论 | 现状 |
| --- | --- | --- |
| [0001](0001-ship-vertical-web-first.md) | 先做竖屏网页，不先做微信小游戏包 | 有效 |
| [0002](0002-quiz-is-the-battle.md) | 战斗就是答题 | 内核有效；战斗包装（妖怪/血条/出招）已被 0011/0013 废除 |
| [0003](0003-chapters-by-poet.md) | 主线按诗人分章，上有朝代层 | 被 [0011](0011-collection-chapter-author-cards.md) 取代 |
| [0004](0004-one-poem-bank-three-rules.md) | 三种模式共用一份诗文 | 有效；内容在 `src/lib/game/content/bank.json` |
| [0005](0005-practice-open-story-gates-the-rest.md) | 练习全开，剧情负责解锁 | 练习全开仍有效；解锁门控被 0011 的全开放取代 |
| [0006](0006-kid-picture-book-not-scholarly-ink.md) | 古风绘本，不用写意水墨 | 有效；实现细节被 [0012](0012-per-collection-backgrounds-avatars.md) 更新 |
| [0007](0007-plain-level-names.md) | 直白关卡名；钥匙按章算 | 被 0011 取代（关卡/钥匙概念废除） |
| [0008](0008-content-database-save-on-device.md) | 内容进库、存档留设备 | 已被 0009 取代 |
| [0009](0009-game-accounts-studio-access-key.md) | 游戏登录 + 后台密钥 | 登录/存档仍有效；后台部分被 0010 取代 |
| [0010](0010-no-studio-content-ships-in-game.md) | 不做后台，内容打进游戏 | 有效 |
| [0011](0011-collection-chapter-author-cards.md) | 文集→章节→作者→诗卡，卡片式，全开放 | 有效 |
| [0012](0012-per-collection-backgrounds-avatars.md) | 每文集 5 张专属背景 + 各维度形象 | 有效 |
| [0013](0013-three-achievement-kinds.md) | 成就三类（文集/作者/朝代），全通制 | 有效 |
| [0014](0014-all-collections-open-simplified.md) | 11 个文集一次性开放 + 源数据统一简体 | 有效 |
| [0015](0015-poem-card-gameplay.md) | 玩法重做落到诗卡：诗签/连击/收句/诗印 | 有效 |
