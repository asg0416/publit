# Quality Score

Publit quality is scored by harness gates before polish.

## Required To Ship

- Harness tests pass.
- Playwright e2e tests pass.
- No map SDK package or import exists.
- Raw lat/lng is absent from DB schema and API responses.
- Supabase advisors report no warning-level security or performance issues.
- Mobile viewport has no overlapping controls or clipped critical text.

## Current Baseline

- DB/Edge Function harness: passing.
- Docs/agent structure harness: passing.
- Client/UI/e2e harness: passing.
- Remote Supabase advisors: no warning-level security or performance issues.
- npm audit high-level gate: 0 vulnerabilities.

## Remaining Product Risk

- The MVP uses mocked browser flows for e2e and smoke tests for deployed Edge Functions; a future pre-release pass should run a manual mobile device check against the deployed URL.
- Supabase CLI reports a newer version is available, but current checks pass on the installed CLI.
