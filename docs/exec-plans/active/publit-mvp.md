# Publit MVP Execution Plan

## Goal

Build the mobile web MVP end-to-end while keeping privacy, rate-limit, lifecycle, no-map, and secret handling under harness control.

## Status

Complete for the current MVP slice: Supabase schema, Edge Functions, harness structure, mobile radar UI, create/detail/reaction/report/slots, moving-location core, README, and verification gates are implemented.

## Red

- Harness tests were added for DB privacy, Edge Function contracts, frontend scaffold, frontend core movement/particle logic, and docs structure.
- Playwright tests cover empty state, no-map SDK policy, radar home, flame creation, live slot handling, flame detail/reaction/report, hot tags, tag suggestions, unsafe text blocking, and coordinate non-exposure.

## Green

- Edge Functions validate inputs, derive coarse grid keys, enforce rate limits/slots, and sanitize responses.
- The client stores only a local device id and sends a SHA-256 deviceHash.
- The radar uses simulated client-side particles, tag/category attraction, and cluster aura without map SDKs.
- README and harness docs describe local setup, env boundaries, and verification.

## Verify

Last verified commands:

- `npm test`
- `npm run lint`
- `npm run build`
- `npm run e2e`
- `npm audit --audit-level=high`
- `npm run harness:verify`
- `npm run harness:smoke:tags`
- `npm run harness:smoke:create`

## Safety Notes

- Privacy is blocking.
- Lifecycle is blocking.
- No-map policy is blocking.
- Supabase service role exposure is blocking.
