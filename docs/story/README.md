# 剧情文档

- [设计说明](DESIGN.md)
- [世界观](world.md)
- [总表](INDEX.md)
- 逐章对白：[`chapters/`](chapters/)

源文件按诗人拆开，在 `scripts/content/story/chapters/`。改完跑：

```bash
python3 scripts/content/build-bank.py --src /tmp/chinese-poetry
python3 scripts/content/export_story_docs.py
python3 scripts/content/validate_story.py
```
