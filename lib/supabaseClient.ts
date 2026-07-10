import type { CharacterKey, DisplayScope, Flame, FlameComment, HotTopic, ReactionAction, ReactionSummaryItem, ReactionType, ReportReason, TagSuggestion, ThoughtRangeValue } from './flame/types.ts';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function assertPublicEnv() {
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
}

async function invoke<T>(slug: string, body: Record<string, unknown>): Promise<T> {
  assertPublicEnv();
  const response = await fetch(`${url}/functions/v1/${slug}`, {
    method: 'POST',
    headers: {
      apikey: key!,
      authorization: `Bearer ${key}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.code ?? `${slug.toUpperCase()}_FAILED`);
  }
  return payload as T;
}

async function invokeAdmin<T>(slug: string, body: Record<string, unknown>, adminToken: string): Promise<T> {
  assertPublicEnv();
  const response = await fetch(`${url}/functions/v1/${slug}`, {
    method: 'POST',
    headers: {
      apikey: key!,
      authorization: `Bearer ${key}`,
      'content-type': 'application/json',
      'x-admin-token': adminToken,
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.code ?? `${slug.toUpperCase()}_FAILED`);
  }
  return payload as T;
}

export const publitApi = {
  getHotTopics: (body: { lat?: number; lng?: number; countryCode?: string; scope?: 'local' | 'global' | 'regional' | 'country'; locale?: 'ko' | 'en' }) =>
    invoke<HotTopic[]>('get-hot-topics', body),
  suggestTags: (body: { text: string; lat?: number; lng?: number; locale?: 'ko' | 'en' }) =>
    invoke<TagSuggestion[]>('suggest-tags', body),
  nearbyFlames: (body: { lat: number; lng: number; rangeValue?: ThoughtRangeValue; deviceHash?: string; locale?: 'ko' | 'en'; countryCode?: string }) =>
    invoke<Flame[]>('nearby-flames', body),
  myFlames: (body: { deviceHash: string }) =>
    invoke<{ used: number; limit: number; isFull: boolean; activeFlames: Array<{ id: string; tagLabel: string; status: string; createdAt: string }> }>('my-flames', body),
  createFlame: (body: {
    text: string;
    tagLabel: string;
    category: string;
    mood: string;
    selfStrength: number;
    characterKey?: CharacterKey;
    characterEmoji?: string;
    displayScope?: DisplayScope;
    regionCode?: string;
    locale?: 'ko' | 'en';
    countryCode?: string;
    lat: number;
    lng: number;
    deviceHash: string;
  }) => invoke<{ flame?: Flame; activeFlames?: Array<{ id: string; tagLabel: string; status: string; createdAt: string }>; error?: { code: string } }>('create-flame', body),
  reactFlame: (body: { flameId: string; reactionType: ReactionType; reactionLabel?: string; action?: ReactionAction; deviceHash: string }) =>
    invoke<{ heatLabel: string; duplicate?: boolean; removed?: boolean; reactions?: ReactionSummaryItem[] }>('react-flame', body),
  reportFlame: (body: { flameId: string; reason: ReportReason; detail?: string; deviceHash: string }) =>
    invoke<{ ok: boolean; status: string }>('report-flame', body),
  extinguishFlame: (body: { flameId: string; deviceHash: string }) =>
    invoke<{ ok: boolean }>('extinguish-flame', body),
  getComments: (body: { flameId: string }) =>
    invoke<FlameComment[]>('get-comments', body),
  createComment: (body: { flameId: string; body: string; deviceHash: string }) =>
    invoke<{ comment: FlameComment }>('create-comment', body),
  extendFlame: (body: { flameId: string; deviceHash: string }) =>
    invoke<{ flame: Flame }>('extend-flame', body),
  adminReports: (body: Record<string, unknown>, adminToken: string) =>
    invokeAdmin<Array<{
      id: string;
      flameId: string;
      reason: ReportReason;
      detail?: string | null;
      createdAt: string;
      thought: { id: string; text: string; tagLabel: string; tagNormalized: string; status: string; heatScore: number; createdAt: string };
    }>>('admin-reports', body, adminToken),
  adminResolveReport: (body: { reportId: string; action: 'keep' | 'hide' | 'delete'; adminNote?: string }, adminToken: string) =>
    invokeAdmin<{ ok: boolean; action: string }>('admin-resolve-report', body, adminToken),
};
