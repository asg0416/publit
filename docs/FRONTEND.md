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
- Call nearby refresh no more than once per 30 seconds and only after meaningful movement or grid change.
- Generate radar screen coordinates on the client. API coordinates are forbidden.

## Components

- `components/location/LocationGate.tsx`
- `components/location/useMovingLocation.ts`
- `components/radar/FlameRadar.tsx`
- `components/radar/FlameParticle.tsx`
- `components/radar/ClusterAura.tsx`
- `components/flame/CreateFlameSheet.tsx`
- `components/flame/FlameDetailSheet.tsx`
- `components/flame/HotTagTicker.tsx`
- `components/flame/MyFlameSlots.tsx`
- `components/flame/ReactionBar.tsx`
- `components/flame/ReportDialog.tsx`

## No-Map Rule

Do not install or import map SDKs. Do not render map tiles, map pins, map marker UI, or actual coordinate markers.
