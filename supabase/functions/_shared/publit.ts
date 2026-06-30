export type FlameCategory = 'politics' | 'local' | 'society' | 'safety' | 'daily' | 'other';
export type FlameMood = 'quiet' | 'curious' | 'serious' | 'want_talk';
export type FlameStatus = 'live' | 'ember' | 'trace' | 'extinguished' | 'reported' | 'hidden' | 'expired';
export type ReactionType = 'similar' | 'curious' | 'need_source' | 'watching';
export type ReportReason = 'misinformation' | 'doxxing' | 'violence' | 'illegal' | 'hate' | 'spam' | 'privacy' | 'other';
export type CharacterKey = 'turtle' | 'chick' | 'fox' | 'dog' | 'butterfly' | 'bug';
export type DisplayScope = 'nearby' | 'district' | 'regional' | 'national';

const GEOHASH_ALPHABET = '0123456789bcdefghjkmnpqrstuvwxyz';
const CHARACTER_KEYS: CharacterKey[] = ['turtle', 'chick', 'fox', 'dog', 'butterfly', 'bug'];

const CATEGORY_BY_KEYWORD: Array<[RegExp, FlameCategory]> = [
  [/선거|투표|정치|정책|후보|의혹|관리/, 'politics'],
  [/부산|지역|도로|버스|지하철|교통|동네/, 'local'],
  [/청년|사회|학교|회사|일자리/, 'society'],
  [/위험|무섭|안전|사고|폭력/, 'safety'],
  [/카페|대화|날씨|점심|공부|일상/, 'daily'],
];

const SOFTENED_TAGS: Array<[RegExp, string]> = [
  [/부정\s*선거|선거.*확정|확정.*선거/, '선거의혹'],
  [/투표\s*용지|용지\s*부족/, '투표용지이슈'],
  [/선관위|선거\s*관리/, '선거관리이슈'],
];

const RULE_SUGGESTIONS: Array<{
  pattern: RegExp;
  tags: Array<{ displayLabel: string; normalizedKey: string; category: FlameCategory; source: 'text' }>;
}> = [
  {
    pattern: /선거/,
    tags: [
      { displayLabel: '#선거이슈', normalizedKey: '선거이슈', category: 'politics', source: 'text' },
      { displayLabel: '#정치대화', normalizedKey: '정치대화', category: 'politics', source: 'text' },
    ],
  },
  {
    pattern: /투표/,
    tags: [
      { displayLabel: '#투표용지이슈', normalizedKey: '투표용지이슈', category: 'politics', source: 'text' },
      { displayLabel: '#자료확인', normalizedKey: '자료확인', category: 'politics', source: 'text' },
    ],
  },
  {
    pattern: /부산/,
    tags: [
      { displayLabel: '#부산', normalizedKey: '부산', category: 'local', source: 'text' },
      { displayLabel: '#지역이슈', normalizedKey: '지역이슈', category: 'local', source: 'text' },
    ],
  },
  {
    pattern: /무섭|위험|불안/,
    tags: [{ displayLabel: '#안전', normalizedKey: '안전', category: 'safety', source: 'text' }],
  },
  {
    pattern: /카페/,
    tags: [{ displayLabel: '#카페대화', normalizedKey: '카페대화', category: 'daily', source: 'text' }],
  },
  {
    pattern: /도로|버스|지하철|교통/,
    tags: [{ displayLabel: '#지역교통', normalizedKey: '지역교통', category: 'local', source: 'text' }],
  },
];

const BLOCKED_PATTERNS: Array<[RegExp, string]> = [
  [/주소.*공개|신상|전화번호|집\s*주소/, 'privacy'],
  [/찾아가자|죽이|때리|폭행|테러/, 'violence'],
  [/혐오|꺼져라|멸시/, 'hate'],
  [/불법\s*구매|마약|해킹/, 'illegal'],
  [/도배|광고|스팸/, 'spam'],
];

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

export function normalizeTag(rawTag: string): { label: string; normalized: string } {
  const raw = String(rawTag ?? '').trim();
  for (const [pattern, softened] of SOFTENED_TAGS) {
    if (pattern.test(raw.replace(/^#/, ''))) {
      return { label: `#${softened}`, normalized: softened };
    }
  }

  const normalized = raw
    .replace(/^#+/, '')
    .replace(/[^\p{Letter}\p{Number}_가-힣]/gu, '')
    .slice(0, 20);

  if (!normalized) {
    throw new Error('INVALID_TAG');
  }

  return { label: `#${normalized}`, normalized };
}

export function deriveCategory(text: string, tag = ''): FlameCategory {
  const combined = `${text} ${tag}`;
  for (const [pattern, category] of CATEGORY_BY_KEYWORD) {
    if (pattern.test(combined)) return category;
  }
  return 'other';
}

export function detectBlockedContent(input: string): { blocked: boolean; reason?: string } {
  for (const [pattern, reason] of BLOCKED_PATTERNS) {
    if (pattern.test(input)) return { blocked: true, reason };
  }
  return { blocked: false };
}

export function getHeatLabel(heatScore: number): string {
  if (heatScore >= 30) return '이야기가 모이고 있어요';
  if (heatScore >= 15) return '근처에서 자주 보여요';
  if (heatScore >= 5) return '요즘 이 태그가 모여요';
  if (heatScore >= 1) return '반응이 생기고 있어요';
  return '방금 떠오른 생각';
}

export function deriveCharacterKey(input: unknown): CharacterKey {
  const value = String(input ?? '');
  if ((CHARACTER_KEYS as string[]).includes(value)) return value as CharacterKey;

  let hash = 0;
  for (const char of value || 'thought') {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return CHARACTER_KEYS[hash % CHARACTER_KEYS.length];
}

export function validateDisplayScope(value: unknown): DisplayScope {
  if (value === 'nearby' || value === 'district' || value === 'regional' || value === 'national') return value;
  return 'nearby';
}

export function computeLifecycle(
  flame: Pick<Record<string, unknown>, 'status' | 'live_until' | 'ember_until' | 'trace_until'>,
  now = new Date(),
): FlameStatus {
  const status = flame.status as FlameStatus;
  if (['extinguished', 'reported', 'hidden', 'expired'].includes(status)) return status;

  const currentTime = now.getTime();
  if (status === 'trace') {
    return currentTime < new Date(String(flame.trace_until)).getTime() ? 'trace' : 'expired';
  }
  if (status === 'ember') {
    return currentTime < new Date(String(flame.ember_until)).getTime() ? 'ember' : 'trace';
  }
  if (currentTime < new Date(String(flame.live_until)).getTime()) return 'live';
  if (currentTime < new Date(String(flame.ember_until)).getTime()) return 'ember';
  if (currentTime < new Date(String(flame.trace_until)).getTime()) return 'trace';
  return 'expired';
}

export function sanitizeFlameForResponse(row: Record<string, unknown>, now = new Date()): Record<string, unknown> {
  const lifecycle = computeLifecycle(row, now);
  const response: Record<string, unknown> = {
    id: row.id,
    tagLabel: row.tag_label,
    tagNormalized: row.tag_normalized,
    category: row.category,
    mood: row.mood,
    selfStrength: row.self_strength,
    heatLabel: getHeatLabel(Number(row.heat_score ?? 0)),
    lifecycle,
    characterKey: deriveCharacterKey(row.character_key ?? row.id ?? row.tag_normalized),
    displayScope: validateDisplayScope(row.display_scope),
    regionLabel: row.region_label ?? '근처',
    regionCode: row.region_code ?? 'nearby',
    createdAt: row.created_at,
    liveUntil: row.live_until,
    emberUntil: row.ember_until,
  };

  if (lifecycle !== 'trace') {
    response.text = row.text;
  }

  return response;
}

export function isRateLimited(
  actionTimes: Array<string | Date>,
  now = new Date(),
): { limited: boolean; code?: 'ACTION_COOLDOWN' | 'ACTION_RATE_LIMIT' } {
  const currentTime = now.getTime();
  const previous = actionTimes
    .map((value) => new Date(value).getTime())
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => b - a);

  if (previous[0] !== undefined && currentTime - previous[0] < 30_000) {
    return { limited: true, code: 'ACTION_COOLDOWN' };
  }

  const inLastMinute = previous.filter((value) => currentTime - value > 0 && currentTime - value < 60_000);
  if (inLastMinute.length >= 3) {
    return { limited: true, code: 'ACTION_RATE_LIMIT' };
  }

  return { limited: false };
}

export function selectActiveSlotState(rows: Array<Record<string, unknown>>) {
  const activeFlames = rows
    .filter((row) => row.status === 'live')
    .sort((a, b) => new Date(String(b.created_at)).getTime() - new Date(String(a.created_at)).getTime())
    .map((row) => ({
      id: row.id,
      tagLabel: row.tag_label,
      status: row.status,
      createdAt: row.created_at,
    }));

  return {
    used: activeFlames.length,
    limit: 3,
    isFull: activeFlames.length >= 3,
    activeFlames,
  };
}

export function suggestTagsForText(
  text: string,
  hotTopics: Array<Record<string, unknown>> = [],
) {
  const suggestions: Array<{ displayLabel: string; normalizedKey: string; category: FlameCategory; source: string }> = [];
  const seen = new Set<string>();

  const push = (tag: { displayLabel: string; normalizedKey: string; category: FlameCategory; source: string }) => {
    const blocked = detectBlockedContent(`${tag.displayLabel} ${tag.normalizedKey}`);
    if (blocked.blocked || seen.has(tag.normalizedKey)) return;
    seen.add(tag.normalizedKey);
    suggestions.push(tag);
  };

  for (const rule of RULE_SUGGESTIONS) {
    if (rule.pattern.test(text)) {
      for (const tag of rule.tags) push(tag);
    }
  }

  for (const topic of hotTopics) {
    if (topic.status === 'blocked' || topic.status === 'hidden') continue;
    const normalized = String(topic.normalized_key ?? '').slice(0, 20);
    if (!normalized) continue;
    push({
      displayLabel: String(topic.display_label ?? `#${normalized}`).slice(0, 20),
      normalizedKey: normalized,
      category: (topic.category as FlameCategory) ?? 'other',
      source: String(topic.scope ?? 'hot'),
    });
  }

  for (const fallback of [
    { displayLabel: '#카페대화', normalizedKey: '카페대화', category: 'daily' as const, source: 'default' },
    { displayLabel: '#지역교통', normalizedKey: '지역교통', category: 'local' as const, source: 'default' },
    { displayLabel: '#안전', normalizedKey: '안전', category: 'safety' as const, source: 'default' },
  ]) {
    push(fallback);
  }

  return suggestions.slice(0, 10);
}

export function validateDeviceHash(deviceHash: unknown): string {
  const value = String(deviceHash ?? '');
  if (!/^[a-f0-9]{32,128}$/i.test(value)) throw new Error('INVALID_DEVICE_HASH');
  return value;
}

export function validateMood(mood: unknown): FlameMood {
  if (mood === 'quiet' || mood === 'curious' || mood === 'serious' || mood === 'want_talk') return mood;
  throw new Error('INVALID_MOOD');
}

export function validateStrength(value: unknown): 1 | 2 | 3 {
  if (value === 1 || value === 2 || value === 3) return value;
  throw new Error('INVALID_STRENGTH');
}

export function validateCategory(value: unknown, text: string, tag: string): FlameCategory {
  if (value === 'politics' || value === 'local' || value === 'society' || value === 'safety' || value === 'daily' || value === 'other') {
    return value;
  }
  return deriveCategory(text, tag);
}

export function validateReactionType(value: unknown): ReactionType {
  if (value === 'similar' || value === 'curious' || value === 'need_source' || value === 'watching') return value;
  throw new Error('INVALID_REACTION_TYPE');
}

export function validateReportReason(value: unknown): ReportReason {
  if (
    value === 'misinformation' ||
    value === 'doxxing' ||
    value === 'violence' ||
    value === 'illegal' ||
    value === 'hate' ||
    value === 'spam' ||
    value === 'privacy' ||
    value === 'other'
  ) {
    return value;
  }
  throw new Error('INVALID_REPORT_REASON');
}
