alter table public.flame_reactions
  add column if not exists reaction_label text
    check (
      reaction_label is null
      or char_length(reaction_label) between 1 and 18
    );

alter table public.flame_reactions
  drop constraint if exists flame_reactions_reaction_type_check;

alter table public.flame_reactions
  add constraint flame_reactions_reaction_type_check
  check (reaction_type in ('similar', 'curious', 'neutral', 'disagree', 'watching', 'custom'));

drop index if exists flame_reactions_once_idx;

create unique index if not exists flame_reactions_fixed_once_idx
  on public.flame_reactions (flame_id, device_hash, reaction_type)
  where reaction_type <> 'custom';

create unique index if not exists flame_reactions_custom_once_idx
  on public.flame_reactions (flame_id, device_hash, reaction_label)
  where reaction_type = 'custom';

create index if not exists flame_reactions_label_idx
  on public.flame_reactions (flame_id, reaction_label)
  where reaction_type = 'custom';
