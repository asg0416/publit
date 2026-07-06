alter table public.flames
  add column if not exists expires_at timestamptz,
  add column if not exists extension_count int not null default 0
    check (extension_count >= 0);

update public.flames
set expires_at = coalesce(expires_at, live_until, trace_until, created_at + interval '1 day')
where expires_at is null;

alter table public.flames
  alter column expires_at set not null,
  alter column expires_at set default (now() + interval '1 day');

create table if not exists public.flame_comments (
  id uuid primary key default gen_random_uuid(),
  flame_id uuid not null references public.flames(id) on delete cascade,
  device_hash text not null check (char_length(device_hash) between 32 and 128),
  body text not null check (char_length(body) between 1 and 160),
  status text not null default 'visible' check (status in ('visible', 'hidden', 'deleted')),
  created_at timestamptz not null default now()
);

create table if not exists public.report_reviews (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  flame_id uuid not null references public.flames(id) on delete cascade,
  action text not null check (action in ('keep', 'hide', 'delete')),
  admin_note text check (admin_note is null or char_length(admin_note) <= 240),
  created_at timestamptz not null default now()
);

alter table public.action_events
  drop constraint if exists action_events_action_type_check;

alter table public.action_events
  add constraint action_events_action_type_check
  check (action_type in ('create_flame', 'react_flame', 'report_flame', 'extinguish_flame', 'create_comment', 'extend_flame'));

create index if not exists flames_expires_at_idx on public.flames (expires_at);
create index if not exists flames_extension_count_idx on public.flames (extension_count);
create index if not exists flame_comments_flame_created_idx on public.flame_comments (flame_id, created_at);
create index if not exists flame_comments_status_idx on public.flame_comments (status);
create index if not exists flame_comments_device_created_idx on public.flame_comments (device_hash, created_at);
create index if not exists report_reviews_report_created_idx on public.report_reviews (report_id, created_at);
create index if not exists report_reviews_flame_created_idx on public.report_reviews (flame_id, created_at);

alter table public.flame_comments enable row level security;
alter table public.report_reviews enable row level security;
