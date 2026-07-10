alter table public.flames
  add column if not exists source_locale text not null default 'ko'
    check (source_locale in ('ko', 'en')),
  add column if not exists country_code text
    check (country_code is null or country_code ~ '^[A-Z]{2}$');

create index if not exists flames_scope_country_expires_idx
  on public.flames (display_scope, country_code, expires_at)
  where status = 'live';

create table if not exists public.flame_translations (
  flame_id uuid not null references public.flames(id) on delete cascade,
  locale text not null check (locale in ('ko', 'en')),
  translated_text text not null check (char_length(translated_text) between 1 and 80),
  provider text not null default 'google',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (flame_id, locale)
);

create index if not exists flame_translations_locale_idx
  on public.flame_translations (locale, updated_at desc);

alter table public.flame_translations enable row level security;
revoke all on public.flame_translations from anon, authenticated;
