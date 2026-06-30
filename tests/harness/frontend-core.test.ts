import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { createDeviceHash, normalizeDeviceId } from '../../lib/device.ts';
import { shouldRefreshLocation } from '../../lib/location/useMovingLocationCore.ts';
import {
  createInitialParticles,
  simulateParticles,
  summarizeClusters,
} from '../../lib/flame/particleSimulation.ts';
import type { Flame } from '../../lib/flame/types.ts';
import { getThoughtRangeMeters, getZoomForThoughtRange } from '../../lib/map/rangeViewport.ts';
import { CHARACTER_EMOJI, characterKeyForThought } from '../../components/map/character.ts';

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
    assert.equal(shouldRefreshLocation(previous, { lat: 35.1795, lng: 129.0756, grid: 'g:wydm6', now: 2_000, force: true }), true);
  });

  it('maps thought ranges to camera zoom levels around the current center', () => {
    assert.equal(getThoughtRangeMeters('50m'), 50);
    assert.equal(getThoughtRangeMeters('500m'), 500);
    assert.equal(getThoughtRangeMeters('national'), null);

    const zoom50m = getZoomForThoughtRange('50m', 37.5665);
    const zoom500m = getZoomForThoughtRange('500m', 37.5665);
    const zoomNational = getZoomForThoughtRange('national', 37.5665);

    assert.ok(zoom50m > zoom500m);
    assert.ok(zoom500m > zoomNational);
    assert.ok(zoom50m <= 18);
    assert.ok(zoomNational >= 5);
  });

  it('keeps same-topic particles moving as one visible cluster', () => {
    const flames = [
      { id: 'same-1', tagNormalized: '카페대화', tagLabel: '#카페대화', category: 'daily', selfStrength: 2, heatLabel: '방금 떠오른 생각', lifecycle: 'live' },
      { id: 'same-2', tagNormalized: '카페대화', tagLabel: '#카페대화', category: 'daily', selfStrength: 2, heatLabel: '반응이 생기고 있어요', lifecycle: 'live' },
      { id: 'same-3', tagNormalized: '카페대화', tagLabel: '#카페대화', category: 'daily', selfStrength: 3, heatLabel: '요즘 이 태그가 모여요', lifecycle: 'live' },
      { id: 'other-1', tagNormalized: '지역교통', tagLabel: '#지역교통', category: 'local', selfStrength: 2, heatLabel: '방금 떠오른 생각', lifecycle: 'live' },
    ] as const;

    const moved = simulateParticles(createInitialParticles(flames, 320), 320, 180);
    const sameTag = moved.filter((particle) => particle.tagNormalized === '카페대화');
    const maxDistance = Math.max(...sameTag.flatMap((particle) =>
      sameTag.map((other) => Math.hypot(particle.x - other.x, particle.y - other.y))
    ));

    assert.ok(maxDistance < 58);
  });

  it('keeps thought particles inside the visible range while preserving click separation', () => {
    const flames = Array.from({ length: 10 }, (_, index) => ({
      id: `dense-${index}`,
      tagNormalized: index < 7 ? '카페대화' : '지역교통',
      tagLabel: index < 7 ? '#카페대화' : '#지역교통',
      category: index < 7 ? 'daily' as const : 'local' as const,
      mood: 'curious' as const,
      selfStrength: 2 as const,
      heatLabel: '요즘 이 태그가 모여요',
      lifecycle: 'live' as const,
      createdAt: '2026-06-28T00:00:00.000Z',
    })) as readonly Flame[];

    const size = 320;
    const center = size / 2;
    const visibleRadius = 106;
    const particles = simulateParticles(createInitialParticles(flames, size), size, 240);

    for (const particle of particles) {
      assert.ok(Math.hypot(particle.x - center, particle.y - center) <= visibleRadius);
    }

    for (let index = 0; index < particles.length; index += 1) {
      for (let otherIndex = index + 1; otherIndex < particles.length; otherIndex += 1) {
        const distance = Math.hypot(particles[index].x - particles[otherIndex].x, particles[index].y - particles[otherIndex].y);
        assert.ok(distance >= 30);
      }
    }
  });

  it('creates simulated radar particles without API coordinates and keeps them inside the radar', () => {
    const flames = [
      { id: '1', tagNormalized: '카페대화', tagLabel: '#카페대화', category: 'daily', selfStrength: 1, heatLabel: '방금 떠오른 생각', lifecycle: 'live' },
      { id: '2', tagNormalized: '카페대화', tagLabel: '#카페대화', category: 'daily', selfStrength: 2, heatLabel: '반응이 생기고 있어요', lifecycle: 'live' },
      { id: '3', tagNormalized: '카페대화', tagLabel: '#카페대화', category: 'daily', selfStrength: 3, heatLabel: '요즘 이 태그가 모여요', lifecycle: 'ember' },
      { id: '4', tagNormalized: '지역교통', tagLabel: '#지역교통', category: 'local', selfStrength: 2, heatLabel: '방금 떠오른 생각', lifecycle: 'trace' },
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

  it('uses stable character keys instead of raw emoji in thought data', () => {
    const first = characterKeyForThought({ id: 'thought-1', tagNormalized: '카페대화' });
    const second = characterKeyForThought({ id: 'thought-1', tagNormalized: '카페대화' });
    const explicit = characterKeyForThought({ id: 'thought-2', tagNormalized: '지역교통', characterKey: 'fox' });

    assert.equal(CHARACTER_EMOJI.turtle, '🐢');
    assert.match(first, /^(turtle|chick|fox|dog|butterfly|bug)$/);
    assert.equal(first, second);
    assert.equal(explicit, 'fox');
  });
});
