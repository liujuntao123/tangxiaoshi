import type { AchievementDef, Level, Poem, Question } from "./types";

export const KEYS_TO_BOSS = 5;
export const MAP_START = { x: 50, y: 95 };

function beast(id: string) {
  return {
    monsterArt: `/sprites/${id}.png`,
    monsterIdle: [`/sprites/${id}.png`],
    monsterAttack: [`/sprites/${id}-attack.png`, `/sprites/${id}-attack-2.png`],
    monsterHurt: [`/sprites/${id}-hurt.png`],
  };
}

export const POEMS: Poem[] = [
  {
    id: "jingyesi",
    poetId: "libai",
    poetName: "李白",
    title: "静夜思",
    lines: ["床前明月光", "疑是地上霜", "举头望明月", "低头思故乡"],
    questions: [
      {
        id: "jy-next",
        type: "next-line",
        prompt: "「床前明月光」的下一句是？",
        choices: ["疑是地上霜", "低头思故乡", "举头望明月", "春风花草香"],
        answerIndex: 0,
      },
      {
        id: "jy-title",
        type: "title",
        prompt: "床前明月光，疑是地上霜。这首诗叫什么？",
        choices: ["静夜思", "夜宿山寺", "望月怀远", "春夜喜雨"],
        answerIndex: 0,
      },
      {
        id: "jy-poet",
        type: "poet",
        prompt: "《静夜思》是谁写的？",
        choices: ["杜甫", "李白", "王维", "白居易"],
        answerIndex: 1,
      },
      {
        id: "jy-mean",
        type: "meaning",
        prompt: "这首诗主要在写什么？",
        choices: ["打仗很热闹", "想家、想故乡", "春天去踏青", "河里有大鱼"],
        answerIndex: 1,
      },
    ],
  },
  {
    id: "wanglu",
    poetId: "libai",
    poetName: "李白",
    title: "望庐山瀑布",
    lines: ["日照香炉生紫烟", "遥看瀑布挂前川", "飞流直下三千尺", "疑是银河落九天"],
    questions: [
      {
        id: "wl-next",
        type: "next-line",
        prompt: "「飞流直下三千尺」的下一句是？",
        choices: ["疑是银河落九天", "黄河远上白云间", "飞流直下九千尺", "不及汪伦送我情"],
        answerIndex: 0,
      },
      {
        id: "wl-title",
        type: "title",
        prompt: "日照香炉生紫烟，这首诗叫什么？",
        choices: ["望庐山瀑布", "早发白帝城", "望天门山", "黄鹤楼"],
        answerIndex: 0,
      },
      {
        id: "wl-poet",
        type: "poet",
        prompt: "《望庐山瀑布》是谁写的？",
        choices: ["李白", "杜牧", "孟浩然", "王之涣"],
        answerIndex: 0,
      },
      {
        id: "wl-mean",
        type: "meaning",
        prompt: "这首诗主要在写什么？",
        choices: ["庐山瀑布又高又急", "夜里想家", "朋友来送别", "小船过江"],
        answerIndex: 0,
      },
    ],
  },
  {
    id: "zengwang",
    poetId: "libai",
    poetName: "李白",
    title: "赠汪伦",
    lines: ["李白乘舟将欲行", "忽闻岸上踏歌声", "桃花潭水深千尺", "不及汪伦送我情"],
    questions: [
      {
        id: "zw-next",
        type: "next-line",
        prompt: "「桃花潭水深千尺」的下一句是？",
        choices: ["不及汪伦送我情", "疑是银河落九天", "轻舟已过万重山", "唯见长江天际流"],
        answerIndex: 0,
      },
      {
        id: "zw-title",
        type: "title",
        prompt: "桃花潭水深千尺，不及汪伦送我情。这首诗叫什么？",
        choices: ["黄鹤楼送孟浩然之广陵", "赠汪伦", "早发白帝城", "静夜思"],
        answerIndex: 1,
      },
      {
        id: "zw-poet",
        type: "poet",
        prompt: "《赠汪伦》是谁写的？",
        choices: ["杜甫", "王维", "李白", "白居易"],
        answerIndex: 2,
      },
      {
        id: "zw-mean",
        type: "meaning",
        prompt: "这首诗主要在写什么？",
        choices: ["瀑布很高", "朋友送别的情意", "月亮很亮", "魔王很凶"],
        answerIndex: 1,
      },
    ],
  },
  {
    id: "huanghe",
    poetId: "libai",
    poetName: "李白",
    title: "黄鹤楼送孟浩然之广陵",
    lines: ["故人西辞黄鹤楼", "烟花三月下扬州", "孤帆远影碧空尽", "唯见长江天际流"],
    questions: [
      {
        id: "hh-next",
        type: "next-line",
        prompt: "「故人西辞黄鹤楼」的下一句是？",
        choices: ["烟花三月下扬州", "孤帆远影碧空尽", "两岸猿声啼不住", "春风又绿江南岸"],
        answerIndex: 0,
      },
      {
        id: "hh-title",
        type: "title",
        prompt: "故人西辞黄鹤楼，烟花三月下扬州。这首诗叫什么？",
        choices: ["黄鹤楼送孟浩然之广陵", "赠汪伦", "望天门山", "静夜思"],
        answerIndex: 0,
      },
      {
        id: "hh-poet",
        type: "poet",
        prompt: "「烟花三月下扬州」是谁写的？",
        choices: ["孟浩然", "李白", "杜甫", "杜牧"],
        answerIndex: 1,
      },
      {
        id: "hh-mean",
        type: "meaning",
        prompt: "这首诗主要在写什么？",
        choices: ["在黄鹤楼送朋友远行", "夜里想家", "瀑布从天而降", "小船过三峡"],
        answerIndex: 0,
      },
    ],
  },
  {
    id: "baidi",
    poetId: "libai",
    poetName: "李白",
    title: "早发白帝城",
    lines: ["朝辞白帝彩云间", "千里江陵一日还", "两岸猿声啼不住", "轻舟已过万重山"],
    questions: [
      {
        id: "bd-next",
        type: "next-line",
        prompt: "「两岸猿声啼不住」的下一句是？",
        choices: ["轻舟已过万重山", "孤帆远影碧空尽", "疑是银河落九天", "不及汪伦送我情"],
        answerIndex: 0,
      },
      {
        id: "bd-title",
        type: "title",
        prompt: "朝辞白帝彩云间，这首诗叫什么？",
        choices: ["望庐山瀑布", "早发白帝城", "望天门山", "赠汪伦"],
        answerIndex: 1,
      },
      {
        id: "bd-poet",
        type: "poet",
        prompt: "《早发白帝城》是谁写的？",
        choices: ["李白", "杜甫", "王维", "王之涣"],
        answerIndex: 0,
      },
      {
        id: "bd-mean",
        type: "meaning",
        prompt: "这首诗主要在写什么？",
        choices: ["小船走得很快，群山一闪而过", "在楼上喝酒", "月亮像霜", "桃花很深"],
        answerIndex: 0,
      },
    ],
  },
  {
    id: "tianmen",
    poetId: "libai",
    poetName: "李白",
    title: "望天门山",
    lines: ["天门中断楚江开", "碧水东流至此回", "两岸青山相对出", "孤帆一片日边来"],
    questions: [
      {
        id: "tm-next",
        type: "next-line",
        prompt: "「两岸青山相对出」的下一句是？",
        choices: ["孤帆一片日边来", "轻舟已过万重山", "烟花三月下扬州", "疑是地上霜"],
        answerIndex: 0,
      },
      {
        id: "tm-title",
        type: "title",
        prompt: "天门中断楚江开，这首诗叫什么？",
        choices: ["望天门山", "望庐山瀑布", "早发白帝城", "静夜思"],
        answerIndex: 0,
      },
      {
        id: "tm-poet",
        type: "poet",
        prompt: "《望天门山》是谁写的？",
        choices: ["杜甫", "白居易", "李白", "杜牧"],
        answerIndex: 2,
      },
      {
        id: "tm-mean",
        type: "meaning",
        prompt: "这首诗主要在写什么？",
        choices: ["两座山夹着江，小船从日边来", "夜里想家", "朋友踏歌来送", "瀑布像银河"],
        answerIndex: 0,
      },
    ],
  },
];

export const LEVELS: Level[] = [
  {
    id: "lv1",
    order: 1,
    place: "月亮村",
    monsterName: "瞌睡怪",
    ...beast("sleep"),
    sceneBg: "/art/scene-moon.jpg",
    poemId: "jingyesi",
    intro: [
      { speaker: "narrator", name: "", text: "唐小诗走进月亮村。夜里特别亮，有人在打瞌睡。" },
      { speaker: "tang", name: "唐小诗", text: "喂，你把李白藏哪儿了？" },
      { speaker: "other", name: "瞌睡怪", text: "嘘……别吵。答对诗题，我才让路。" },
    ],
    outro: [
      { speaker: "other", name: "瞌睡怪", text: "唔……月亮还是故乡的圆。钥匙给你。" },
      { speaker: "tang", name: "唐小诗", text: "谢啦！下一站，瀑布关。" },
    ],
    map: { x: 50, y: 90 },
  },
  {
    id: "lv2",
    order: 2,
    place: "瀑布关",
    monsterName: "水帘怪",
    ...beast("falls"),
    sceneBg: "/art/scene-falls.jpg",
    poemId: "wanglu",
    intro: [
      { speaker: "narrator", name: "", text: "水声轰隆。帘子一样的瀑布后面，有个湿漉漉的家伙。" },
      { speaker: "tang", name: "唐小诗", text: "好高的水！李白从这儿过吗？" },
      { speaker: "other", name: "水帘怪", text: "过是过了。你先说说，这水有多高？" },
    ],
    outro: [
      { speaker: "other", name: "水帘怪", text: "三千尺！你答对了。拿钥匙，别滑倒。" },
      { speaker: "tang", name: "唐小诗", text: "谢谢！去桃花潭看看。" },
    ],
    map: { x: 40, y: 76 },
  },
  {
    id: "lv3",
    order: 3,
    place: "桃花潭",
    monsterName: "风桃精",
    ...beast("wind"),
    sceneBg: "/art/scene-peach.jpg",
    poemId: "zengwang",
    intro: [
      { speaker: "narrator", name: "", text: "花瓣打着旋。潭边有人踏着歌，把路挡住了。" },
      { speaker: "tang", name: "唐小诗", text: "汪伦是在这儿送李白的吧？" },
      { speaker: "other", name: "风桃精", text: "情比潭深。答对，我就把钥匙吹给你。" },
    ],
    outro: [
      { speaker: "other", name: "风桃精", text: "千尺也比不上友情。去吧。" },
      { speaker: "tang", name: "唐小诗", text: "黄鹤楼见！" },
    ],
    map: { x: 34, y: 60 },
  },
  {
    id: "lv4",
    order: 4,
    place: "黄鹤楼",
    monsterName: "黄鹤精",
    ...beast("crane"),
    sceneBg: "/art/scene-tower.jpg",
    poemId: "huanghe",
    intro: [
      { speaker: "narrator", name: "", text: "三月的风很软。楼上站着一只会说话的黄鹤。" },
      { speaker: "tang", name: "唐小诗", text: "故人是从这儿走的吗？" },
      { speaker: "other", name: "黄鹤精", text: "西辞黄鹤楼。你若答错，帆就不见了。" },
    ],
    outro: [
      { speaker: "other", name: "黄鹤精", text: "烟花三月，路还长。钥匙收好。" },
      { speaker: "tang", name: "唐小诗", text: "下一站，白帝城！" },
    ],
    map: { x: 72, y: 48 },
  },
  {
    id: "lv5",
    order: 5,
    place: "白帝城",
    monsterName: "行舟怪",
    ...beast("boat"),
    sceneBg: "/art/scene-baidi.jpg",
    poemId: "baidi",
    intro: [
      { speaker: "narrator", name: "", text: "彩云下面，一只小船卡在江心，船上的怪直摇桨。" },
      { speaker: "tang", name: "唐小诗", text: "这么快的船！李白是坐这个走的？" },
      { speaker: "other", name: "行舟怪", text: "一日还。答对才让你过万重山。" },
    ],
    outro: [
      { speaker: "other", name: "行舟怪", text: "猿声还在叫，船已经走了。第五把，拿去。" },
      { speaker: "tang", name: "唐小诗", text: "钥匙齐了。魔王殿，我来了！" },
    ],
    map: { x: 30, y: 30 },
  },
  {
    id: "lv6",
    order: 6,
    place: "魔王殿",
    monsterName: "大魔王",
    ...beast("demon"),
    sceneBg: "/art/scene-palace.jpg",
    poemId: "tianmen",
    intro: [
      { speaker: "narrator", name: "", text: "殿门打开。大魔王把李白关在后面，自己挡在台阶上。" },
      { speaker: "tang", name: "唐小诗", text: "把李白还来！" },
      { speaker: "other", name: "大魔王", text: "天门已断。答错三题，你就留下。" },
      { speaker: "other", name: "李白", text: "小诗，别怕。诗在心里，他就打不赢。" },
    ],
    outro: [
      { speaker: "other", name: "大魔王", text: "……孤帆从日边来。你们走吧。" },
      { speaker: "other", name: "李白", text: "好家伙。唐小诗，谢谢你来救我。" },
      { speaker: "tang", name: "唐小诗", text: "应该的！我们回家。" },
    ],
    map: { x: 58, y: 13 },
  },
];

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "poet-libai", title: "李白回来了", hint: "在魔王殿救出李白", art: "/sprites/libai-bust.png" },
  { id: "no-damage", title: "滴水不漏", hint: "有一关三血打满，一题都不错", art: "/ui/hp-on.png" },
  { id: "ten-streak", title: "十连击", hint: "无尽模式连对十题", art: "/sprites/fx/bolt.png" },
];

export function levelById(id: string): Level {
  const level = LEVELS.find((item) => item.id === id);
  if (!level) throw new Error(`missing level ${id}`);
  return level;
}

export function poemById(id: string): Poem {
  const poem = POEMS.find((item) => item.id === id);
  if (!poem) throw new Error(`missing poem ${id}`);
  return poem;
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = copy[i];
    const b = copy[j];
    if (a === undefined || b === undefined) continue;
    copy[i] = b;
    copy[j] = a;
  }
  return copy;
}

export function shuffleQuestions(poem: Poem): Question[] {
  return shuffle(poem.questions);
}

export function questionsFromPoems(ids: string[]): Question[] {
  const pool = POEMS.filter((poem) => ids.includes(poem.id)).flatMap((poem) => poem.questions);
  return shuffle(pool);
}
