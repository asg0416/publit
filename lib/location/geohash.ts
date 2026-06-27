const GEOHASH_ALPHABET = '0123456789bcdefghjkmnpqrstuvwxyz';

export function encodeGrid(latitudeValue: number, longitudeValue: number, precision = 6): string {
  if (!Number.isFinite(latitudeValue) || !Number.isFinite(longitudeValue)) {
    throw new Error('INVALID_POSITION');
  }

  let evenBit = true;
  let bit = 0;
  let charIndex = 0;
  let hash = '';
  let latMin = -90;
  let latMax = 90;
  let lonMin = -180;
  let lonMax = 180;

  while (hash.length < precision) {
    if (evenBit) {
      const mid = (lonMin + lonMax) / 2;
      if (longitudeValue >= mid) {
        charIndex = (charIndex << 1) + 1;
        lonMin = mid;
      } else {
        charIndex <<= 1;
        lonMax = mid;
      }
    } else {
      const mid = (latMin + latMax) / 2;
      if (latitudeValue >= mid) {
        charIndex = (charIndex << 1) + 1;
        latMin = mid;
      } else {
        charIndex <<= 1;
        latMax = mid;
      }
    }

    evenBit = !evenBit;
    if (++bit === 5) {
      hash += GEOHASH_ALPHABET[charIndex];
      bit = 0;
      charIndex = 0;
    }
  }

  return `g:${hash}`;
}
