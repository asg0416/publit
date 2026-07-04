import type { ThoughtRangeValue } from '../flame/types.ts';

const EARTH_CIRCUMFERENCE_METERS = 40_075_016.686;
const TILE_SIZE = 512;
const DEFAULT_CIRCLE_RADIUS_PX = 160;

const RANGE_METERS: Partial<Record<ThoughtRangeValue, number>> = {
  '50m': 50,
  '100m': 100,
  '300m': 300,
  '500m': 500,
  '1km': 1_000,
  '3km': 3_000,
  '10km': 10_000,
};

const BROAD_RANGE_ZOOM: Record<Extract<ThoughtRangeValue, 'region' | 'national'>, number> = {
  region: 9,
  national: 6,
};

const RANGE_ZOOM_STEPS: ThoughtRangeValue[] = [
  '50m',
  '100m',
  '300m',
  '500m',
  '1km',
  '3km',
  '10km',
  'region',
  'national',
];

export function getThoughtRangeMeters(range: ThoughtRangeValue): number | null {
  return RANGE_METERS[range] ?? null;
}

export function getZoomForThoughtRange(
  range: ThoughtRangeValue,
  latitude: number,
  circleRadiusPx = DEFAULT_CIRCLE_RADIUS_PX,
): number {
  if (range === 'region' || range === 'national') return BROAD_RANGE_ZOOM[range];

  const rangeMeters = getThoughtRangeMeters(range);
  if (!rangeMeters) return 14;

  const latitudeRadians = (latitude * Math.PI) / 180;
  const metersPerPixelAtZoom0 = (EARTH_CIRCUMFERENCE_METERS * Math.cos(latitudeRadians)) / TILE_SIZE;
  const zoom = Math.log2((metersPerPixelAtZoom0 * circleRadiusPx) / rangeMeters);

  return Math.max(5, Math.min(18, Number(zoom.toFixed(2))));
}

export function getThoughtRangeForZoom(zoom: number, latitude: number): ThoughtRangeValue {
  if (!Number.isFinite(zoom)) return '500m';

  return RANGE_ZOOM_STEPS.reduce((closest, range) => {
    const closestDelta = Math.abs(getZoomForThoughtRange(closest, latitude) - zoom);
    const rangeDelta = Math.abs(getZoomForThoughtRange(range, latitude) - zoom);
    return rangeDelta < closestDelta ? range : closest;
  }, '500m' as ThoughtRangeValue);
}
