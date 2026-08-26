"""Dialogue helpers. Spoken, short, kid-plain. One chapter = one file."""


def N(text: str) -> dict:
    return {"speaker": "narrator", "name": "", "text": text}


def T(text: str) -> dict:
    return {"speaker": "tang", "name": "唐小诗", "text": text}


def O(name: str, text: str) -> dict:
    return {"speaker": "other", "name": name, "text": text}


def lv(
    place: str,
    beast: str,
    monster: str,
    scene: str,
    intro: list,
    outro: list,
) -> dict:
    return {
        "place": place,
        "beast": beast,
        "monsterName": monster,
        "scene": scene,
        "intro": intro,
        "outro": outro,
    }


def chapter(
    *,
    dynasty_id: str,
    poet: str,
    poet_id: str,
    title: str,
    hook: str,
    want: list[str],
    n: int,
    opening: list,
    levels: dict,
    era: str = "",
    tags: list[str] | None = None,
) -> dict:
    return {
        "dynastyId": dynasty_id,
        "poet": poet,
        "poetId": poet_id,
        "title": title,
        "hook": hook,
        "want": want,
        "n": n,
        "era": era,
        "tags": tags or [],
        "opening": opening,
        "levels": levels,
    }
