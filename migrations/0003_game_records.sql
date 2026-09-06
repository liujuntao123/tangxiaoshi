-- 0003：关卡成绩与累计总分（docs/game-design.md §7.3）。
--
-- 与 0002 的口径一致：结构化成绩用 JSON 文本列（Neon 与 PGLite 通用），
-- 数值列用 integer 默认 0；读取端统一走 normalizeSave 规范化，
-- 旧存档缺列/缺字段按空对象和 0 处理。
alter table player_saves add column if not exists level_records text not null default '{}';
alter table player_saves add column if not exists total_score integer not null default 0;
