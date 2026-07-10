# Publit Architecture

Publit is a mobile-first Next.js + Supabase service for viewing anonymous live thoughts in a location-aware space over a MapGlot background.

## System Shape

- `app/`: Next.js App Router entrypoints.
- `components/`: mobile UI, radar, flame sheets, location gate, and small primitives.
- `lib/`: client-side device hash, location throttling, Supabase Edge Function calls, flame types, tag normalization, heat labels, and particle simulation.
- `supabase/migrations/`: Postgres schema with no raw lat/lng columns.
- `supabase/functions/`: public Edge Functions that validate input, derive coarse grid keys, enforce action limits, and sanitize responses.
- `tests/harness/`: harness contracts for privacy, rate-limit, lifecycle, approved MapGlot background usage, and docs structure.
- `docs/`: product, design, reliability, security, and execution context for future agents.

## Privacy Boundary

The browser may read raw Geolocation values. Those values are sent only to Edge Functions and are immediately converted to a coarse `geohash` grid key. Raw latitude, longitude, coordinates, and raw_location are never persisted and never returned.

## API Boundary

All public mutations go through Edge Functions. The client uses the Supabase publishable key. The Supabase service role key is server-only inside Edge Functions and must never appear in `NEXT_PUBLIC_*`.

## UX Boundary

The core visual metaphor is a circular thought range over a geographic map. Thoughts have simulated screen positions, drift, attraction by tag/category, and cluster aura. They are never exposed as precise coordinate markers.

## Harness Boundary

Every important rule is backed by a harness test or smoke check. Harness failures are product failures, not optional test failures.
