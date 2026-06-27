import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { createDeviceHash, normalizeDeviceId } from '../../lib/device.ts';
import { shouldRefreshLocation } from '../../lib/location/useMovingLocationCore.ts';
import {
  createInitialParticles,
  simulateParticles,
  summarizeClusters,
} from '../../lib/flame/particleSimulation.ts';

describe('Publit frontend core harness', () => {
  it('normalizes local device ids and hashes without exposing the raw id', async () => {
    const raw = normalizeDeviceId('  device-with-spaces  ');
    const hash = await createDeviceHash(raw);

    assert.equal(raw, 'device-with-spaces');
    assert.match(hash, /^[a-f0-9]{64}$/);
    assert.notEqual(hash, raw);
  });

  it('refreshes moving location only after 30 seconds and meaningful movement', () => {
    const previous = {
      lat: 35.1795,
      lng: 129.0756,
      grid: 'g:wydm6',
      fetchedAt: 1_000,
    };

    assert.equal(shouldRefreshLocation(previous, { lat: 35.1796, lng: 129.0757, grid: 'g:wydm6', now: 20_000 }), false);
    assert.equal(shouldRefreshLocation(previous, { lat: 35.1806, lng: 129.0768, grid: 'g:wydm6', now: 20_000 }), false);
    assert.equal(shouldRefreshLocation(previous, { lat: 35.1806, lng: 129.0768, grid: 'g:wydm6', now: 40_000 }), true);
    assert.equal(shouldRefreshLocation(previous, { lat: 35.1796, lng: 129.0757, grid: 'g:wydm7', now: 40_000 }), true);
  });

  it('creates simulated radar particles without API coordinates and keeps them inside the radar', () => {
    const flames = [
      { id: '1', tagNormalized: '카페대화', tagLabel: '#카페대화', category: 'daily', selfStrength: 1, heatLabel: '방금 켜진 불꽃', lifecycle: 'live' },
      { id: '2', tagNormalized: '카페대화', tagLabel: '#카페대화', category: 'daily', selfStrength: 2, heatLabel: '반응이 생기고 있어요', lifecycle: 'live' },
      { id: '3', tagNormalized: '카페대화', tagLabel: '#카페대화', category: 'daily', selfStrength: 3, heatLabel: '이 불꽃이 조금 커지고 있어요', lifecycle: 'ember' },
      { id: '4', tagNormalized: '지역교통', tagLabel: '#지역교통', category: 'local', selfStrength: 2, heatLabel: '방금 켜진 불꽃', lifecycle: 'trace' },
    ] as const;

    const particles = createInitialParticles(flames, 240);
    const moved = simulateParticles(particles, 240, 8);
    const clusters = summarizeClusters(moved);

    for (const particle of moved) {
      assert.equal('lat' in particle, false);
      assert.equal('lng' in particle, false);
      assert.ok(Math.hypot(particle.x - 120, particle.y - 120) <= 120);
    }

    assert.equal(clusters.some((cluster) => cluster.tagNormalized === '카페대화' && cluster.count >= 3), true);
  });
});
