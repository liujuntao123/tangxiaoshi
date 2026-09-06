-- 存档 v2：层级重构（文集→章节→作者→诗卡），旧关卡 id 无处映射，全部重置。
-- 用户账号与无尽最高分保留（见 ADR-0013 / AGENTS.md）。

alter table player_saves rename column cleared_levels to cleared_poems;
update player_saves set cleared_poems = '[]';
update player_saves set achievements = '[]';
alter table player_saves add column if not exists met_authors text not null default '[]';
