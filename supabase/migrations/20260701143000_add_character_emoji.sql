alter table public.flames
  add column if not exists character_emoji text
    check (
      character_emoji is null
      or (
        char_length(character_emoji) between 1 and 16
        and character_emoji !~ '[[:alnum:][:space:]]'
      )
    );

create index if not exists flames_character_emoji_idx on public.flames (character_emoji);
