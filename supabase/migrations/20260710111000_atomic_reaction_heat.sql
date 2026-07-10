create or replace function public.increment_flame_heat(target_flame_id uuid)
returns integer
language sql
set search_path = public
as $$
  update public.flames
  set heat_score = heat_score + 1,
      updated_at = now()
  where id = target_flame_id
    and status = 'live'
    and expires_at > now()
  returning heat_score;
$$;

revoke all on function public.increment_flame_heat(uuid) from public, anon, authenticated;
grant execute on function public.increment_flame_heat(uuid) to service_role;
