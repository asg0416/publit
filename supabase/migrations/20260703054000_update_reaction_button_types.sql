alter table public.flame_reactions
  drop constraint if exists flame_reactions_reaction_type_check;

update public.flame_reactions
set reaction_type = 'neutral'
where reaction_type = 'need_source';

alter table public.flame_reactions
  add constraint flame_reactions_reaction_type_check
  check (reaction_type in ('similar', 'curious', 'neutral', 'disagree', 'watching'));
