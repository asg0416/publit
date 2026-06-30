import { encodeGrid } from './geohash.ts';

export type LastLocationFetch = {
  lat: number;
  lng: number;
  grid: string;
  fetchedAt: number;
};

export type NextLocationSignal = {
  lat: number;
  lng: number;
  grid?: string;
  now: number;
  force?: boolean;
};

export function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const radius = 6_371_000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(h));
}

export function shouldRefreshLocation(previous: LastLocationFetch | null, next: NextLocationSignal): boolean {
  if (next.force) return true;
  if (!previous) return true;
  if (next.now - previous.fetchedAt < 30_000) return false;

  const nextGrid = next.grid ?? encodeGrid(next.lat, next.lng);
  if (nextGrid !== previous.grid) return true;

  return distanceMeters(previous, next) >= 100;
}
