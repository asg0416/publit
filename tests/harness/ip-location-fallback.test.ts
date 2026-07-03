import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseIpLocationHeaders } from '../../lib/location/ipLocationFallback.ts';

function headers(values: Record<string, string | null>) {
  return {
    get(name: string) {
      return values[name.toLowerCase()] ?? null;
    },
  };
}

describe('IP location fallback header parsing', () => {
  it('extracts Vercel IP latitude and longitude without persisting raw coordinates', () => {
    const result = parseIpLocationHeaders(headers({
      'x-vercel-ip-latitude': '37.5665',
      'x-vercel-ip-longitude': '126.9780',
      'x-vercel-ip-city': '%EC%84%9C%EC%9A%B8',
      'x-vercel-ip-country-region': '11',
      'x-vercel-ip-country': 'KR',
      'x-vercel-ip-timezone': 'Asia/Seoul',
    }));

    assert.deepEqual(result, {
      ok: true,
      source: 'vercel-ip',
      lat: 37.5665,
      lng: 126.978,
      accuracyMeters: 25000,
      city: '서울',
      region: '11',
      country: 'KR',
      timezone: 'Asia/Seoul',
    });
  });

  it('rejects missing or invalid coordinate headers', () => {
    assert.deepEqual(parseIpLocationHeaders(headers({})), {
      ok: false,
      source: 'vercel-ip',
      reason: 'missing-coordinate',
    });
    assert.deepEqual(parseIpLocationHeaders(headers({
      'x-vercel-ip-latitude': '1000',
      'x-vercel-ip-longitude': '126.9780',
    })), {
      ok: false,
      source: 'vercel-ip',
      reason: 'invalid-coordinate',
    });
  });
});
