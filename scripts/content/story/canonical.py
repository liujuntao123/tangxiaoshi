"""Public-domain kid poems that chinese-poetry does not carry.

The compiler merges these into the bank first so story chapters can
cite 咏鹅 / 七步诗 / 汉乐府 / 陶渊明 / 小儿垂钓. Source note is
「蒙学补」, not a fake anthology file.
"""

CANONICAL = [
    {
        "title": "咏鹅",
        "author": "骆宾王",
        "paragraphs": ["鹅鹅鹅，曲项向天歌。", "白毛浮绿水，红掌拨清波。"],
        "form": "五言",
        "source": "蒙学补",
        "dynastyId": "tang",
    },
    {
        "title": "小儿垂钓",
        "author": "胡令能",
        "paragraphs": ["蓬头稚子学垂纶，侧坐莓苔草映身。", "路人借问遥招手，怕得鱼惊不应人。"],
        "form": "七言",
        "source": "蒙学补",
        "dynastyId": "tang",
    },
    {
        "title": "七步诗",
        "author": "曹植",
        "paragraphs": ["煮豆燃豆萁，豆在釜中泣。", "本是同根生，相煎何太急。"],
        "form": "五言",
        "source": "蒙学补",
        "dynastyId": "hanwei",
    },
    {
        "title": "白马篇",
        "author": "曹植",
        "paragraphs": [
            "白马饰金羁，连翩西北驰。",
            "借问谁家子，幽并游侠儿。",
            "少小去乡邑，扬声沙漠垂。",
        ],
        "form": "五言",
        "source": "蒙学补",
        "dynastyId": "hanwei",
    },
    {
        "title": "野田黄雀行",
        "author": "曹植",
        "paragraphs": [
            "高树多悲风，海水扬其波。",
            "利剑不在掌，结友何须多。",
            "不见篱间雀，见鹞自投罗。",
        ],
        "form": "乐府",
        "source": "蒙学补",
        "dynastyId": "hanwei",
    },
    {
        "title": "饮酒",
        "author": "陶渊明",
        "paragraphs": [
            "结庐在人境，而无车马喧。",
            "问君何能尔，心远地自偏。",
            "采菊东篱下，悠然见南山。",
        ],
        "form": "五言",
        "source": "蒙学补",
        "dynastyId": "hanwei",
    },
    {
        "title": "归园田居",
        "author": "陶渊明",
        "paragraphs": [
            "种豆南山下，草盛豆苗稀。",
            "晨兴理荒秽，带月荷锄归。",
            "道狭草木长，夕露沾我衣。",
            "衣沾不足惜，但使愿无违。",
        ],
        "form": "五言",
        "source": "蒙学补",
        "dynastyId": "hanwei",
    },
    {
        "title": "读山海经",
        "author": "陶渊明",
        "paragraphs": [
            "精卫衔微木，将以填沧海。",
            "刑天舞干戚，猛志固常在。",
        ],
        "form": "五言",
        "source": "蒙学补",
        "dynastyId": "hanwei",
    },
    {
        "title": "江南",
        "author": "乐府",
        "paragraphs": [
            "江南可采莲，莲叶何田田。",
            "鱼戏莲叶间。",
            "鱼戏莲叶东，鱼戏莲叶西，鱼戏莲叶南，鱼戏莲叶北。",
        ],
        "form": "乐府",
        "source": "蒙学补",
        "dynastyId": "hanwei",
    },
    {
        "title": "长歌行",
        "author": "乐府",
        "paragraphs": [
            "青青园中葵，朝露待日晞。",
            "阳春布德泽，万物生光辉。",
            "百川东到海，何时复西归。",
            "少壮不努力，老大徒伤悲。",
        ],
        "form": "乐府",
        "source": "蒙学补",
        "dynastyId": "hanwei",
    },
    {
        "title": "敕勒歌",
        "author": "乐府",
        "paragraphs": [
            "敕勒川，阴山下。",
            "天似穹庐，笼盖四野。",
            "天苍苍，野茫茫，风吹草低见牛羊。",
        ],
        "form": "乐府",
        "source": "蒙学补",
        "dynastyId": "hanwei",
    },
    {
        "title": "悯农·春种",
        "author": "李绅",
        "paragraphs": ["春种一粒粟，秋收万颗子。", "四海无闲田，农夫犹饿死。"],
        "form": "五言",
        "source": "蒙学补",
        "dynastyId": "tang",
    },
    {
        "title": "悯农·锄禾",
        "author": "李绅",
        "paragraphs": ["锄禾日当午，汗滴禾下土。", "谁知盘中餐，粒粒皆辛苦。"],
        "form": "五言",
        "source": "蒙学补",
        "dynastyId": "tang",
    },
    {
        "title": "回乡偶书·其二",
        "author": "贺知章",
        "paragraphs": ["离别家乡岁月多，近来人事半销磨。", "唯有门前镜湖水，春风不改旧时波。"],
        "form": "七言",
        "source": "蒙学补",
        "dynastyId": "tang",
    },
    {
        "title": "烟村",
        "author": "叶绍翁",
        "paragraphs": ["隐隐烟村闻犬吠，欲寻寻不见人家。", "只于桥断溪回处，流出碧桃三数花。"],
        "form": "七言",
        "source": "蒙学补",
        "dynastyId": "song",
    },
]
