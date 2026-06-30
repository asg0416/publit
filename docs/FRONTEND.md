# Frontend

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Playwright

## Client Responsibilities

- Create and store `publit_device_id` in localStorage.
- Hash the device id with SHA-256 before sending `deviceHash`.
- Request browser Geolocation only after an explicit user action in the foreground.
- Use single-shot Geolocation reads for the MVP; do not start continuous `watchPosition` tracking.
- Poll nearby thoughts while a location is active so anonymous thoughts from other devices appear without a manual reload.
- Call moving-location refresh no more than once per 30 seconds and only after meaningful movement or grid change.
- Generate character overlay positions on the client. API coordinates are forbidden.
- Load MapGlot only in the browser with `NEXT_PUBLIC_MAPGLOT_KEY`; never add MapGlot markers for thoughts.

## Components

- `components/location/LocationGate.tsx`
- `components/location/useMovingLocation.ts`
- `components/map/MapBackground.tsx`
- `components/map/ThoughtOverlay.tsx`
- `components/map/RangeControl.tsx`
- `components/map/RangeCircle.tsx`
- `components/flame/CreateFlameSheet.tsx`
- `components/flame/FlameDetailSheet.tsx`
- `components/flame/HotTagTicker.tsx`
- `components/flame/MyFlameSlots.tsx`
- `components/flame/ReactionBar.tsx`
- `components/flame/ReportDialog.tsx`

## No-Map Rule

Do not install or import map SDK packages. Load the official MapGlot browser SDK for the full-screen background map only. Do not render map pins, map marker UI, or actual coordinate markers for thoughts.
