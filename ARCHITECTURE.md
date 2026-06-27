# Publit Architecture

Publit is a mobile-first Next.js + Supabase MVP for viewing anonymous "flames" in a nearby space. It is not a map product.

## System Shape

- `app/`: Next.js App Router entrypoints.
- `components/`: mobile UI, radar, flame sheets, location gate, and small primitives.
- `lib/`: client-side device hash, location throttling, Supabase Edge Function calls, flame types, tag normalization, heat labels, and particle simulation.
- `supabase/migrations/`: Postgres schema with no raw lat/lng columns.
- `supabase/functions/`: public Edge Functions that validate input, derive coarse grid keys, enforce action limits, and sanitize responses.
- `tests/harness/`: harness contracts for privacy, rate-limit, lifecycle, no-map SDK, and docs structure.
- `docs/`: product, design, reliability, security, and execution context for future agents.

## Privacy Boundary

The browser may read raw Geolocation values. Those values are sent only to Edge Functions and are immediately converted to a coarse `geohash` grid key. Raw latitude, longitude, coordinates, and raw_location are never persisted and never returned.

## API Boundary

All public mutations go through Edge Functions. The client uses the Supabase publishable key. The Supabase service role key is server-only inside Edge Functions and must never appear in `NEXT_PUBLIC_*`.

## UX Boundary

The core visual metaphor is a circular thought radar. Flames have simulated screen positions, drift, attraction by tag/category, and cluster aura. The UI must not look like map markers on a geographic surface.

## Harness Boundary

Every important rule is backed by a harness test or smoke check. Harness failures are product failures, not optional test failures.
