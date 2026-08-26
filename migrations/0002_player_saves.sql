create table if not exists player_saves (
  user_id text primary key,
  cleared_levels text not null default '[]',
  keys_owned integer not null default 0,
  achievements text not null default '[]',
  endless_best_streak integer not null default 0,
  endless_best_score integer not null default 0,
  updated_at timestamptz not null default now()
);
