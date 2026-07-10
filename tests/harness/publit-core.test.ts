import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  computeLifecycle,
  detectBlockedContent,
  encodeGrid,
  getGridPrefixesForRange,
  getGridCellCenter,
  getGridCellRadiusMeters,
  getHeatLabel,
  isRateLimited,
  normalizeTag,
  sanitizeFlameForResponse,
  sanitizeCommentForResponse,
  selectActiveSlotState,
  summarizeReactionRows,
  suggestTagsForText,
  validateCommentBody,
  validateCustomReactionLabel,
  validateReactionType,
} from '../../supabase/functions/_shared/publit.ts';

describe('Publit shared Edge Function core', () => {
  it('turns raw coordinates into a coarse grid key and never echoes coordinates', () => {
    const grid = encodeGrid(35.1795, 129.0756);

    assert.match(grid, /^g:[a-z0-9]{5,8}$/);
    assert.doesNotMatch(grid, /35\.1795|129\.0756/);
  });

  it('covers nearby grid cells that intersect the selected thought radius', () => {
    const centerGrid = encodeGrid(35.1795, 129.0756);
    const grids50m = getGridPrefixesForRange(35.1795, 129.0756, '50m');
    const grids1km = getGridPrefixesForRange(35.1795, 129.0756, '1km');

    assert.ok(grids50m.some((prefix) => centerGrid.startsWith(prefix)));
    assert.ok(grids1km.some((prefix) => centerGrid.startsWith(prefix)));
    assert.ok(grids1km.length > grids50m.length);
    assert.ok(grids1km.every((grid) => /^g:[a-z0-9]{6}$/.test(grid)));
  });

  it('covers nearby fine and legacy grid cells through coarse query prefixes', () => {
    const center = getGridCellCenter('g:wy78p4um');
    assert.ok(center);
    const prefixes = getGridPrefixesForRange(center.lat, center.lng, '500m');

    assert.ok(prefixes.some((prefix) => 'g:wy78p4ek'.startsWith(prefix)));
    assert.ok(prefixes.some((prefix) => 'g:wy78p4'.startsWith(prefix)));
    assert.ok((getGridCellRadiusMeters('g:wy78p4') ?? 0) > (getGridCellRadiusMeters('g:wy78p4ek') ?? 0));
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
      character_key: 'fox',
      character_emoji: '🌶️',
      region_label: '근처',
      region_code: 'busan',
      display_scope: 'nearby',
      geohash: 'g:wydm6',
      device_hash: 'secret-device-hash',
      lat: 35.1795,
      lng: 129.0756,
      reactionCount: 7,
    }, new Date('2026-06-28T02:00:00.000Z'));

    assert.deepEqual(Object.keys(response).sort(), [
      'category',
      'characterEmoji',
      'characterKey',
      'createdAt',
      'displayScope',
      'heatLabel',
      'id',
      'lifecycle',
      'liveUntil',
      'mood',
      'regionCode',
      'regionLabel',
      'selfStrength',
      'sourceLocale',
      'tagLabel',
      'tagNormalized',
      'text',
    ]);
    assert.equal(response.characterKey, 'fox');
    assert.equal(response.characterEmoji, '🌶️');
    assert.equal(response.displayScope, 'nearby');
    assert.equal(response.regionLabel, '근처');
    assert.equal(response.regionCode, 'busan');
    assert.equal(response.heatLabel, '요즘 이 태그가 모여요');
    assert.equal(JSON.stringify(response).includes('35.1795'), false);
    assert.equal(JSON.stringify(response).includes('129.0756'), false);
    assert.equal(JSON.stringify(response).includes('secret-device-hash'), false);
    assert.equal(JSON.stringify(response).includes('reactionCount'), false);
  });

  it('drops non-emoji custom character values from sanitized flame responses', () => {
    const response = sanitizeFlameForResponse({
      id: 'flame-custom-bad',
      text: '문자 캐릭터는 허용하지 않는다.',
      tag_label: '#지금생각',
      tag_normalized: '지금생각',
      category: 'daily',
      mood: 'quiet',
      self_strength: 1,
      heat_score: 0,
      status: 'live',
      created_at: '2026-06-28T01:00:00.000Z',
      live_until: '2026-06-28T04:00:00.000Z',
      ember_until: '2026-06-29T04:00:00.000Z',
      trace_until: '2026-07-06T04:00:00.000Z',
      character_emoji: 'abc',
    }, new Date('2026-06-28T02:00:00.000Z'));

    assert.equal('characterEmoji' in response, false);
  });

  it('validates and sanitizes anonymous comments without exposing device identity', () => {
    assert.equal(validateCommentBody('  나도 방금 그 생각 했어  '), '나도 방금 그 생각 했어');
    assert.throws(() => validateCommentBody(''), /INVALID_COMMENT/);
    assert.throws(() => validateCommentBody('x'.repeat(161)), /INVALID_COMMENT/);

    const response = sanitizeCommentForResponse({
      id: 'comment-1',
      flame_id: 'flame-1',
      body: '근처에서 나도 봤어',
      status: 'visible',
      device_hash: 'secret-device-hash',
      created_at: '2026-07-06T01:00:00.000Z',
    });

    assert.deepEqual(response, {
      id: 'comment-1',
      body: '근처에서 나도 봤어',
      createdAt: '2026-07-06T01:00:00.000Z',
    });
  });

  it('expires thoughts at the configured delete boundary instead of keeping bodyless traces', () => {
    const response = sanitizeFlameForResponse({
      id: 'flame-2',
      text: '기준 시간이 지나면 공간 분위기로 남지 않는다.',
      tag_label: '#지역교통',
      tag_normalized: '지역교통',
      category: 'local',
      mood: 'quiet',
      self_strength: 1,
      heat_score: 2,
      status: 'live',
      created_at: '2026-06-28T01:00:00.000Z',
      live_until: '2026-06-28T04:00:00.000Z',
      ember_until: '2026-06-29T04:00:00.000Z',
      trace_until: '2026-07-06T04:00:00.000Z',
      expires_at: '2026-06-28T04:00:00.000Z',
      geohash: 'g:wydm6',
      device_hash: 'secret-device-hash',
    }, new Date('2026-06-28T04:00:00.000Z'));

    assert.equal(response.lifecycle, 'expired');
    assert.equal(response.text, '기준 시간이 지나면 공간 분위기로 남지 않는다.');
  });

  it('computes live directly to expired at expires_at', () => {
    const flame = {
      status: 'live',
      live_until: '2026-06-28T04:00:00.000Z',
      ember_until: '2026-06-29T04:00:00.000Z',
      trace_until: '2026-07-06T04:00:00.000Z',
      expires_at: '2026-06-28T04:00:00.000Z',
    };

    assert.equal(computeLifecycle(flame, new Date('2026-06-28T03:59:59.000Z')), 'live');
    assert.equal(computeLifecycle(flame, new Date('2026-06-28T04:00:00.000Z')), 'expired');
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

  it('accepts the public reaction button set used by the detail sheet', () => {
    for (const reaction of ['similar', 'curious', 'neutral', 'disagree', 'watching']) {
      assert.equal(validateReactionType(reaction), reaction);
    }
    assert.equal(validateReactionType('custom'), 'custom');
    assert.equal(validateCustomReactionLabel('  완전 공감  '), '완전 공감');
    assert.throws(() => validateCustomReactionLabel(''), /INVALID_REACTION_LABEL/);
    assert.throws(() => validateCustomReactionLabel('x'.repeat(19)), /INVALID_REACTION_LABEL/);
    assert.throws(() => validateReactionType('need_source'), /INVALID_REACTION_TYPE/);
  });

  it('summarizes custom reaction labels with my reacted state', () => {
    const reactions = summarizeReactionRows([
      { reaction_type: 'similar', device_hash: 'device-a' },
      { reaction_type: 'custom', reaction_label: '완전 공감', device_hash: 'device-a' },
      { reaction_type: 'custom', reaction_label: '완전 공감', device_hash: 'device-b' },
      { reaction_type: 'custom', reaction_label: '글쎄', device_hash: 'device-c' },
    ], 'device-a');

    const custom = reactions.filter((reaction) => reaction.type === 'custom');
    assert.deepEqual(custom, [
      { type: 'custom', label: '완전 공감', count: 2, reacted: true, custom: true },
      { type: 'custom', label: '글쎄', count: 1, reacted: false, custom: true },
    ]);
  });

  it('keeps user-entered tags intact while still suggesting and blocking unsafe content', () => {
    assert.deepEqual(normalizeTag('  #부정선거!! '), {
      label: '#부정선거',
      normalized: '부정선거',
    });
    assert.deepEqual(normalizeTag('  #투표용지 부족!! '), {
      label: '#투표용지부족',
      normalized: '투표용지부족',
    });
    assert.equal(detectBlockedContent('특정인 주소를 공개하고 찾아가자').blocked, true);
    assert.equal(getHeatLabel(0), '방금 떠오른 생각');
    assert.equal(getHeatLabel(18), '근처에서 자주 보여요');

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
