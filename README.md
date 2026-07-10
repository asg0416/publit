# Publit

Publit is a mobile-first global anonymous thought map. Users can open the web app, allow browser geolocation or use the server IP fallback, and see short live thoughts moving inside a range circle over a MapGlot background. Thoughts are never rendered as precise map pins, and the service has no profiles, login, DM, or chat.

## Stack

- Next.js App Router + TypeScript + Tailwind CSS
- Supabase Postgres + Edge Functions
- Zod-style validation boundaries in Edge Functions
- Playwright + local harness tests

## macOS Setup

```bash
brew install node
brew install supabase/tap/supabase
npm install
npx playwright install chromium
```

## Environment

Create `.env.local` from `.env.local.example`.

```bash
NEXT_PUBLIC_SUPABASE_URL=https://mkqodslvmysgqwabazfm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_publishable_key

# Server-only. Never expose this with NEXT_PUBLIC_ and do not paste it into chat.
SUPABASE_SERVICE_ROLE_KEY=your_local_or_edge_function_secret
```

The browser uses only the `NEXT_PUBLIC_` values. Service role keys are for Supabase Edge Function/server environments only.

## Local Development

```bash
supabase start
npm run dev
```

Open `http://localhost:3000`.

## Verification

```bash
npm run lint
npm test
npm run build
npm run e2e
npm run harness:verify
npm run harness:smoke:tags
npm run harness:smoke:create
```

`harness:verify` checks local contracts, linked Supabase migrations, raw-coordinate absence, Supabase advisors, and deployed Edge Functions.

## Non-Negotiables

- Never store raw `lat`, `lng`, `latitude`, `longitude`, `coordinates`, or `raw_location`.
- Never return raw coordinates or `device_hash` to the UI.
- Never install or import Google Maps, Naver Map, Kakao Map, Mapbox, Leaflet, or legacy map SDK packages. MapGlot is loaded as the approved browser-only background provider.
- Use browser Geolocation only to send transient coordinates to Edge Functions, where they become coarse grid keys.
- Keep anonymous device identity as a local device id hashed before server use.
