"""World bible: through-line, dynasties, first-enter prologue."""

from .helpers import N, T, O

WORLD = {
    "title": "唐小诗历险记",
    "logline": "大魔王把诗人抓走，想让诗只剩空纸。少年唐小诗从河边的歌谣追到宋词，一章救出一位诗人。",
    "hero": "唐小诗",
    "villain": "大魔王",
    "rules": [
        "对白口语短句，不文言。",
        "一章救一位诗人，关卡用地名，妖怪用直白名字。",
        "怪用那一关的诗出题。答对才让路。",
        "朝代先开先秦；上一朝救出至少一位，下一朝才开门。",
        "章内关卡按顺序开。钥匙等于已过的非 Boss 关。集齐才能进最后一关救人。",
        "大魔王抓的是人。人在，诗就在；人不在，纸会变白。",
    ],
}

DYNASTIES = [
    {
        "id": "xianqin",
        "name": "先秦",
        "tagline": "诗从河边唱起",
        "mapArt": "/art/scene-peach.jpg",
        "scene": "/art/scene-peach.jpg",
        "era": "歌谣",
        "opening": [
            N("河很宽。岸上堆着空本子，墨还没干，字已经没了。"),
            T("这是最早的歌。采诗官呢？"),
            O("风", "歌从嘴里被抽走了。人在后头。"),
            T("那我从河洲找起。"),
        ],
    },
    {
        "id": "hanwei",
        "name": "汉魏",
        "tagline": "北方又大又冷",
        "mapArt": "/art/scene-baidi.jpg",
        "scene": "/art/scene-baidi.jpg",
        "era": "乐府",
        "opening": [
            N("风从北边来。田里的歌、营里的歌，都变薄了。"),
            T("采诗官说过：有名字的人更好抓。"),
            T("先找还在口头传的那些。乐府、曹操、曹植、陶渊明。"),
        ],
    },
    {
        "id": "tang",
        "name": "唐",
        "tagline": "人人会背的那些",
        "mapArt": "/art/map.jpg",
        "scene": "/art/scene-moon.jpg",
        "era": "唐诗",
        "opening": [
            N("唐朝的纸最多。被抽空的也最多。"),
            T("鹅鹅鹅——我第一首会背的，也在这儿。"),
            T("从骆宾王开始。会背的人最多，更不能丢。"),
        ],
    },
    {
        "id": "song",
        "name": "宋",
        "tagline": "词也是诗",
        "mapArt": "/art/scene-tower.jpg",
        "scene": "/art/scene-tower.jpg",
        "era": "宋诗宋词",
        "opening": [
            N("西湖还在。纸上的词被风吹得稀薄，像要化掉。"),
            T("大魔王说词不算诗。我偏要救。"),
            T("苏轼、李清照、陆游，还有最后那位不肯低头的。"),
        ],
    },
]

PROLOGUE = [
    N("夜里，书架上的诗集一页页变白。"),
    T("喂！字呢？人呢？"),
    N("风里有人笑。大魔王把诗人抓走了。他说：诗住在人身上。人不在，纸就是空的。"),
    T("那我去救人。从最早的那一首开始。"),
]
