# 中文诗歌数据集（data/poetry-site/）

来源：[中文诗歌 web 阅读站](https://awesome-poetry.top/huajianji/)（chinese-poetry 项目的官方静态展示站），
已抓取其「中文诗歌」栏目下全部 **11 个文集** 的诗文正文、作者、章节归属与注释。

> 数量与清单以 `index.json` 为准（含抓取时间、各文集章节/诗文计数）。
> 数据集内不保留站点页面链接（`url` 字段已在整理时全部移除）；来源仅在本文件和 `index.json.source` 记录。

## 文件

| 文件 | 内容 |
| --- | --- |
| `index.json` | 数据集总索引：来源、抓取时间、11 个文集的 id/标题/章节/诗文数量 |
| `<collectionId>.json` | 一个文集一个文件，含全部章节与诗文（结构见下） |
| `authors.json` | **作者列表**：282 位作者（繁简归一、佚名归并），id 对齐游戏 poetId |
| `dynasties.json` | **朝代列表**：10 个朝代（含游戏未覆盖的五代/元/明/清/近现代） |
| `collections.json` | **文集列表**：11 个文集（朝代跨度、作者数、章节数、诗数） |

文集 id 对照：花间集=`huajianji`、南唐二主词=`nantang-erzhu-ci`、唐诗三百首=`tangshi-sanbaishou`、
宋词三百首=`songci-sanbaishou`、教科书选诗=`jiaokeshu-xuanshi`、古诗十九首=`gushi-shijiu-shou`、
诗经=`shijing`、千家诗=`qianjiashi`、声律启蒙=`shenglv-qimeng`、三字经=`sanzijing`、
唐诗三百首·蒙学=`tangshi-mengxue`。

## 数据结构

`<collectionId>.json`：

```jsonc
{
  "collection": {
    "id": "huajianji",
    "title": "花间集",
    "editor": "赵崇祚",          // 集子页署名，可能为 null
    "chapterCount": 10,
    "poemCount": 500,
    "duplicatePoemRefs": 0       // 同一诗文在文集内出现多次的引用数
  },
  "chapters": [                  // 章节按站点顺序；「卷第一/卷第二…」已按中文数字排序
    {
      "title": "花间集卷第一",
      "poemCount": 50,
      "poems": [
        {
          "id": "6898548973841035298",   // 站点全局唯一（取自详情页 URL），可做主键
          "title": "菩萨蛮 其一",
          "author": "温庭筠",
          "dynasty": "wudai",            // 推断的朝代 id（见 dynasties.json），必有值
          "paragraphs": ["小山重叠金明灭，鬓云欲度香腮雪。", "..."],  // 正文逐行
          "tags": ["菩萨蛮"],             // 站点 meta 区原始标签：词牌/朝代/诗经篇类等
          "notes": [                      // 可能为空数组
            { "kind": "注释",
              "items": [ {"index": 1, "ref": "小山", "text": "写女子的隔夜残妆。…"} ] }
          ],
          "paragraphsSource": { ... }     // 仅被补全过正文诗有：出处说明
        }
      ]
    }
  ]
}
```

### 三个列表

`authors.json`（按主要朝代、作品数排序）：

```jsonc
{
  "count": 282,
  "authors": [
    {
      "id": "libai",               // 游戏 poetId 优先复用（bank.json 已有的 103 个）；
                                   // 新作者用无声调拼音；同音冲突加 -2/-3
      "name": "李白",               // 简体规范名
      "variants": ["李白"],         // 数据中出现的原写法（含繁体）
      "anonymous": false,
      "dynasties": ["tang"],       // 按其诗文推断，可能多朝代
      "poemCount": 87,             // 去重后诗文数
      "collections": ["qianjiashi", "tangshi-sanbaishou", "..."]
    }
  ]
}
```

- 繁简异体已合并并保留变体记录：王維→`wangwei`、溫庭筠→`wentingyun`、朱庆馀/朱慶餘→`zhuqingyu`、顾夐→`guxiong`。
- 同音不同人保持独立：张继=`zhangji`（游戏已有）、张籍=`zhangji2`。
- 佚名（含无署名）归并为一项 `id="yiming"`，`anonymous: true`。

`dynasties.json`：

```jsonc
{
  "count": 10,
  "dynasties": [
    { "id": "tang", "name": "唐", "scope": "唐诗",
      "authorCount": 93, "poemCount": 769,
      "collections": ["..."], "authors": ["libai", "..."] }
  ]
}
```

- `xianqin / hanwei / tang / song` 与 `world.py DYNASTIES` 对齐（hanwei 涵盖两汉/魏晋/南北朝）；
  `wudai / yuan / ming / qing / modern / unknown` 为站点数据存在但游戏尚未建的朝代。
- 朝代判定：优先用诗文页的朝代标签，否则用文集整体归属（诗经→先秦、花间集→五代、声律启蒙→清…）。

`collections.json`：

```jsonc
{
  "count": 11,
  "collections": [
    { "id": "huajianji", "title": "花间集", "editor": "赵崇祚",
      "dynasties": ["wudai"], "authorCount": 19,
      "chapterCount": 11, "poemCount": 498 }
  ]
}
```

### 其他约定

- `id` 全站唯一（去重后 2155 首），同一首诗出现在多个文集（如《千家诗》与《唐诗三百首·蒙学》共享 213 首）
  时，各文集文件内各自内嵌一份，内容一致；做全局诗文池时按 `id` 去重。
- 正文保持站点原文，不做改写；HTML 空白已归一（无换行残留、无连续空格）。
- 「介绍/序」类章节（如 声律启蒙·介绍、千家诗介绍）按站点原样保留，消费方可按章节标题过滤。
- 《唐诗三百首》有 4 处站点原生的重复收录（隋宫、春思、凉州词二首·其一、月夜），
  已如实保留并在 `collection.duplicatePoemRefs` 标注。

## 空正文补全（paragraphsSource）

站点源数据中《千家诗》《唐诗三百首·蒙学》有 19 首诗文正文为空（详情页上就是空段落，站点自身的数据缺陷）。
抓取脚本会自动用同题同作者的诗补全，并在被补全的诗上写 `paragraphsSource` 出处：

```jsonc
"paragraphsSource": { "from": "poetry-site:tangshi-sanbaishou#5478771022783166760", "title": "静夜思" }
```

- 16 首来自站内其他文集的同一首诗，3 首来自本地 chinese-poetry 仓库 `蒙学/*.json`
  （`--upstream` 指定，默认 /tmp/chinese-poetry；目录不存在时跳过该档）。
- 标题匹配做了繁→简归一（opencc 为可选依赖，缺失时退化为精确匹配）。

## 再生成

```bash
# 1) 全量抓取（增量复用 /tmp/poetry-site-cache 缓存；--fresh 忽略缓存）
python3 scripts/content/scrape-poetry-site.py --out data/poetry-site --workers 10
# 直连过慢/失败时走本地代理（仅本次命令生效，不写入任何配置）
python3 scripts/content/scrape-poetry-site.py --proxy http://127.0.0.1:7897

# 2) 整理：去 url、推断朝代、生成三个列表（authors/dynasties/collections.json）
python3 scripts/content/derive-poetry-indexes.py --data data/poetry-site

# 3) 校验（文件完整性、空正文、数量一致、列表一致性、无 url 残留）
python3 scripts/content/validate-poetry-site.py data/poetry-site
```

## 与游戏数据的关系

本目录是**唯一内容源**。`scripts/content/build-bank.py` 从这里取材（配合 `scripts/content/catalog.py`
的手写引导语与命名），编译出 `src/lib/game/content/bank.json`。诗文入题库前须遵守 `AGENTS.md`
与 `docs/content-rules.md`（每诗 5 题、半句 ≤14 字、介绍章过滤等）。

层级对应：文集→章节→作者→诗卡，即游戏环游入口的层级（ADR-0011）。

当前数据规模：**11 个文集、98 个章节、2372 条诗文引用（去重后 2155 首）、282 位作者、10 个朝代**，约 2.2 MB。
