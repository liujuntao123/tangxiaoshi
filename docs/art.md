# 生图工具链规范

所有游戏素材由 `gpt-image-2` 生成，脚本化、模板化、可重跑。改风格先改这里，再改脚本。

## 一、Provider 与端点

| 优先级 | base | key | 支持端点 | 备注 |
| --- | --- | --- | --- | --- |
| 主 | `https://qkmss.com` | `sk-0WzkItJkVxATv4QiWCvy8rNaZssTXNbh79FWC2uRIgLlPDl2` | generations | 2026-08-29 额度已恢复 |
| 备 | `http://38.76.215.125:13001` | `sk-5LrPxbz-SJT5PtLFfWg164_2FLrGBdbA` | generations + edits | 有限流（曾实测 ~2 张/分钟并伴长周期 429），429 走指数退避 |
| 备 | `https://img.hezubus.cc` | `sk-ni28HxjqgMJOa5MFbUapf1UIoZPoX7IHEsIAHpEMpkOMHPt2` | generations | 偶发连接超时，重试即可；返回 url 需二次下载；该线路禁止 /v1/models 等查询 |

- **无参考图** → `POST {base}/v1/images/generations`，JSON：`model/prompt/size/n/background/output_format`。**不要塞 `image` 字段**（该端点不支持，400 或被忽略）。
- **有参考图**（角色一致性变体）→ 仅 `38.76.215.125` 支持：`POST {base}/v1/images/edits`，multipart/form-data：`image` 为文件 part（`filename="ref.png"`、`Content-Type: image/png`），`prompt/model/size/n/quality` 为表单字段。
- **edits 超时一律 120s**：超时即判失败、快速重试（可多轮），不要拉长超时傻等。
- generations 超时 180s；lib.py 运行期自动拉黑「额度耗尽」的 provider，429 按指数退避并做请求间隔节流。
- 网络失败可临时走本地代理 `http://127.0.0.1:7897`（仅单次命令内 export，用完即清，不写入任何配置）。

## 二、统一风格（写死在脚本常量里）

```
STYLE = "古风儿童绘本插画，Q版可爱，圆脸大眼，线条干净简洁，青绿色与米白色为主的淡雅配色，柔和上色，画面干净"
NO_TEXT = "画面中不出现任何文字、字母、水印、印章文字"
```

- **非背景类素材全部透明背景**：请求带 `"background": "transparent"`、`"output_format": "png"`；落盘后校验 alpha 通道确有透明像素。
- **背景类不透明**：full-bleed 出血构图，主体元素在中央三分之二，**下三分之一留空给 UI**，无人物。
- 禁止：写意水墨、暗黑魔幻、厚涂国潮、像素风、真实照片风。

## 三、素材类别与 prompt 模板

| 类别 | 尺寸 | 透明 | prompt 模板（占位符来自 catalog.py `ART` 段） |
| --- | --- | --- | --- |
| 全局背景 | 1024x1536 | 否 | `{scene}。{BG_STYLE}。竖版构图，下三分之一留空。{NO_PERSON}。{NO_TEXT}。` |
| 文集背景 ×5 | 1024x1536 | 否 | `{motif}。{BG_STYLE}。竖版构图，意境统一但构图各异，下三分之一留空。{NO_PERSON}。{NO_TEXT}。` |
| 文集形象 | 1024x1024 | 是 | `单个{motif}居中。{STYLE}。纯透明背景，四周留白。{NO_TEXT}。` |
| 朝代形象 | 1024x1024 | 是 | `单个{motif}居中。{STYLE}。纯透明背景，四周留白。{NO_TEXT}。` |
| 通用章节 ×10 | 1024x1024 | 是 | `一枚古风书签，签首系青绿流苏，签身饰有{n}道横向纹样，纹样由简到繁。{STYLE}。纯透明背景。{NO_TEXT}。` |
| 主角唐小诗 | 1024x1024 | 是 | `一个Q版小男孩，束发少年，唐装，{pose}。{STYLE}。全身立绘，纯透明背景。{NO_TEXT}。` |
| 作者立绘 | 1024x1536 | 是 | `一位Q版古代文人{persona}。{STYLE}。全身立绘，纯透明背景。{NO_TEXT}。` |

> 背景**必须空无一人**（2026-08 QA 后收紧）：背景专用 `BG_STYLE` 刻意不含「Q版/圆脸大眼」等
> 人物偏置词（这类词会诱导模型往空镜里加小孩），并追加 `{NO_PERSON}` 强约束。
> 角色类素材仍用 `STYLE`。

- 主角三形态：先生成 `hero.png`（默认，站立微笑），再用 **edits + 该图作参考** 出 `hero-happy.png`（答对欢呼，双臂上举）/`hero-sad.png`（答错沮丧，垂头），保证同一张脸。参考图法失败才允许本地 PIL 兜底。
- **edits 不可用时的既定阶梯**（2026-08 试点实测：两家 provider 的 edits 端点同时 502/超时）：
  `heroes.py` 内置 edits→PIL 派生自动降级；PIL 派生 = 轻微旋转 + 星光/汗滴叠加 + 饱和度调整，
  形象 100% 一致，表情变化交给 `mood-happy`/`mood-sad` 动效补足。edits 恢复后 `--force` 重生成真图。
- 作者立绘姿态统一：正面微侧、手持词卷或背手而立；具体 persona 描述写进 catalog.py。

## 四、后处理管线（生成后必跑）

```bash
python3 scripts/art/trim.py        # 裁掉透明边
python3 scripts/art/compress.py    # 256 色量化
```

校验：透明类素材必须有 alpha 且存在透明像素；背景类必须无 alpha 全不透明；尺寸精确匹配。

## 五、落盘路径（前端 meta.ts 与之一一对应）

```
public/art/bg/home.png / tour-collections.png / tour-chapters.png / tour-author.png
public/art/bg/endless.png / practice.png / achievements.png
public/art/bg/collections/{collectionId}-{1..5}.png
public/art/avatars/collection-{collectionId}.png
public/art/avatars/dynasty-{dynastyId}.png
public/art/avatars/chapter-{1..10}.png
public/sprites/hero.png / hero-happy.png / hero-sad.png
public/sprites/poets/{authorId}.png
```

## 六、批量与重跑

- 一类一脚本，共享 `scripts/art/lib.py`（provider 轮换/重试/落盘/校验）：
  `backgrounds.py`（7 全局 + 各文集 5 张）、`avatars.py`（文集 + 朝代 + 章节）、`heroes.py`（主角三形态）、`poets.py`（作者立绘）。
- 幂等：已存在且校验通过的文件跳过；`--force` 强制重生成；`--only <name>` 单独重跑。
- 批次顺序：① 背景（7+5）→ ② 文集 11 + 朝代 10 → ③ 章节 10 + 主角 3 + 作者（试点：lijing、liyu）。
- 只生成**已编译内容**涉及的素材（文集形象/背景 11 张文集形象除外——锁定文集卡片也要展示形象）。
