-- 0005：关卡进度与道具库存（关卡制远征，ADR-0018）。
--
-- 与 0002–0004 的口径一致：结构化数据用 JSON 文本列（Neon 与 PGLite 通用），
-- 读取端统一走 normalizeSave 规范化，旧存档缺列按空对象处理。
-- level_stars：key 为关卡序号字符串，value 为历史最佳星级（0–3）。
-- items：去伪 / 补答 / 双倍三种道具的持有数量。
alter table player_saves add column if not exists level_stars text not null default '{}';
alter table player_saves add column if not exists items text not null default '{}';
