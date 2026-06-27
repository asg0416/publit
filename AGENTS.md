# AGENTS.md

This file is the first operating contract for any agent working on Publit.

## Non-Negotiables

- Never use a 지도 API or map SDK. Google Maps, Naver Map, Kakao Map, Mapbox, Leaflet, map markers, and real coordinate marker UI are forbidden.
- Never persist raw lat/lng, raw latitude, raw longitude, raw coordinates, or raw_location values.
- Never return raw lat/lng, raw coordinates, device_hash, exact reaction counts, exact report counts, view counts, or user counts to the client.
- Never expose a Supabase service role key in browser code, `NEXT_PUBLIC_*`, tracked env files, logs, docs, or chat.
- Keep Supabase Auth out of the MVP. Identity is an anonymous local device id hashed before server use.
- Work harness-first. Add or update a failing harness test before behavior changes, then make it pass.

## Required Commands

```bash
npm run harness:test
npm run harness:verify
```

Use remote smoke checks after Edge Function or schema changes:

```bash
npm run harness:smoke:tags
npm run harness:smoke:create
```

## Implementation Rules

- Prefer small files with one clear responsibility.
- Keep raw browser Geolocation values transient. They may be sent to Edge Functions only so the server can derive a coarse grid key.
- API responses must pass through privacy-safe mapping helpers.
- UI should communicate "space radar" rather than "map."
- Do not build login, profiles, following, DM, chat, or a map surface for this MVP.

## Current Focus

Build the mobile web MVP around the question: "Do people want to see anonymous thought flames floating in their current space?"
