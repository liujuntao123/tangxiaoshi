#!/usr/bin/env python3
"""Compile the playable poem bank + story chapters from chinese-poetry.

Authored plot lives in `scripts/content/story/`. Do not hand-edit the JSON
under `src/lib/game/content/` unless it is an emergency hotfix.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

from opencc import OpenCC
from pypinyin import lazy_pinyin

ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / "src/lib/game/content"
sys.path.insert(0, str(Path(__file__).resolve().parent))
from story import CANONICAL, CHAPTERS, DYNASTIES, PROLOGUE, WORLD  # noqa: E402

cc = OpenCC("t2s")

PUNCT_SPLIT = re.compile(r"[，。！？、；：,.!?；]+")
SLUG_SAFE = re.compile(r"[^a-z0-9]+")

BEASTS = ["sleep", "falls", "wind", "crane", "boat"]
BEAST_NAMES = {
    "sleep": "瞌睡怪",
    "falls": "水帘怪",
    "wind": "风桃精",
    "crane": "黄鹤精",
    "boat": "行舟怪",
    "demon": "大魔王",
}
SCENES = {
    "moon": "/art/scene-moon.jpg",
    "water": "/art/scene-falls.jpg",
    "spring": "/art/scene-peach.jpg",
    "tower": "/art/scene-tower.jpg",
    "river": "/art/scene-baidi.jpg",
    "palace": "/art/scene-palace.jpg",
    "mountain": "/art/scene-falls.jpg",
    "winter": "/art/scene-moon.jpg",
}
THEME_SCENE = {
    "moon": "moon",
    "home": "moon",
    "water": "water",
    "mountain": "mountain",
    "spring": "spring",
    "farewell": "tower",
    "river": "river",
    "war": "river",
    "winter": "winter",
    "palace": "palace",
}

# (author, canonical title, first-line needle) — needle wins over loose titles.
FAMOUS = [
    ("李白", "望天门山", "天门中断"),
    ("李白", "望庐山瀑布", "日照香炉"),
    ("李白", "夜宿山寺", "危楼高百尺"),
    ("杜甫", "江畔独步寻花", "黄四娘家"),
    ("杜甫", "绝句", "两个黄鹂"),
    ("杜甫", "茅屋为秋风所破歌", "八月秋高"),
    ("杜甫", "春夜喜雨", "好雨知时节"),
    ("白居易", "池上", "小娃撑小艇"),
    ("白居易", "大林寺桃花", "人间四月"),
    ("白居易", "忆江南", "江南好"),
    ("王昌龄", "从军行", "青海长云"),
    ("王昌龄", "出塞", "秦时明月"),
    ("刘禹锡", "竹枝词", "杨柳青青江水平"),
    ("刘禹锡", "浪淘沙", "九曲黄河"),
    ("刘禹锡", "秋词", "自古逢秋悲寂寥"),
    ("王安石", "梅花", "墙角数枝梅"),
    ("王安石", "书湖阴先生壁", "一水护田"),
    ("杨万里", "晓出净慈寺送林子方", "毕竟西湖"),
    ("陆游", "示儿", "死去元知"),
    ("陆游", "秋夜将晓出篱门迎凉有感", "三万里河"),
    ("朱熹", "观书有感", "半亩方塘"),
    ("苏轼", "题西林壁", "横看成岭"),
    ("苏轼", "饮湖上初晴后雨", "水光潋滟"),
    ("崔颢", "黄鹤楼", "昔人已乘黄鹤去"),
    ("王勃", "送杜少府之任蜀州", "城阙辅三秦"),
    ("王勃", "山中", "长江悲已滞"),
    ("王勃", "咏风", "肃肃凉景生"),
    ("孟郊", "游子吟", "慈母手中线"),
    ("贾岛", "寻隐者不遇", "松下问童子"),
    ("李商隐", "夜雨寄北", "君问归期"),
    ("贺知章", "咏柳", "碧玉妆成"),
    ("张继", "枫桥夜泊", "月落乌啼"),
    ("张继", "阊门即事", "耕夫召募逐楼船"),
    ("贺知章", "回乡偶书", "少小离家"),
    ("贺知章", "回乡偶书·其二", "离别家乡岁月多"),
    ("李绅", "悯农·春种", "春种一粒粟"),
    ("李绅", "悯农·锄禾", "锄禾日当午"),
    ("李绅", "答章孝标", "假金只用真金镀"),
    ("韩愈", "早春呈水部张十八员外", "天街小雨润如酥"),
    ("韩愈", "晚春", "草树知春不久归"),
    ("韩愈", "左迁至蓝关示侄孙湘", "一封朝奏九重天"),
    ("刘禹锡", "望洞庭", "湖光秋月两相和"),
    ("孟郊", "登科后", "春风得意马蹄疾"),
    ("孟郊", "洛桥晚望", "天津桥下"),
    ("贾岛", "题李凝幽居", "僧敲月下门"),
    ("贾岛", "剑客", "十年磨一剑"),
    ("王之涣", "登鹳雀楼", "白日依山尽"),
    ("王之涣", "凉州词", "黄河远上"),
    ("王之涣", "宴词", "长堤春水绿悠悠"),
    ("卢纶", "塞下曲·鹫翎金仆姑", "鹫翎金仆姑"),
    ("卢纶", "塞下曲·林暗草惊风", "林暗草惊风"),
    ("卢纶", "塞下曲·月黑雁飞高", "月黑雁飞高"),
    ("卢纶", "塞下曲·野幕敞琼筵", "野幕敞琼筵"),
    ("欧阳修", "画眉鸟", "百啭千声"),
    ("欧阳修", "丰乐亭游春", "红树青山日欲斜"),
    ("欧阳修", "戏答元珍", "春风疑不到天涯"),
    ("范仲淹", "江上渔者", "江上往来人"),
    ("叶绍翁", "游园不值", "春色满园关不住"),
    ("叶绍翁", "烟村", "隐隐烟村闻犬吠"),
    ("叶绍翁", "野蝶", "银为须翅粉为肌"),
    ("文天祥", "过零丁洋", "人生自古谁无死"),
    ("文天祥", "扬子江", "臣心一片磁针石"),
    ("文天祥", "金陵驿", "从今别却江南路"),
    ("胡令能", "小儿垂钓", "蓬头稚子"),
    ("胡令能", "喜韩少府见访", "走入芦花深处藏"),
    ("王维", "送元二使安西", "渭城朝雨"),
    ("王维", "九月九日忆山东兄弟", "独在异乡"),
    ("苏轼", "赠刘景文", "荷尽已无擎雨盖"),
    ("张继", "感怀", "调与时人背"),
    ("胡令能", "绣样", "引得黄莺下柳条"),
]

MEANINGS = {
    "静夜思": "想家、想故乡",
    "望庐山瀑布": "庐山瀑布又高又猛",
    "赠汪伦": "友情比潭水还深",
    "黄鹤楼送孟浩然之广陵": "在黄鹤楼送好朋友",
    "早发白帝城": "坐船走得好快",
    "望天门山": "长江从天门山中间流过",
    "春晓": "春天早上醒来，花被雨打落了",
    "登鹳雀楼": "想看更远，就要再上一层楼",
    "凉州词": "边塞很远，春风难到",
    "出塞": "边关战争长久，人想和平",
    "芙蓉楼送辛渐": "自己像莲花一样干净",
    "竹里馆": "独自在竹林里弹琴",
    "鹿柴": "空山里能听见人说话",
    "相思": "红豆用来寄托想念",
    "送元二使安西": "渭城送别，再喝一杯",
    "九月九日忆山东兄弟": "重阳想家，想念兄弟",
    "咏柳": "春风像剪刀，裁出柳叶",
    "回乡偶书": "老了回家，小孩不认得",
    "枫桥夜泊": "夜里听见寒山寺的钟",
    "江雪": "大雪里只有一个老渔翁",
    "山行": "秋天山上枫叶比花还红",
    "清明": "清明下雨，路上有人问路",
    "江南春": "江南春天，千里莺啼",
    "泊秦淮": "秦淮河上听见亡国的歌",
    "赤壁": "杜牧写赤壁之战的感慨",
    "乌衣巷": "从前的豪门，现在只有燕子",
    "秋词": "秋天也可以很豪迈",
    "赋得古原草送别": "野草烧不尽，春天又长",
    "池上": "小孩偷采白莲",
    "问刘十九": "下雪天，来喝一杯吧",
    "滁州西涧": "黄昏涧边，船自己横在水上",
    "逢入京使": "马上写信，报一句平安",
    "春夜喜雨": "好雨趁夜里悄悄下",
    "绝句": "黄鹂、白鹭、雪岭、船只",
    "望岳": "泰山很高，想登顶看天下",
    "春望": "国破了，春天的花也像在哭",
    "江畔独步寻花": "黄师塔前，花开得热闹",
    "观沧海": "站在海边看很大的海",
    "龟虽寿": "人可以老，志气还在",
    "短歌行": "想找到很多人才",
    "关雎": "河边有人在想心上人",
    "蒹葭": "芦苇苍苍，想找的人在水对岸",
    "桃夭": "桃花开了，祝人成家",
    "饮湖上初晴后雨": "西湖晴天雨天都好看",
    "题西林壁": "身在山中，看不清全貌",
    "水调歌头": "中秋想家人，人长久",
    "惠崇春江晚景": "春天江边，鸭子先知道暖",
    "赠刘景文": "冬天的荷和菊也很美",
    "泊船瓜洲": "京口瓜洲一水之隔，想回家",
    "梅花": "墙角梅花，独自开",
    "元日": "过年放鞭炮，换新桃符",
    "小池": "小小的荷叶，蜻蜓立在上头",
    "晓出净慈寺送林子方": "六月荷花，连天碧",
    "春日": "春游时忽然把春天认出来了",
    "观书有感": "水清才能照见，读书要活水",
    "如梦令": "溪亭喝酒，误入荷花塘",
    "西江月": "夏夜稻花香，蛙声一片",
    "示儿": "临终还惦记北伐中原",
    "游山西村": "山重水复，忽然又见村子",
    "青玉案": "元宵节灯火，却在找一个人",
    "夜雨寄北": "巴山下雨，想着回家剪烛",
    "嫦娥": "月里的人后悔偷药",
    "黄鹤楼": "鹤飞走了，楼还在",
    "送杜少府之任蜀州": "再远的朋友也像在身边",
    "游子吟": "母亲缝衣，恩情难报",
    "寻隐者不遇": "师父采药去了，只在山里",
    "大林寺桃花": "山下花谢了，山寺桃花才开",
    "从军行": "边关打仗，不破楼兰不还",
    "竹枝词": "江上晴雨，像人的心情",
    "书湖阴先生壁": "水和山把田围得青青的",
    "茅屋为秋风所破歌": "屋顶被风掀了，还想让大家都有房子",
    "山居秋暝": "空山新雨，月亮照在松间",
    "破阵子": "梦里打仗，醒来白了头",
    "夏日绝句": "人要做豪杰，不逃到江东",
    "醉花阴": "西风里，人比黄花还瘦",
    "一剪梅": "想念过江，怎么也消不掉",
    "清平乐": "茅屋边，小孩剥莲蓬",
    "卜算子": "驿站边的梅花，香还在",
    "春日偶成": "云淡风轻，偷闲去玩",
    "念奴娇": "大江东去，人像梦一样",
    "君子于役": "人在外头干活，到晚上还不回来",
    "芣苡": "田里采野菜，嘴里有歌",
    "度关山": "走过关山，人最贵",
    "蒿里行": "打仗让田地长满草",
    "咏鹅": "白鹅伸着脖子唱歌，红掌拨水",
    "小儿垂钓": "小孩钓鱼，怕把鱼吓跑，只招手不说话",
    "悯农·春种": "地里粮食很多，种地的人却还挨饿",
    "悯农·锄禾": "每一粒饭都是农民流汗换来的",
    "答章孝标": "真金不用镀，别空腹说大话",
    "七步诗": "豆子和豆茎本是一家，不该互相煎",
    "白马篇": "骑白马的少年去边关",
    "野田黄雀行": "黄雀遇险，朋友要肯帮忙",
    "饮酒": "心走远了，住的地方也安静",
    "归园田居": "回家种豆，露水湿衣也不在乎",
    "读山海经": "精卫填海，志气还在",
    "江南": "荷叶田田，鱼在叶子四面游",
    "长歌行": "要趁年轻努力，别等老了才后悔",
    "敕勒歌": "草原又大又宽，风吹草低看见牛羊",
    "在狱咏蝉": "牢里听蝉，想念外面",
    "易水送别": "在易水边送壮士，水还是那么冷",
    "回乡偶书·其二": "家乡的湖还是从前的样子",
    "宴词": "水浅，船经不起再上人",
    "塞下曲·鹫翎金仆姑": "军营里发令，千营一起呼应",
    "塞下曲·林暗草惊风": "夜里射箭，早上在石头缝里找到箭",
    "塞下曲·月黑雁飞高": "月黑下雪，想追逃走的敌人",
    "塞下曲·野幕敞琼筵": "边关摆酒庆功，金甲还在响",
    "早春呈水部张十八员外": "早春小雨，草色远远看着有、走近又像没有",
    "晚春": "杨花榆荚不会想，只会漫天飞",
    "左迁至蓝关示侄孙湘": "被贬到很远的地方，雪堵住了关",
    "望洞庭": "洞庭湖像镜子，山像白银盘里的青螺",
    "登科后": "考中了，骑马把长安的花看遍",
    "题李凝幽居": "夜里僧人敲门，想推还是敲",
    "剑客": "十年磨一把剑，为不平的事",
    "画眉鸟": "鸟关在笼子里，不如在林子里自己叫",
    "丰乐亭游春": "春天游人在亭前踏花",
    "戏答元珍": "二月山城还没开花，像春天迟到了",
    "江上渔者": "岸上的人爱吃鱼，船上的人在风浪里",
    "渔家傲": "边关秋天，人想家",
    "苏幕遮": "黄叶的秋天，人想家",
    "游园不值": "园门关着，一枝红杏还是探出墙来",
    "烟村": "隔着烟能听见狗叫，桥断了才看见人家",
    "野蝶": "蝴蝶没进桃李园，只好停在菜花上",
    "过零丁洋": "人可以死，要留下一颗真心",
    "扬子江": "心像磁针，永远指向南方",
    "金陵驿": "要离开江南了，心里还记着这条路",
    "喜韩少府见访": "小孩没见过车马，跑进芦花里藏",
}

DISTRACTOR_MEANINGS = [
    "打仗很热闹，大家都开心",
    "春天去城里买新衣服",
    "夜里不想睡觉，只想吃糖",
    "考试得了第一就能飞",
    "给马儿戴花，去街上游行",
    "在山上砍柴比写诗重要",
    "河里有大鱼，可以当船坐",
    "月亮是一块冷冰，不能看",
    "花开了就要立刻摘光",
    "朋友走了就不要再想",
    "雪只用来堆雪人",
    "读书要把水抽干才清",
]


def t2s(text: str) -> str:
    return cc.convert(text or "").strip()


def poet_id(name: str) -> str:
    name = t2s(name)
    special = {
        "采诗官": "caishiguan",
        "乐府": "yuefu",
        "无名氏": "anonymous",
        "西鄙人": "xibiren",
        "张继": "zhangji",
        "张籍": "zhangji2",
    }
    if name in special:
        return special[name]
    slug = "".join(lazy_pinyin(name))
    slug = SLUG_SAFE.sub("", slug.lower())
    return slug or "poet"


def title_slug(title: str) -> str:
    title = t2s(title)
    slug = "".join(lazy_pinyin(title))
    slug = SLUG_SAFE.sub("", slug.lower())[:32]
    return slug or "poem"


def norm_author(raw: str) -> str:
    s = t2s(raw)
    s = re.sub(r"[（(][^）)]+[）)]", "", s)
    s = s.replace("【", "").replace("】", "")
    s = re.sub(r"^[唐宋]·", "", s)
    return s.strip() or "无名氏"


def join_paras(paragraphs) -> str:
    chunks: list[str] = []
    for item in paragraphs or []:
        if isinstance(item, str):
            chunks.append(item)
        elif isinstance(item, dict):
            chunks.extend(str(v) for v in item.values() if isinstance(v, str))
        elif isinstance(item, list):
            chunks.extend(str(v) for v in item if isinstance(v, str))
    return "".join(chunks)


def split_lines(paragraphs: list) -> list[str]:
    joined = cc.convert(join_paras(paragraphs))
    joined = re.sub(r"（[^）]*一作[^）]*）", "", joined)
    joined = re.sub(r"\([^)]*一作[^)]*\)", "", joined)
    parts = [p.strip() for p in PUNCT_SPLIT.split(joined) if p.strip()]
    cleaned = []
    for p in parts:
        p = re.sub(r"\s+", "", p)
        if 2 <= len(p) <= 18:
            cleaned.append(p)
        elif len(p) > 18:
            cleaned.append(p[:16])
    out: list[str] = []
    for line in cleaned:
        if not out or out[-1] != line:
            out.append(line)
    return out[:16]


def theme_of(title: str, lines: list[str]) -> str:
    text = title + "".join(lines)
    rules = [
        ("moon", "月故乡乡思霜"),
        ("farewell", "送别行舟渭城阳关"),
        ("water", "瀑布流江河湖海川潭"),
        ("spring", "春花柳莺桃杏"),
        ("winter", "雪江雪梅冬霜"),
        ("war", "塞征战军凉州出塞"),
        ("mountain", "山岳峰岭楼"),
        ("river", "船舟帆渡桥泊"),
        ("palace", "殿宫京长安"),
    ]
    for theme, chars in rules:
        if any(ch in text for ch in chars):
            return theme
    return "spring"


def flatten_anthology(path: Path, source: str) -> list[dict]:
    data = json.loads(path.read_text())
    items = []
    for block in data.get("content", []):
        form = t2s(block.get("type") or "")
        for item in block.get("content", []):
            items.append(
                {
                    "title": item.get("chapter") or item.get("title") or "",
                    "author": item.get("author") or "",
                    "paragraphs": item.get("paragraphs") or [],
                    "form": form,
                    "source": source,
                }
            )
    return items


def load_shijing(path: Path) -> list[dict]:
    data = json.loads(path.read_text())
    out = []
    for item in data:
        if item.get("chapter") != "国风":
            continue
        out.append(
            {
                "title": item.get("title") or "",
                "author": "采诗官",
                "paragraphs": item.get("content") or [],
                "form": "四言",
                "source": "诗经",
            }
        )
    return out


def load_caocao(path: Path) -> list[dict]:
    data = json.loads(path.read_text())
    return [
        {
            "title": item.get("title") or "",
            "author": "曹操",
            "paragraphs": item.get("paragraphs") or [],
            "form": "乐府",
            "source": "曹操诗集",
        }
        for item in data
    ]


def titles_match(a: str, b: str) -> bool:
    sa, sb = t2s(a), t2s(b)
    if not sa or not sb:
        return False
    sa = re.sub(r"[·・].*$", "", sa)
    sb = re.sub(r"[·・].*$", "", sb)
    sa = re.sub(r"\s*[一二三四五六七八九十\d]+首.*$", "", sa)
    sb = re.sub(r"\s*[一二三四五六七八九十\d]+首.*$", "", sb)
    return sa == sb or sa in sb or sb in sa


def load_ci(src: Path, picks: list[tuple[str, str, str]]) -> list[dict]:
    remaining = list(picks)
    found: list[dict] = []
    for f in sorted(src.glob("ci.song.*.json")):
        if not remaining:
            break
        arr = json.loads(f.read_text())
        still = []
        for author, rhythmic, needle in remaining:
            hit = None
            ta, tr, tn = t2s(author), t2s(rhythmic), t2s(needle)
            for x in arr:
                if t2s(x.get("author") or "") != ta:
                    continue
                if tr and tr not in t2s(x.get("rhythmic") or ""):
                    continue
                para = t2s("".join(x.get("paragraphs") or []))
                if tn and tn not in para:
                    continue
                hit = x
                break
            if hit:
                found.append(
                    {
                        "title": t2s(hit.get("rhythmic") or author),
                        "author": author,
                        "paragraphs": hit.get("paragraphs") or [],
                        "form": "词",
                        "source": "宋词",
                    }
                )
            else:
                still.append((author, rhythmic, needle))
        remaining = still
    return found


def load_named_poems(files: list[Path], picks: list[tuple[str, str]], source: str) -> list[dict]:
    remaining = list(picks)
    found: list[dict] = []
    for f in files:
        if not remaining:
            break
        arr = json.loads(f.read_text())
        still = []
        for author, title in remaining:
            hit = None
            for x in arr:
                if not titles_match(x.get("author") or "", author):
                    continue
                if title and not titles_match(x.get("title") or "", title):
                    continue
                hit = x
                break
            if hit:
                found.append(
                    {
                        "title": hit.get("title") or title,
                        "author": author,
                        "paragraphs": hit.get("paragraphs") or [],
                        "form": "诗",
                        "source": source,
                    }
                )
            else:
                still.append((author, title))
        remaining = still
    return found


def load_famous(files: list[Path], source: str) -> list[dict]:
    remaining = list(FAMOUS)
    found: list[dict] = []
    for f in files:
        if not remaining:
            break
        arr = json.loads(f.read_text())
        if not isinstance(arr, list):
            continue
        still = []
        for author, title, needle in remaining:
            hit = None
            ta, tn = t2s(author), t2s(needle)
            for x in arr:
                if t2s(x.get("author") or "") != ta:
                    continue
                para = t2s(join_paras(x.get("paragraphs") or []))
                if tn and tn in para:
                    hit = x
                    break
            if hit:
                found.append(
                    {
                        "title": title,
                        "author": author,
                        "paragraphs": hit.get("paragraphs") or [],
                        "form": "诗",
                        "source": source,
                    }
                )
            else:
                still.append((author, title, needle))
        remaining = still
    return found


def to_poem(raw: dict, poet_override: str | None = None) -> dict | None:
    title = t2s(raw.get("title") or "")
    title = re.sub(r"\s*[一二三四五六七八九十\d]+首.*$", "", title)
    title = re.sub(r"（其[一二三四五六七八九十]）$", "", title)
    title = title.replace("・", "·").strip(" ·")
    author = poet_override or norm_author(raw.get("author") or "")
    lines = split_lines(raw.get("paragraphs") or [])
    if not title or len(lines) < 2:
        return None
    pid = poet_id(author)
    poem_id = f"{pid}-{title_slug(title)}"
    theme = theme_of(title, lines)
    return {
        "id": poem_id,
        "poetId": pid,
        "poetName": author,
        "title": title,
        "lines": lines,
        "form": t2s(raw.get("form") or "诗"),
        "source": raw.get("source") or "",
        "dynastyId": "",
        "theme": theme,
    }


def meaning_for(title: str, lines: list[str]) -> str | None:
    if title in MEANINGS:
        return MEANINGS[title]
    for key, label in MEANINGS.items():
        if key in title or title in key:
            return label
    text = title + "".join(lines)
    guesses = [
        ("月" in text or "乡" in text, "想家、想故乡"),
        ("送" in text or "别" in text, "送朋友离开"),
        ("春" in text and "花" in text, "春天的景色"),
        ("雪" in text, "写冬天的雪"),
        ("山" in text and "登" in text, "登高望远"),
        ("塞" in text or "征" in text, "边关的生活"),
        ("酒" in text, "和朋友喝酒"),
        ("梅" in text, "梅花不怕冷"),
        ("荷" in text or "莲" in text, "夏天的荷花"),
    ]
    for ok, label in guesses:
        if ok:
            return label
    return None


def shuffle_seed(key: str, items: list[str]) -> list[str]:
    scored = []
    for item in items:
        h = hashlib.md5(f"{key}:{item}".encode()).hexdigest()
        scored.append((h, item))
    scored.sort()
    return [x[1] for x in scored]


def make_questions(poem: dict, titles: list[str], poets: list[str], line_pool: list[str]) -> list[dict]:
    lines = poem["lines"]
    title = poem["title"]
    poet = poem["poetName"]
    qs: list[dict] = []

    def four(correct: str, pool: list[str], qid: str, prompt: str, qtype: str) -> dict | None:
        cand = [c for c in pool if c and c != correct]
        cand = shuffle_seed(qid, cand)
        picks = []
        for c in cand:
            if c not in picks:
                picks.append(c)
            if len(picks) == 3:
                break
        if len(picks) < 3:
            return None
        options = [correct] + picks
        options = shuffle_seed(qid + "-opt", options)
        idx = options.index(correct)
        return {
            "id": qid,
            "type": qtype,
            "prompt": prompt,
            "choices": options[:4],
            "answerIndex": idx,
        }

    if len(lines) >= 2:
        q = four(
            lines[1],
            [ln for ln in lines[2:] + line_pool if ln != lines[1]],
            f"{poem['id']}-next",
            f"「{lines[0]}」的下一句是？",
            "next-line",
        )
        if q:
            qs.append(q)

    q = four(
        title,
        [t for t in titles if t != title],
        f"{poem['id']}-title",
        f"{lines[0]}{'，' + lines[1] if len(lines) > 1 else ''}。这首叫什么？",
        "title",
    )
    if q:
        qs.append(q)

    q = four(
        poet,
        [p for p in poets if p != poet],
        f"{poem['id']}-poet",
        f"《{title}》是谁写的？",
        "poet",
    )
    if q:
        qs.append(q)

    meaning = meaning_for(title, lines)
    if meaning:
        q = four(
            meaning,
            DISTRACTOR_MEANINGS,
            f"{poem['id']}-mean",
            "这首主要在写什么？",
            "meaning",
        )
        if q:
            qs.append(q)

    return qs


def beast_frames(beast_id: str) -> dict:
    base = f"/sprites/{beast_id}.png"
    return {
        "monsterArt": base,
        "monsterIdle": [base],
        "monsterAttack": [f"/sprites/{beast_id}-attack.png", f"/sprites/{beast_id}-attack-2.png"],
        "monsterHurt": [f"/sprites/{beast_id}-hurt.png"],
    }


def build_maps(n: int) -> list[dict]:
    xs = [50, 26, 70, 32, 64, 48]
    coords = []
    for i in range(n):
        t = i / max(n - 1, 1)
        y = 80 - t * 52
        x = xs[i % len(xs)]
        if i == n - 1:
            x = 52
        coords.append({"x": round(float(x), 1), "y": round(y, 1)})
    return coords


def match_script(ch: dict, poem: dict) -> dict | None:
    levels = ch.get("levels") or {}
    title = t2s(poem["title"])
    if title in levels:
        return levels[title]
    for key, script in levels.items():
        if titles_match(key, title):
            return script
    return None


def fallback_script(place: str, poet: str, monster: str, poem: dict, is_boss: bool) -> dict:
    first = poem["lines"][0] if poem["lines"] else poem["title"]
    intro = [
        {"speaker": "narrator", "name": "", "text": f"{place}里飘着一句诗：「{first}」。"},
        {"speaker": "tang", "name": "唐小诗", "text": f"这是《{poem['title']}》。{poet}一定在附近。"},
        {"speaker": "other", "name": monster, "text": "想过这儿，先把诗答上。"},
    ]
    if is_boss:
        intro.append(
            {"speaker": "other", "name": poet, "text": f"小诗，别怕。把《{poem['title']}》念出来。"}
        )
        outro = [
            {"speaker": "other", "name": monster, "text": "……你赢了。"},
            {"speaker": "other", "name": poet, "text": "唐小诗，谢谢你来救我。这诗还在。"},
            {"speaker": "tang", "name": "唐小诗", "text": "应该的！我们走。"},
        ]
    else:
        outro = [
            {"speaker": "other", "name": monster, "text": "钥匙拿去。别挡住下一站。"},
            {"speaker": "tang", "name": "唐小诗", "text": "谢啦！下一站见。"},
        ]
    return {"intro": intro, "outro": outro}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--src", default="/tmp/chinese-poetry")
    args = parser.parse_args()
    src = Path(args.src)

    raw_items: list[dict] = []
    raw_items += list(CANONICAL)
    tang_files = sorted((src / "全唐诗").glob("poet.tang.*.json"))
    song_files = sorted((src / "全唐诗").glob("poet.song.*.json"))
    raw_items += load_famous(tang_files + song_files, "名篇")
    raw_items += flatten_anthology(src / "蒙学/tangshisanbaishou.json", "唐诗三百首")
    raw_items += flatten_anthology(src / "蒙学/qianjiashi.json", "千家诗")
    raw_items += load_shijing(src / "诗经/shijing.json")
    raw_items += load_caocao(src / "曹操诗集/caocao.json")
    raw_items += load_ci(
        src / "宋词",
        [
            ("李清照", "如梦令", "溪亭"),
            ("李清照", "一剪梅", "红藕"),
            ("李清照", "醉花阴", "薄雾"),
            ("辛弃疾", "西江月", "稻花"),
            ("辛弃疾", "青玉案", "花千树"),
            ("辛弃疾", "破阵子", "醉里挑灯"),
            ("辛弃疾", "清平乐", "茅檐"),
            ("苏轼", "水调歌头", "明月几时有"),
            ("苏轼", "念奴娇", "大江东去"),
            ("范仲淹", "渔家傲", "塞下秋来"),
            ("范仲淹", "苏幕遮", "碧云天"),
            ("晏殊", "浣溪沙", "一曲新词"),
            ("陆游", "卜算子", "驿外断桥"),
            ("欧阳修", "生查子", "去年元夜时"),
        ],
    )
    raw_items += load_named_poems(
        tang_files,
        [
            ("李白", "望庐山瀑布"),
            ("李白", "赠汪伦"),
            ("贺知章", "咏柳"),
            ("贺知章", "回乡偶书"),
            ("张继", "枫桥夜泊"),
            ("王之涣", "凉州词"),
            ("杜甫", "春夜喜雨"),
            ("杜甫", "望岳"),
            ("杜甫", "春望"),
            ("白居易", "赋得古原草送别"),
            ("白居易", "忆江南"),
            ("王昌龄", "出塞"),
            ("王昌龄", "芙蓉楼送辛渐"),
            ("杜牧", "山行"),
            ("杜牧", "清明"),
            ("杜牧", "江南春"),
            ("刘禹锡", "乌衣巷"),
            ("刘禹锡", "秋词"),
            ("柳宗元", "江雪"),
            ("韦应物", "滁州西涧"),
            ("岑参", "逢入京使"),
            ("王维", "送元二使安西"),
            ("王维", "九月九日忆山东兄弟"),
            ("孟浩然", "过故人庄"),
            ("王勃", "送杜少府之任蜀州"),
            ("崔颢", "黄鹤楼"),
            ("孟郊", "游子吟"),
            ("贾岛", "寻隐者不遇"),
            ("李商隐", "夜雨寄北"),
            ("李商隐", "嫦娥"),
            ("程颢", "春日偶成"),
            ("卢纶", "塞下曲"),
            ("韩愈", "晚春"),
            ("韩愈", "左迁至蓝关示侄孙湘"),
            ("胡令能", "喜韩少府见访"),
            ("胡令能", "观郑州崔郎中诸妓绣样"),
            ("骆宾王", "易水送别"),
            ("骆宾王", "在狱咏蝉"),
            ("叶绍翁", "游小园不值"),
            ("叶绍翁", "烟村"),
            ("叶绍翁", "野蝶"),
        ],
        "全唐诗",
    )
    raw_items += load_named_poems(
        song_files,
        [
            ("陆游", "示儿"),
            ("陆游", "游山西村"),
            ("杨万里", "小池"),
            ("杨万里", "宿新市徐公店"),
            ("苏轼", "题西林壁"),
            ("苏轼", "饮湖上初晴后雨"),
            ("苏轼", "惠崇春江晚景"),
            ("苏轼", "赠刘景文"),
            ("王安石", "泊船瓜洲"),
            ("王安石", "梅花"),
            ("王安石", "元日"),
            ("朱熹", "春日"),
            ("朱熹", "观书有感"),
            ("李清照", "夏日绝句"),
            ("欧阳修", "画眉鸟"),
            ("欧阳修", "丰乐亭游春"),
            ("范仲淹", "江上渔者"),
            ("文天祥", "过零丁洋"),
            ("文天祥", "扬子江"),
            ("文天祥", "金陵驿"),
            ("刘禹锡", "望洞庭"),
        ],
        "全宋诗",
    )

    poems: list[dict] = []
    seen: set[tuple[str, str]] = set()
    seen_sig: set[tuple[str, str]] = set()
    for raw in raw_items:
        poem = to_poem(raw)
        if not poem:
            continue
        key = (poem["poetName"], poem["title"])
        sig = (poem["poetName"], "".join(poem["lines"][:2]))
        if key in seen or sig in seen_sig:
            continue
        seen.add(key)
        seen_sig.add(sig)
        poems.append(poem)

    poet_dynasty = {}
    for ch in CHAPTERS:
        poet_dynasty[ch["poetId"]] = ch["dynastyId"]
        poet_dynasty[poet_id(ch["poet"])] = ch["dynastyId"]
    song_poets = {
        "苏轼",
        "王安石",
        "杨万里",
        "朱熹",
        "程颢",
        "李清照",
        "辛弃疾",
        "陆游",
        "范成大",
        "范仲淹",
        "晏殊",
        "欧阳修",
        "文天祥",
        "叶绍翁",
        "翁卷",
        "林升",
    }
    hanwei_poets = {"曹操", "曹植", "陶渊明", "乐府"}
    for poem in poems:
        poem["dynastyId"] = poet_dynasty.get(poem["poetId"], "tang")
        if poem["source"] == "诗经":
            poem["dynastyId"] = "xianqin"
        elif poem["source"] in {"曹操诗集", "蒙学补"} and poem["poetName"] in hanwei_poets:
            poem["dynastyId"] = "hanwei"
        elif poem["poetName"] in hanwei_poets:
            poem["dynastyId"] = "hanwei"
        elif poem["source"] in {"宋词", "全宋诗"}:
            poem["dynastyId"] = "song"
        elif poem["source"] == "千家诗" and poem["poetName"] in song_poets:
            poem["dynastyId"] = "song"
        elif poem["poetName"] in song_poets:
            poem["dynastyId"] = "song"

    titles = [p["title"] for p in poems]
    poets = list({p["poetName"] for p in poems})
    line_pool = [ln for p in poems for ln in p["lines"]]

    for poem in poems:
        poem["questions"] = make_questions(poem, titles, poets, line_pool)

    poems = [p for p in poems if len(p["questions"]) >= 3]
    by_poet: dict[str, list[dict]] = defaultdict(list)
    by_title: dict[tuple[str, str], dict] = {}
    for p in poems:
        by_poet[p["poetId"]].append(p)
        by_title[(p["poetId"], p["title"])] = p

    def find_poem(ch: dict, title: str) -> dict | None:
        pid = ch["poetId"]
        hit = by_title.get((pid, title))
        if hit:
            return hit
        for p in by_poet.get(pid, []):
            if titles_match(p["title"], title):
                return p
        for p in poems:
            if titles_match(p["title"], title) and (
                p["poetId"] == pid or p["poetName"] == ch["poet"] or pid == "caishiguan"
            ):
                return p
        return None

    chapters_out = []
    used_poem_ids: set[str] = set()
    fallbacks = 0
    for order, ch in enumerate(CHAPTERS, start=1):
        picked: list[dict] = []
        picked_sigs: set[str] = set()

        def take(poem: dict) -> bool:
            if poem["id"] in used_poem_ids or poem in picked:
                return False
            if poem["poetName"] != ch["poet"] and ch["poetId"] != "caishiguan":
                return False
            sig = "".join(poem["lines"][:2])
            title_s = t2s(poem["title"])
            if title_s in picked_sigs or sig in picked_sigs:
                return False
            picked.append(poem)
            picked_sigs.add(title_s)
            picked_sigs.add(sig)
            return True

        for title in ch["want"]:
            poem = find_poem(ch, title)
            if poem:
                take(poem)
            if len(picked) >= ch["n"]:
                break
        if len(picked) < ch["n"]:
            extras = sorted(
                [p for p in by_poet.get(ch["poetId"], []) if p["poetName"] == ch["poet"] or ch["poetId"] == "caishiguan"],
                key=lambda p: len(p["lines"]),
            )
            for poem in extras:
                take(poem)
                if len(picked) >= ch["n"]:
                    break
        if len(picked) < 2:
            print(f"skip chapter {ch['poet']} only {len(picked)} poems")
            continue

        n = len(picked)
        coords = build_maps(n)
        levels = []
        for i, poem in enumerate(picked):
            used_poem_ids.add(poem["id"])
            is_boss = i == n - 1
            script = match_script(ch, poem)
            place = (script or {}).get("place") or poem["title"]
            theme = poem.get("theme") or theme_of(poem["title"], poem["lines"])
            scene_key = (script or {}).get("scene") or THEME_SCENE.get(theme, "spring")
            if is_boss:
                scene_key = "palace"
                beast = "demon"
            else:
                beast = (script or {}).get("beast") or BEASTS[i % len(BEASTS)]
            monster_name = (script or {}).get("monsterName") or BEAST_NAMES[beast]
            if is_boss:
                monster_name = "大魔王"
                beast = "demon"
            if script:
                intro, outro = script["intro"], script["outro"]
                place = script["place"]
            else:
                fb = fallback_script(place, ch["poet"], monster_name, poem, is_boss)
                intro, outro = fb["intro"], fb["outro"]
                fallbacks += 1
            if is_boss:
                spoken = {line.get("name") for line in intro + outro}
                if ch["poet"] not in spoken:
                    intro = list(intro) + [
                        {"speaker": "other", "name": ch["poet"], "text": f"小诗。把《{poem['title']}》念完就好。"}
                    ]
                if ch["poet"] not in {line.get("name") for line in outro}:
                    outro = list(outro) + [
                        {"speaker": "other", "name": ch["poet"], "text": "谢谢你来。诗还在。"}
                    ]
            scene = SCENES.get(scene_key, SCENES["spring"])
            if is_boss:
                scene = SCENES["palace"]
            level_id = f"{ch['dynastyId']}-{ch['poetId']}-{'boss' if is_boss else str(i + 1)}"
            levels.append(
                {
                    "id": level_id,
                    "order": i + 1,
                    "chapterId": f"{ch['dynastyId']}-{ch['poetId']}",
                    "place": place,
                    "monsterName": monster_name,
                    **beast_frames(beast),
                    "sceneBg": scene,
                    "poemId": poem["id"],
                    "intro": intro,
                    "outro": outro,
                    "map": coords[i],
                    "boss": is_boss,
                }
            )

        chapters_out.append(
            {
                "id": f"{ch['dynastyId']}-{ch['poetId']}",
                "dynastyId": ch["dynastyId"],
                "poetId": ch["poetId"],
                "poetName": ch["poet"],
                "title": ch["title"],
                "hook": ch.get("hook") or "",
                "era": ch.get("era") or "",
                "tags": ch.get("tags") or [],
                "opening": ch.get("opening") or [],
                "order": order,
                "keysToBoss": max(n - 1, 1),
                "art": f"/sprites/poets/{ch['poetId']}.png",
                "mapStart": {"x": 50, "y": 95},
                "levels": levels,
            }
        )

    story = {
        "world": WORLD,
        "prologue": PROLOGUE,
        "dynasties": DYNASTIES,
        "chapters": chapters_out,
        "legacyLevelIds": {
            "lv1": "tang-libai-1",
            "lv2": "tang-libai-2",
            "lv3": "tang-libai-3",
            "lv4": "tang-libai-4",
            "lv5": "tang-libai-5",
            "lv6": "tang-libai-boss",
        },
    }

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUT_DIR / "bank.json").write_text(json.dumps(poems, ensure_ascii=False, indent=2), encoding="utf-8")
    (OUT_DIR / "story.json").write_text(json.dumps(story, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"poems {len(poems)}")
    print(f"chapters {len(chapters_out)} levels {sum(len(c['levels']) for c in chapters_out)}")
    print(f"fallback scripts {fallbacks}")
    for c in chapters_out:
        titles_c = [next(p["title"] for p in poems if p["id"] == lv["poemId"]) for lv in c["levels"]]
        print(f"  {c['id']:28s} {len(c['levels'])} {titles_c}")
    if fallbacks:
        print("WARN: authored overlay missed some levels", file=sys.stderr)


if __name__ == "__main__":
    main()
