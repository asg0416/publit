# Publit Harness Engineering

Publit is built harness-first. The MVP is not considered healthy because a screen renders; it is healthy only when its privacy, rate-limit, lifecycle, moderation, and no-map contracts keep passing.

## Harness Gates

- `privacy`: raw lat/lng, latitude/longitude, coordinates, and raw_location must never be persisted or returned by APIs.
- `rate-limit`: create, react, report, and extinguish actions are guarded by device_hash action events.
- `lifecycle`: flames move through live -> ember -> trace -> expired, and trace hides body text.
- `slot`: one device_hash can have at most three live flames, excluding extinguished, ember, trace, and expired flames.
- `no-map`: map SDKs and map marker UI are forbidden. The browser Geolocation API may be used only to derive a coarse server grid.
- `secret hygiene`: service role keys never appear in client code, NEXT_PUBLIC variables, tracked env files, or chat.

## Commands

```bash
npm run harness:test
npm run harness:verify
npm run harness:smoke:tags
npm run harness:smoke:create
```

`harness:verify` runs local harness tests, checks the linked remote Supabase migration state, verifies remote raw lat/lng absence, runs Supabase security and performance advisors, and confirms deployed Edge Functions.

Remote smoke commands use only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from `.env.local`. They do not require `SUPABASE_SERVICE_ROLE_KEY`.

## Current Harness Files

- `harness.config.json`: machine-readable harness gates.
- `tests/harness/*.test.ts`: local contract tests.
- `scripts/harness-verify.mjs`: local + remote verification runner.
- `scripts/smoke-edge-function.mjs`: remote suggest-tags smoke test.
- `scripts/smoke-create-extinguish.mjs`: remote create/extinguish privacy smoke test.
- `supabase/migrations/*`: DB privacy, lifecycle, RLS, index, and uniqueness contracts.
- `supabase/functions/*`: Edge Function contracts for validation, privacy sanitization, and action limits.
