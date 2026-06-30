alter table public.flames
  add column if not exists character_key text
    check (character_key is null or character_key in ('turtle', 'chick', 'fox', 'dog', 'butterfly', 'bug')),
  add column if not exists region_code text
    check (region_code is null or char_length(region_code) <= 40),
  add column if not exists display_scope text
    check (display_scope is null or display_scope in ('nearby', 'district', 'regional', 'national'));

create index if not exists flames_character_key_idx on public.flames (character_key);
create index if not exists flames_display_scope_idx on public.flames (display_scope);
create index if not exists flames_region_code_idx on public.flames (region_code);
