create extension if not exists pgcrypto;

create table if not exists public.flames (
  id uuid primary key default gen_random_uuid(),
  text text not null check (char_length(text) between 1 and 80),
  tag_label text not null check (char_length(tag_label) between 2 and 20 and left(tag_label, 1) = '#'),
  tag_normalized text not null check (char_length(tag_normalized) between 1 and 20),
  category text not null check (category in ('politics', 'local', 'society', 'safety', 'daily', 'other')),
  mood text not null check (mood in ('quiet', 'curious', 'serious', 'want_talk')),
  self_strength int not null check (self_strength in (1, 2, 3)),
  heat_score int not null default 0 check (heat_score >= 0),
  geohash text not null check (char_length(geohash) between 7 and 10 and left(geohash, 2) = 'g:'),
  region_label text,
  device_hash text not null check (char_length(device_hash) between 32 and 128),
  status text not null default 'live' check (status in ('live', 'ember', 'trace', 'extinguished', 'reported', 'hidden', 'expired')),
  live_until timestamptz not null,
  ember_until timestamptz not null,
  trace_until timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (live_until < ember_until and ember_until < trace_until)
);

create table if not exists public.flame_reactions (
  id uuid primary key default gen_random_uuid(),
  flame_id uuid not null references public.flames(id) on delete cascade,
  device_hash text not null check (char_length(device_hash) between 32 and 128),
  reaction_type text not null check (reaction_type in ('similar', 'curious', 'need_source', 'watching')),
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  flame_id uuid not null references public.flames(id) on delete cascade,
  device_hash text not null check (char_length(device_hash) between 32 and 128),
  reason text not null check (reason in ('misinformation', 'doxxing', 'violence', 'illegal', 'hate', 'spam', 'privacy', 'other')),
  detail text check (detail is null or char_length(detail) <= 240),
  created_at timestamptz not null default now()
);

create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  raw_keyword text not null check (char_length(raw_keyword) between 1 and 80),
  display_label text not null check (char_length(display_label) between 2 and 20 and left(display_label, 1) = '#'),
  normalized_key text not null check (char_length(normalized_key) between 1 and 20),
  category text not null check (category in ('politics', 'local', 'society', 'safety', 'daily', 'other')),
  scope text not null check (scope in ('local', 'regional', 'global')),
  heat_score int not null default 0 check (heat_score >= 0),
  status text not null default 'visible' check (status in ('visible', 'hidden', 'blocked', 'review')),
  geohash text check (geohash is null or (char_length(geohash) between 7 and 10 and left(geohash, 2) = 'g:')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.action_events (
  id uuid primary key default gen_random_uuid(),
  device_hash text not null check (char_length(device_hash) between 32 and 128),
  action_type text not null check (action_type in ('create_flame', 'react_flame', 'report_flame', 'extinguish_flame')),
  created_at timestamptz not null default now()
);

create index if not exists flames_geohash_idx on public.flames (geohash);
create index if not exists flames_status_idx on public.flames (status);
create index if not exists flames_live_until_idx on public.flames (live_until);
create index if not exists flames_ember_until_idx on public.flames (ember_until);
create index if not exists flames_trace_until_idx on public.flames (trace_until);
create index if not exists flames_category_idx on public.flames (category);
create index if not exists flames_tag_normalized_idx on public.flames (tag_normalized);
create index if not exists flames_device_hash_idx on public.flames (device_hash);
create index if not exists flames_nearby_visible_idx on public.flames (geohash, status, created_at)
  where status in ('live', 'ember', 'trace');

create index if not exists flame_reactions_flame_id_idx on public.flame_reactions (flame_id);
create unique index if not exists flame_reactions_once_idx on public.flame_reactions (flame_id, device_hash, reaction_type);

create index if not exists reports_flame_id_idx on public.reports (flame_id);
create unique index if not exists reports_once_idx on public.reports (flame_id, device_hash, reason);

create index if not exists topics_normalized_key_idx on public.topics (normalized_key);
create index if not exists topics_scope_idx on public.topics (scope);
create index if not exists topics_status_idx on public.topics (status);
create index if not exists topics_heat_score_idx on public.topics (heat_score);
create unique index if not exists topics_scope_key_idx on public.topics (scope, normalized_key);
create index if not exists action_events_device_created_idx on public.action_events (device_hash, created_at);

revoke all on all tables in schema public from anon, authenticated;

alter table public.flames enable row level security;
alter table public.flame_reactions enable row level security;
alter table public.reports enable row level security;
alter table public.topics enable row level security;
alter table public.action_events enable row level security;
