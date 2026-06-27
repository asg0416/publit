# Generated DB Schema Summary

Source migration: `supabase/migrations/20260627201829_init_publit_harness.sql`

## Tables

- `public.flames`
- `public.flame_reactions`
- `public.reports`
- `public.topics`
- `public.action_events`

## Privacy

The schema intentionally has no raw lat/lng, raw latitude, raw longitude, coordinates, or raw_location columns. Flames store only a coarse `geohash` grid key.

## RLS

RLS is enabled on all public tables. Direct `anon` and `authenticated` table access is revoked; public behavior goes through Edge Functions.
