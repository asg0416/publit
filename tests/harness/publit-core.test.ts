import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  computeLifecycle,
  detectBlockedContent,
  encodeGrid,
  getHeatLabel,
  isRateLimited,
  normalizeTag,
  sanitizeFlameForResponse,
  selectActiveSlotState,
  suggestTagsForText,
} from '../../supabase/functions/_shared/publit.ts';

describe('Publit shared Edge Function core', () => {
  it('turns raw coordinates into a coarse grid key and never echoes coordinates', () => {
    const grid = encodeGrid(35.1795, 129.0756);

    assert.match(grid, /^g:[a-z0-9]{5,8}$/);
    assert.doesNotMatch(grid, /35\.1795|129\.0756/);
  });

  it('sanitizes flame responses for privacy and exact-count hiding', () => {
    const response = sanitizeFlameForResponse({
      id: 'flame-1',
      text: '방금 옆자리에서 선거 얘기를 들었는데 이상하게 느껴졌다.',
      tag_label: '#투표용지이슈',
      tag_normalized: '투표용지이슈',
      category: 'politics',
      mood: 'curious',
      self_strength: 2,
      heat_score: 7,
      status: 'live',
      created_at: '2026-06-28T01:00:00.000Z',
      live_until: '2026-06-28T04:00:00.000Z',
      ember_until: '2026-06-29T04:00:00.000Z',
      trace_until: '2026-07-06T04:00:00.000Z',
      geohash: 'g:wydm6',
      device_hash: 'secret-device-hash',
      lat: 35.1795,
      lng: 129.0756,
      reactionCount: 7,
    }, new Date('2026-06-28T02:00:00.000Z'));

    assert.deepEqual(Object.keys(response).sort(), [
      'category',
      'createdAt',
      'emberUntil',
      'heatLabel',
      'id',
      'lifecycle',
      'liveUntil',
      'mood',
      'selfStrength',
      'tagLabel',
      'tagNormalized',
      'text',
    ]);
    assert.equal(response.heatLabel, '이 불꽃이 조금 커지고 있어요');
    assert.equal(JSON.stringify(response).includes('35.1795'), false);
    assert.equal(JSON.stringify(response).includes('129.0756'), false);
    assert.equal(JSON.stringify(response).includes('secret-device-hash'), false);
    assert.equal(JSON.stringify(response).includes('reactionCount'), false);
  });

  it('hides trace body text while keeping aggregate tag/category signal', () => {
    const response = sanitizeFlameForResponse({
      id: 'flame-2',
      text: 'trace 상태에서는 본문이 노출되면 안 된다.',
      tag_label: '#지역교통',
      tag_normalized: '지역교통',
      category: 'local',
      mood: 'quiet',
      self_strength: 1,
      heat_score: 2,
      status: 'trace',
      created_at: '2026-06-28T01:00:00.000Z',
      live_until: '2026-06-28T04:00:00.000Z',
      ember_until: '2026-06-29T04:00:00.000Z',
      trace_until: '2026-07-06T04:00:00.000Z',
      geohash: 'g:wydm6',
      device_hash: 'secret-device-hash',
    });

    assert.equal(response.lifecycle, 'trace');
    assert.equal('text' in response, false);
    assert.equal(response.tagLabel, '#지역교통');
  });

  it('computes live to ember to trace to expired lifecycle boundaries', () => {
    const flame = {
      status: 'live',
      live_until: '2026-06-28T04:00:00.000Z',
      ember_until: '2026-06-29T04:00:00.000Z',
      trace_until: '2026-07-06T04:00:00.000Z',
    };

    assert.equal(computeLifecycle(flame, new Date('2026-06-28T03:59:59.000Z')), 'live');
    assert.equal(computeLifecycle(flame, new Date('2026-06-28T04:00:00.000Z')), 'ember');
    assert.equal(computeLifecycle(flame, new Date('2026-06-29T04:00:00.000Z')), 'trace');
    assert.equal(computeLifecycle(flame, new Date('2026-07-06T04:00:00.000Z')), 'expired');
  });

  it('limits actions to one per 30 seconds or three per minute', () => {
    const now = new Date('2026-06-28T05:00:00.000Z');

    assert.equal(isRateLimited([
      '2026-06-28T04:59:40.000Z',
    ], now).limited, true);
    assert.equal(isRateLimited([
      '2026-06-28T04:59:01.000Z',
      '2026-06-28T04:59:20.000Z',
      '2026-06-28T04:59:31.000Z',
    ], now).limited, true);
    assert.equal(isRateLimited([
      '2026-06-28T04:58:00.000Z',
      '2026-06-28T04:59:00.000Z',
    ], now).limited, false);
  });

  it('reports active slot state without counting extinguished, ember, trace, or expired flames', () => {
    const state = selectActiveSlotState([
      { id: '1', status: 'live', tag_label: '#하나', created_at: '2026-06-28T01:00:00.000Z' },
      { id: '2', status: 'live', tag_label: '#둘', created_at: '2026-06-28T01:01:00.000Z' },
      { id: '3', status: 'ember', tag_label: '#잔불', created_at: '2026-06-28T01:02:00.000Z' },
      { id: '4', status: 'extinguished', tag_label: '#꺼짐', created_at: '2026-06-28T01:03:00.000Z' },
    ]);

    assert.equal(state.used, 2);
    assert.equal(state.limit, 3);
    assert.equal(state.isFull, false);
    assert.deepEqual(state.activeFlames.map((flame) => flame.id), ['2', '1']);
  });

  it('normalizes, softens, suggests, and blocks unsafe tags', () => {
    assert.deepEqual(normalizeTag('  #투표용지 부족!! '), {
      label: '#투표용지이슈',
      normalized: '투표용지이슈',
    });
    assert.equal(detectBlockedContent('특정인 주소를 공개하고 찾아가자').blocked, true);
    assert.equal(getHeatLabel(0), '방금 켜진 불꽃');
    assert.equal(getHeatLabel(18), '주변에서 이 불꽃이 뜨거워지고 있어요');

    const suggestions = suggestTagsForText('부산 카페에서 선거랑 투표 얘기를 들었다', [
      { display_label: '#지역교통', normalized_key: '지역교통', category: 'local', scope: 'local', heat_score: 5 },
    ]);

    assert.deepEqual(suggestions.slice(0, 3), [
      { displayLabel: '#선거이슈', normalizedKey: '선거이슈', category: 'politics', source: 'text' },
      { displayLabel: '#정치대화', normalizedKey: '정치대화', category: 'politics', source: 'text' },
      { displayLabel: '#투표용지이슈', normalizedKey: '투표용지이슈', category: 'politics', source: 'text' },
    ]);
  });
});
