# 设计记录

产品用词见仓库根目录 [`CONTEXT.md`](../../CONTEXT.md)。这里只记已经落地的取舍。

| 编号 | 结论 | 现状 |
| --- | --- | --- |
| [0001](0001-ship-vertical-web-first.md) | 先做竖屏网页，不先做微信小游戏包 | 有效 |
| [0002](0002-quiz-is-the-battle.md) | 战斗就是答题 | 有效；另有出招/受伤贴图，仍不是动作操控 |
| [0003](0003-chapters-by-poet.md) | 主线按诗人分章 | 有效；当前只有李白章 |
| [0004](0004-one-poem-bank-three-rules.md) | 三种模式共用一份诗文 | 有效；内容在 `src/lib/game/content.ts` |
| [0005](0005-practice-open-story-gates-the-rest.md) | 练习全开，剧情负责解锁 | 有效 |
| [0006](0006-kid-picture-book-not-scholarly-ink.md) | 古风绘本，不用写意水墨 | 有效 |
| [0007](0007-plain-level-names.md) | 直白关卡名；五把钥匙进魔王殿 | 有效 |
| [0008](0008-content-database-save-on-device.md) | 内容进库、存档留设备 | 已被 0009 取代 |
| [0009](0009-game-accounts-studio-access-key.md) | 游戏登录 + 后台密钥 | 登录/存档仍有效；后台部分被 0010 取代 |
| [0010](0010-no-studio-content-ships-in-game.md) | 不做后台，内容打进游戏 | 有效 |
