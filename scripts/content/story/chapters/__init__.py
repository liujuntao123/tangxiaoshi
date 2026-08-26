"""One chapter = one module. ORDER is the journey."""

from importlib import import_module

ORDER = [
    "xianqin_caishiguan",
    "hanwei_yuefu",
    "hanwei_caocao",
    "hanwei_caozhi",
    "hanwei_taoyuanming",
    "tang_luobinwang",
    "tang_lishen",
    "tang_hulingneng",
    "tang_hezhizhang",
    "tang_wangzhihuan",
    "tang_libai",
    "tang_dufu",
    "tang_wangwei",
    "tang_menghaoran",
    "tang_baijuyi",
    "tang_wangchangling",
    "tang_lulun",
    "tang_wangbo",
    "tang_cuihao",
    "tang_hanyu",
    "tang_dumu",
    "tang_liuyuxi",
    "tang_liuzongyuan",
    "tang_weiyingwu",
    "tang_cencan",
    "tang_zhangji",
    "tang_mengjiao",
    "tang_jiadao",
    "tang_lishangyin",
    "song_sushi",
    "song_wanganshi",
    "song_ouyangxiu",
    "song_fanzhongyan",
    "song_yangwanli",
    "song_zhuxi",
    "song_chenghao",
    "song_yeshaoweng",
    "song_liqingzhao",
    "song_xinqiji",
    "song_luyou",
    "song_wentianxiang",
]

CHAPTERS = [import_module(f".{name}", __name__).CHAPTER for name in ORDER]

__all__ = ["CHAPTERS", "ORDER"]
