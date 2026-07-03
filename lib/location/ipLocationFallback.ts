export type IpLocationResult = {
  ok: true;
  source: 'vercel-ip';
  lat: number;
  lng: number;
  accuracyMeters: number;
  city?: string;
  region?: string;
  country?: string;
  timezone?: string;
} | {
  ok: false;
  source: 'vercel-ip';
  reason: 'missing-coordinate' | 'invalid-coordinate';
};

type HeaderReader = {
  get(name: string): string | null;
};

function parseCoordinate(value: string | null, min: number, max: number) {
  if (!value) return null;
  const coordinate = Number(value);
  if (!Number.isFinite(coordinate) || coordinate < min || coordinate > max) return Number.NaN;
  return coordinate;
}

function decodeHeaderValue(value: string | null) {
  if (!value) return undefined;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function parseIpLocationHeaders(headers: HeaderReader): IpLocationResult {
  const lat = parseCoordinate(headers.get('x-vercel-ip-latitude'), -90, 90);
  const lng = parseCoordinate(headers.get('x-vercel-ip-longitude'), -180, 180);

  if (lat === null || lng === null) {
    return { ok: false, source: 'vercel-ip', reason: 'missing-coordinate' };
  }
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return { ok: false, source: 'vercel-ip', reason: 'invalid-coordinate' };
  }

  return {
    ok: true,
    source: 'vercel-ip',
    lat,
    lng,
    accuracyMeters: 25_000,
    city: decodeHeaderValue(headers.get('x-vercel-ip-city')),
    region: decodeHeaderValue(headers.get('x-vercel-ip-country-region')),
    country: decodeHeaderValue(headers.get('x-vercel-ip-country')),
    timezone: decodeHeaderValue(headers.get('x-vercel-ip-timezone')),
  };
}
