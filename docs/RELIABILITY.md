# Reliability

## Failure Modes

- Location denied: show manual refresh fallback and quiet browsing copy.
- Edge Function failure: keep existing radar state, show non-blocking error, allow retry.
- Slot full: show active live flames and extinguish options.
- Duplicate reaction/report: keep response idempotent and do not expose exact counts.
- Trace lifecycle: hide individual text even if stale client state exists.
- Existing server on port 3000: Playwright uses localhost:3217 to avoid reusing an unrelated app.

## Verification

Run:

```bash
npm test
npm run lint
npm run build
npm run e2e
npm run harness:verify
npm run harness:smoke:tags
npm run harness:smoke:create
```
